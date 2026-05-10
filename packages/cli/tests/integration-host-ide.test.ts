import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import * as childProcess from 'node:child_process'
import * as fsUtils from '../src/utils/fs.js'

vi.mock('../src/utils/fs.js', () => ({
  exists: vi.fn(),
  readJSON: vi.fn(),
}))

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process')
  return {
    ...actual,
    execSync: vi.fn(),
  }
})

describe('resolveIntegrationHostIde', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...originalEnv }
    delete process.env.TERM_PROGRAM
    delete process.env.CURSOR_TRACE_DIR
    delete process.env.CURSOR_CHANNEL
    delete process.env.TRAE_APP_DIR
    delete process.env.__CFBundleIdentifier
    delete process.env.COCO_IDE_PLUGIN_TYPE
    delete process.env.npm_config_user_agent
    vi.mocked(fsUtils.exists).mockResolvedValue(false)
    vi.mocked(fsUtils.readJSON).mockResolvedValue(null)
    vi.mocked(childProcess.execSync).mockImplementation(() => {
      throw new Error('not a git repo')
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('prefers an explicit ide argument', async () => {
    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        explicitIde: 'cursor',
        cwd: '/repo',
      }),
    ).resolves.toMatchObject({
      ide: 'cursor',
      confidence: 'high',
      source: 'explicit',
    })
  })

  it('accepts trae-cn as an explicit ide argument', async () => {
    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        explicitIde: 'trae-cn',
        cwd: '/repo',
      }),
    ).resolves.toMatchObject({
      ide: 'trae-cn',
      confidence: 'high',
      source: 'explicit',
    })
  })

  it('accepts codebuddy as an explicit ide argument', async () => {
    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        explicitIde: 'codebuddy',
        cwd: '/repo',
      }),
    ).resolves.toMatchObject({
      ide: 'codebuddy',
      confidence: 'high',
      source: 'explicit',
    })
  })

  it('uses .inspecto settings ide when present', async () => {
    vi.mocked(fsUtils.exists).mockImplementation(async filePath => filePath === '/repo/.inspecto')
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath === '/repo/.inspecto/settings.local.json') {
        return { ide: 'vscode' }
      }
      return null
    })

    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        cwd: '/repo',
      }),
    ).resolves.toMatchObject({
      ide: 'vscode',
      confidence: 'high',
      source: 'config',
    })
  })

  it('uses the nearest ancestor .inspecto settings when invoked from a subdirectory', async () => {
    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return filePath === '/repo/.inspecto'
    })
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath === '/repo/.inspecto/settings.json') {
        return { ide: 'cursor' }
      }
      return null
    })

    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        cwd: '/repo/packages/app/src',
      }),
    ).resolves.toMatchObject({
      ide: 'cursor',
      confidence: 'high',
      source: 'config',
    })
  })

  it('does not inherit parent .inspecto settings when a nearer .inspecto exists', async () => {
    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return filePath === '/repo/.inspecto' || filePath === '/repo/packages/app/.inspecto'
    })
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath === '/repo/.inspecto/settings.json') {
        return { ide: 'vscode' }
      }
      if (filePath === '/repo/packages/app/.inspecto/settings.json') {
        return { ide: 'trae' }
      }
      return null
    })

    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        cwd: '/repo/packages/app/src',
      }),
    ).resolves.toMatchObject({
      ide: 'trae',
      confidence: 'high',
      source: 'config',
    })
  })

  it('does not use .inspecto directories above the home directory as project settings', async () => {
    const home = os.homedir()
    const homeParent = path.dirname(home)
    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return filePath === path.join(homeParent, '.inspecto')
    })
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath === path.join(homeParent, '.inspecto', 'settings.json')) {
        return { ide: 'vscode' }
      }
      if (filePath === path.join(home, '.inspecto', 'settings.json')) {
        return { ide: 'cursor' }
      }
      return null
    })

    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        cwd: path.join(home, 'project', 'src'),
      }),
    ).resolves.toMatchObject({
      ide: 'cursor',
      confidence: 'high',
      source: 'config',
    })
  })

  it('does not use .inspecto directories outside the git root as project settings', async () => {
    vi.mocked(childProcess.execSync).mockReturnValue('/Users/me/projects/repo\n')
    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return filePath === '/Users/me/projects/.inspecto'
    })
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath === '/Users/me/projects/.inspecto/settings.json') {
        return { ide: 'vscode' }
      }
      if (filePath === path.join(os.homedir(), '.inspecto', 'settings.json')) {
        return { ide: 'cursor' }
      }
      return null
    })

    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        cwd: '/Users/me/projects/repo/apps/web',
      }),
    ).resolves.toMatchObject({
      ide: 'cursor',
      confidence: 'high',
      source: 'config',
    })
  })

  it('uses trae-cn from .inspecto settings when present', async () => {
    vi.mocked(fsUtils.exists).mockImplementation(async filePath => filePath === '/repo/.inspecto')
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath === '/repo/.inspecto/settings.local.json') {
        return { ide: 'trae-cn' }
      }
      return null
    })

    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        cwd: '/repo',
      }),
    ).resolves.toMatchObject({
      ide: 'trae-cn',
      confidence: 'high',
      source: 'config',
    })
  })

  it('uses codebuddy-cn from .inspecto settings when present', async () => {
    vi.mocked(fsUtils.exists).mockImplementation(async filePath => filePath === '/repo/.inspecto')
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath === '/repo/.inspecto/settings.local.json') {
        return { ide: 'codebuddy-cn' }
      }
      return null
    })

    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        cwd: '/repo',
      }),
    ).resolves.toMatchObject({
      ide: 'codebuddy-cn',
      confidence: 'high',
      source: 'config',
    })
  })

  it('treats a single env-detected ide as high confidence', async () => {
    process.env.CURSOR_CHANNEL = 'stable'

    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        cwd: '/repo',
      }),
    ).resolves.toMatchObject({
      ide: 'cursor',
      confidence: 'high',
      source: 'env',
    })
  })

  it('treats a single project artifact as medium confidence', async () => {
    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return filePath === '/repo/.cursor'
    })

    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        cwd: '/repo',
      }),
    ).resolves.toMatchObject({
      ide: 'cursor',
      confidence: 'medium',
      source: 'artifact',
    })
  })

  it('treats a .trae-cn project artifact as medium confidence', async () => {
    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return filePath === '/repo/.trae-cn'
    })

    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        cwd: '/repo',
      }),
    ).resolves.toMatchObject({
      ide: 'trae-cn',
      confidence: 'medium',
      source: 'artifact',
    })
  })

  it('treats a .codebuddy-cn project artifact as medium confidence', async () => {
    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return filePath === '/repo/.codebuddy-cn'
    })

    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        cwd: '/repo',
      }),
    ).resolves.toMatchObject({
      ide: 'codebuddy-cn',
      confidence: 'medium',
      source: 'artifact',
    })
  })

  it('refuses to resolve an ide when project artifacts are ambiguous', async () => {
    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return filePath === '/repo/.cursor' || filePath === '/repo/.vscode'
    })

    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        cwd: '/repo',
      }),
    ).resolves.toMatchObject({
      ide: null,
      confidence: 'low',
      source: 'ambiguous',
      candidates: ['cursor', 'vscode'],
    })
  })

  it('ignores project artifacts when requested by integration install flows', async () => {
    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return filePath === '/repo/.trae'
    })

    const { resolveIntegrationHostIde } = await import('../src/commands/integration-host-ide.js')

    await expect(
      resolveIntegrationHostIde({
        cwd: '/repo',
        ignoreProjectArtifacts: true,
      }),
    ).resolves.toMatchObject({
      ide: null,
      confidence: 'low',
      source: 'none',
      candidates: [],
    })
  })
})
