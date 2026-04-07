import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fsUtils from '../src/utils/fs.js'

vi.mock('../src/utils/fs.js', () => ({
  exists: vi.fn(),
  readJSON: vi.fn(),
}))

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

  it('uses .inspecto settings ide when present', async () => {
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

  it('uses trae-cn from .inspecto settings when present', async () => {
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
})
