import { beforeEach, describe, expect, it, vi } from 'vitest'

const existsMock = vi.fn()
const readJSONMock = vi.fn()
const whichMock = vi.fn()

vi.mock('../src/utils/fs.js', () => ({
  exists: existsMock,
  readJSON: readJSONMock,
}))

vi.mock('../src/utils/exec.js', () => ({
  which: whichMock,
}))

describe('resolveIntegrationDispatchMode', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    existsMock.mockResolvedValue(false)
    readJSONMock.mockResolvedValue(null)
    whichMock.mockResolvedValue(false)
  })

  it('prefers the Cursor Codex extension when it is installed', async () => {
    existsMock.mockImplementation(async filePath => {
      return (
        filePath === '/Users/tester/.cursor/extensions' ||
        filePath === '/Users/tester/.cursor/extensions/.obsolete'
      )
    })
    readJSONMock.mockResolvedValue({})

    vi.doMock('node:fs/promises', () => ({
      readdir: vi.fn().mockResolvedValue(['openai.chatgpt-1.2.3']),
    }))

    const { resolveIntegrationDispatchMode } =
      await import('../src/commands/integration-dispatch-mode.js')

    await expect(
      resolveIntegrationDispatchMode({
        assistant: 'codex',
        hostIde: 'cursor',
        homeDir: '/Users/tester',
      }),
    ).resolves.toMatchObject({
      mode: 'extension',
      ready: true,
      reason: 'cursor_codex_extension',
    })
  })

  it('falls back to codex CLI when the Cursor extension is not installed but the CLI is available', async () => {
    whichMock.mockImplementation(async bin => bin === 'codex')

    const { resolveIntegrationDispatchMode } =
      await import('../src/commands/integration-dispatch-mode.js')

    await expect(
      resolveIntegrationDispatchMode({
        assistant: 'codex',
        hostIde: 'cursor',
        homeDir: '/Users/tester',
      }),
    ).resolves.toMatchObject({
      mode: 'cli',
      ready: true,
      reason: 'codex_cli',
    })
  })

  it('returns guidance when neither the Cursor Codex extension nor the codex CLI is available', async () => {
    const { resolveIntegrationDispatchMode } =
      await import('../src/commands/integration-dispatch-mode.js')

    await expect(
      resolveIntegrationDispatchMode({
        assistant: 'codex',
        hostIde: 'cursor',
        homeDir: '/Users/tester',
      }),
    ).resolves.toMatchObject({
      mode: null,
      ready: false,
      reason: 'missing_codex_runtime',
    })
  })

  it('prefers the Claude Code extension in Cursor when available', async () => {
    existsMock.mockImplementation(async filePath => {
      return (
        filePath === '/Users/tester/.cursor/extensions' ||
        filePath === '/Users/tester/.cursor/extensions/.obsolete'
      )
    })
    readJSONMock.mockResolvedValue({})

    vi.doMock('node:fs/promises', () => ({
      readdir: vi.fn().mockResolvedValue(['anthropic.claude-code-0.9.0']),
    }))

    const { resolveIntegrationDispatchMode } =
      await import('../src/commands/integration-dispatch-mode.js')

    await expect(
      resolveIntegrationDispatchMode({
        assistant: 'claude-code',
        hostIde: 'cursor',
        homeDir: '/Users/tester',
      }),
    ).resolves.toMatchObject({
      mode: 'extension',
      ready: true,
      reason: 'cursor_claude-code_extension',
    })
  })

  it('falls back to claude CLI in Cursor when the extension is unavailable', async () => {
    whichMock.mockImplementation(async bin => bin === 'claude')

    const { resolveIntegrationDispatchMode } =
      await import('../src/commands/integration-dispatch-mode.js')

    await expect(
      resolveIntegrationDispatchMode({
        assistant: 'claude-code',
        hostIde: 'cursor',
        homeDir: '/Users/tester',
      }),
    ).resolves.toMatchObject({
      mode: 'cli',
      ready: true,
      reason: 'claude-code_cli',
    })
  })

  it('prefers the Gemini extension in VS Code when available', async () => {
    existsMock.mockImplementation(async filePath => {
      return (
        filePath === '/Users/tester/.vscode/extensions' ||
        filePath === '/Users/tester/.vscode/extensions/.obsolete'
      )
    })
    readJSONMock.mockResolvedValue({})

    vi.doMock('node:fs/promises', () => ({
      readdir: vi.fn().mockResolvedValue(['google.geminicodeassist-2.1.0']),
    }))

    const { resolveIntegrationDispatchMode } =
      await import('../src/commands/integration-dispatch-mode.js')

    await expect(
      resolveIntegrationDispatchMode({
        assistant: 'gemini',
        hostIde: 'vscode',
        homeDir: '/Users/tester',
      }),
    ).resolves.toMatchObject({
      mode: 'extension',
      ready: true,
      reason: 'vscode_gemini_extension',
    })
  })

  it('falls back to gemini CLI when the VS Code extension is unavailable', async () => {
    whichMock.mockImplementation(async bin => bin === 'gemini')

    const { resolveIntegrationDispatchMode } =
      await import('../src/commands/integration-dispatch-mode.js')

    await expect(
      resolveIntegrationDispatchMode({
        assistant: 'gemini',
        hostIde: 'vscode',
        homeDir: '/Users/tester',
      }),
    ).resolves.toMatchObject({
      mode: 'cli',
      ready: true,
      reason: 'gemini_cli',
    })
  })

  it('falls back to gemini CLI in Trae CN when the Gemini extension is unavailable', async () => {
    whichMock.mockImplementation(async bin => bin === 'gemini')

    const { resolveIntegrationDispatchMode } =
      await import('../src/commands/integration-dispatch-mode.js')

    await expect(
      resolveIntegrationDispatchMode({
        assistant: 'gemini',
        hostIde: 'trae-cn',
        homeDir: '/Users/tester',
      }),
    ).resolves.toMatchObject({
      mode: 'cli',
      ready: true,
      reason: 'gemini_cli',
    })
  })
})
