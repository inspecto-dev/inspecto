import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { detectIDE } from '../src/detect/ide.js'
import * as fsUtils from '../src/utils/fs.js'

vi.mock('../src/utils/fs.js', () => ({
  exists: vi.fn(),
}))

describe('detectIDE', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...originalEnv } // Make a copy
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('detects Trae from environment variables', async () => {
    process.env.TRAE_APP_DIR = '/Applications/Trae.app'
    vi.mocked(fsUtils.exists).mockResolvedValue(false)

    const result = await detectIDE('/mock/root')
    expect(result.detected).toEqual([{ ide: 'trae', supported: true }])
  })

  it('detects Cursor from environment variables', async () => {
    process.env.CURSOR_CHANNEL = 'stable'
    vi.mocked(fsUtils.exists).mockResolvedValue(false)

    const result = await detectIDE('/mock/root')
    expect(result.detected).toEqual([{ ide: 'cursor', supported: true }])
  })

  it('detects VS Code from environment variables without false positives', async () => {
    process.env.TERM_PROGRAM = 'vscode'
    // Ensure it's not Trae
    delete process.env.TRAE_APP_DIR
    delete process.env.CURSOR_CHANNEL
    delete process.env.__CFBundleIdentifier
    delete process.env.COCO_IDE_PLUGIN_TYPE
    process.env.npm_config_user_agent = 'npm'

    vi.mocked(fsUtils.exists).mockResolvedValue(false)

    const result = await detectIDE('/mock/root')
    expect(result.detected).toEqual([{ ide: 'vscode', supported: true }])
  })

  it('detects VS Code from directory when environment is clean', async () => {
    // Clear all related env vars
    delete process.env.TERM_PROGRAM
    delete process.env.TRAE_APP_DIR
    delete process.env.CURSOR_CHANNEL
    delete process.env.__CFBundleIdentifier
    delete process.env.COCO_IDE_PLUGIN_TYPE
    delete process.env.npm_config_user_agent

    vi.mocked(fsUtils.exists).mockImplementation(async path => {
      return path.endsWith('.vscode')
    })

    const result = await detectIDE('/mock/root')
    expect(result.detected).toEqual([{ ide: 'vscode', supported: true }])
  })

  it('detects JetBrains from directory', async () => {
    delete process.env.TERM_PROGRAM
    delete process.env.TRAE_APP_DIR
    delete process.env.CURSOR_CHANNEL
    delete process.env.__CFBundleIdentifier
    delete process.env.COCO_IDE_PLUGIN_TYPE

    vi.mocked(fsUtils.exists).mockImplementation(async path => {
      return path.endsWith('.idea')
    })

    const result = await detectIDE('/mock/root')
    expect(result.detected).toEqual([{ ide: 'JetBrains IDE', supported: false }])
  })

  it('favors Trae if both VS Code TERM_PROGRAM and Trae env are present', async () => {
    process.env.TERM_PROGRAM = 'vscode'
    process.env.TRAE_APP_DIR = '/Applications/Trae.app'

    vi.mocked(fsUtils.exists).mockResolvedValue(false)

    const result = await detectIDE('/mock/root')
    // VS Code shouldn't be added since it shares TERM_PROGRAM with Trae
    expect(result.detected).toEqual([{ ide: 'trae', supported: true }])
  })
})
