import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import path from 'node:path'
import {
  loadUserConfigSync,
  loadPromptsConfig,
  resolveTargetTool,
  resolveProviderMode,
  extractToolOverrides,
  resolveIntents,
} from '../src/config'

// Mock fs to simulate different filesystem structures
vi.mock('node:fs', async () => {
  const actualFs = await vi.importActual<typeof import('node:fs')>('node:fs')
  const existsSync = vi.fn()
  const readFileSync = vi.fn()
  const watch = vi.fn()
  return {
    ...actualFs,
    default: {
      ...actualFs,
      existsSync,
      readFileSync,
      watch,
    },
    existsSync,
    readFileSync,
    watch,
  }
})

let callCount = 0

describe('config resolution', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    callCount = 0
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  function freshLoad(cwd: string, gitRoot?: string) {
    callCount++
    return loadUserConfigSync(true, cwd, gitRoot)
  }

  function freshLoadPrompts(cwd: string, gitRoot?: string) {
    callCount++
    return loadPromptsConfig(true, cwd, gitRoot)
  }

  describe('monorepo config resolution', () => {
    it('uses only cwd when gitRoot is not provided', () => {
      const cwd = '/users/me/projects/monorepo/apps/web'

      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        return p.toString().includes(path.join(cwd, '.inspecto'))
      })
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ 'provider.default': 'claude-code.cli' }),
      )

      const config = freshLoad(cwd)

      // Should have checked cwd
      expect(fs.existsSync).toHaveBeenCalledWith(path.join(cwd, '.inspecto'))
      expect(config['provider.default']).toBe('claude-code.cli')
    })

    it('finds config at gitRoot when cwd has none', () => {
      const root = '/users/me/projects/monorepo'
      const cwd = `${root}/apps/web`

      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        return (
          p.toString().includes(path.join(root, '.inspecto')) && !p.toString().includes('apps/web')
        )
      })
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ 'provider.default': 'copilot.extension' }),
      )

      const config = freshLoad(cwd, root)

      expect(config['provider.default']).toBe('copilot.extension')
    })

    it('cwd config wins over gitRoot config', () => {
      const root = '/users/me/projects/monorepo'
      const cwd = `${root}/apps/web`

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (p.toString() === path.join(cwd, '.inspecto', 'settings.json')) {
          return JSON.stringify({ 'provider.claude-code.cli.bin': 'claude' })
        }
        if (p.toString() === path.join(root, '.inspecto', 'settings.json')) {
          return JSON.stringify({ 'provider.default': 'copilot.extension' })
        }
        return '{}'
      })

      const config = freshLoad(cwd, root)

      // Inherits gitRoot setting
      expect(config['provider.default']).toBe('copilot.extension')
      // Overrides/merges cwd setting
      expect(config['provider.claude-code.cli.bin']).toBe('claude')
    })

    it('intermediate directory config is picked up between cwd and gitRoot', () => {
      const root = '/users/me/projects/monorepo'
      const intermediate = `${root}/apps`
      const cwd = `${intermediate}/web`

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (p.toString() === path.join(intermediate, '.inspecto', 'settings.json')) {
          return JSON.stringify({ 'provider.default': 'claude-code.cli' })
        }
        return '{}'
      })

      const config = freshLoad(cwd, root)
      expect(config['provider.default']).toBe('claude-code.cli')
    })

    it('cwd .inspecto/settings.local.json wins over cwd settings.json', () => {
      const cwd = '/projects/app'
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (p.toString() === path.join(cwd, '.inspecto', 'settings.local.json')) {
          return JSON.stringify({ 'provider.default': 'claude-code.cli' })
        }
        if (p.toString() === path.join(cwd, '.inspecto', 'settings.json')) {
          return JSON.stringify({ 'provider.default': 'copilot.extension' })
        }
        return '{}'
      })

      const config = freshLoad(cwd, cwd)
      expect(config['provider.default']).toBe('claude-code.cli')
    })

    it('closer local.json beats farther settings.json', () => {
      const root = '/projects/monorepo'
      const cwd = `${root}/apps/web`

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (p.toString() === path.join(root, '.inspecto', 'settings.json')) {
          return JSON.stringify({ 'provider.default': 'copilot.extension' })
        }
        if (p.toString() === path.join(cwd, '.inspecto', 'settings.local.json')) {
          return JSON.stringify({ 'provider.default': 'claude-code.cli' })
        }
        return '{}'
      })

      const config = freshLoad(cwd, root)
      expect(config['provider.default']).toBe('claude-code.cli')
    })

    it('deep-merges providers across layers', () => {
      const root = '/projects/monorepo'
      const cwd = `${root}/apps/web`

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (p.toString() === path.join(root, '.inspecto', 'settings.json')) {
          return JSON.stringify({
            ide: 'vscode',
            autoSend: true,
          })
        }
        if (p.toString() === path.join(cwd, '.inspecto', 'settings.json')) {
          return JSON.stringify({
            ide: 'vscode',
            autoSend: false,
            'provider.claude-code.cli.bin': 'claude',
          })
        }
        return '{}'
      })

      const config = freshLoad(cwd, root)

      expect(config.ide).toBe('vscode') // Overridden by cwd
      expect(config.autoSend).toBe(false) // Overridden by cwd
      expect(config['provider.claude-code.cli.bin']).toBe('claude') // Added by cwd
    })

    it('cwd above gitRoot falls back to checking only cwd', () => {
      // Strange case where cwd is somehow above gitRoot (e.g. symlinks or weird setups)
      const cwd = '/projects/monorepo'
      const root = '/projects/monorepo/apps/web'

      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        return p.toString().includes(path.join(cwd, '.inspecto'))
      })
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ ide: 'vscode' }))

      const config = freshLoad(cwd, root)
      expect(config.ide).toBe('vscode')
    })

    it('returns default empty config when no .inspecto/ exists anywhere', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const config = freshLoad('/tmp/nowhere', '/tmp/nowhere')
      expect(config).toEqual({})
    })
  })

  describe('provider resolution logic', () => {
    it('resolveTargetTool parses provider.default correctly', () => {
      expect(resolveTargetTool({ 'provider.default': 'claude-code.cli' })).toBe('claude-code')
      expect(resolveTargetTool({ 'provider.default': 'copilot.extension' })).toBe('copilot')
      expect(resolveTargetTool({})).toBe('copilot') // Fallback
    })

    it('resolveProviderMode resolves mode from provider.default', () => {
      expect(
        resolveProviderMode('claude-code', 'vscode', { 'provider.default': 'claude-code.cli' }),
      ).toBe('cli')
      expect(
        resolveProviderMode('claude-code', 'vscode', {
          'provider.default': 'claude-code.extension',
        }),
      ).toBe('extension')
      expect(
        resolveProviderMode('copilot', 'vscode', { 'provider.default': 'copilot.extension' }),
      ).toBe('extension')
    })

    it('resolveProviderMode falls back to valid mode when config is omitted or mismatched', () => {
      // If we configured claude-code but ask for copilot, it should use the default for copilot
      expect(
        resolveProviderMode('copilot', 'vscode', { 'provider.default': 'claude-code.cli' }),
      ).toBe('extension')
      // Coco only supports cli
      expect(resolveProviderMode('coco', 'vscode', {})).toBe('cli')
    })

    it('extractToolOverrides extracts flat provider configs', () => {
      const config = {
        'provider.default': 'claude-code.cli',
        'provider.claude-code.cli.bin': '/usr/bin/claude',
        autoSend: true,
      } as any

      const overrides = extractToolOverrides('vscode', config)

      expect(overrides['claude-code']).toEqual({
        type: 'cli',
        binaryPath: '/usr/bin/claude',
      })
    })
  })

  describe('prompts config resolution', () => {
    it('returns the highest priority array when loading prompts', async () => {
      const root = '/projects/monorepo'
      const cwd = `${root}/apps/web`

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (p.toString() === path.join(root, '.inspecto', 'prompts.json')) {
          return JSON.stringify(['root-prompt', { id: 'root-custom', prompt: 'Root' }])
        }
        if (p.toString() === path.join(cwd, '.inspecto', 'prompts.json')) {
          return JSON.stringify(['cwd-prompt'])
        }
        return '[]'
      })

      const prompts = await freshLoadPrompts(cwd, root)

      // The cwd array should entirely replace the root array
      expect(prompts).toEqual(['cwd-prompt'])
    })

    it('returns default empty array when no .inspecto/ exists anywhere', async () => {
      const root = '/projects/monorepo'
      const cwd = `${root}/apps/web`

      vi.mocked(fs.existsSync).mockReturnValue(false)

      const prompts = await freshLoadPrompts(cwd, root)
      expect(prompts).toEqual([])
    })
  })

  describe('intent resolution', () => {
    it('keeps built-in AI intents when no prompt overrides are provided', () => {
      const intents = resolveIntents()

      expect(intents.map(intent => intent.id)).toEqual(['explain', 'fix-bug', 'fix-ui', 'improve'])
      expect(intents.every(intent => intent.aiIntent)).toBe(true)
    })

    it('requires aiIntent for custom prompt objects', () => {
      const intents = resolveIntents([
        {
          id: 'custom-review',
          label: 'Custom Review',
          prompt: 'Review this component',
        } as any,
      ])

      expect(intents.some(intent => intent.id === 'custom-review')).toBe(false)
    })

    it('merges custom AI prompt overrides by id', () => {
      const intents = resolveIntents([
        {
          id: 'explain',
          label: 'Explain in Chinese',
          aiIntent: 'ask',
          prependPrompt: 'Reply in Chinese.',
        },
      ])

      expect(intents.find(intent => intent.id === 'explain')).toMatchObject({
        id: 'explain',
        aiIntent: 'ask',
        label: 'Explain in Chinese',
        prependPrompt: 'Reply in Chinese.',
      })
    })
  })
})
