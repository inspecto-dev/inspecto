import { beforeEach, describe, expect, it, vi } from 'vitest'

const installExtensionMock = vi.fn()
const openIdeWorkspaceMock = vi.fn()
const openUriMock = vi.fn()
const resolveHostIdeBinaryMock = vi.fn()
const resolveHostIdeMock = vi.fn()
const setTimeoutMock = vi.fn<(callback: () => void, delay: number) => number>()
const resolveDispatchModeMock = vi.fn()
const existsMock = vi.fn()
const logMock = {
  header: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  hint: vi.fn(),
  ready: vi.fn(),
  error: vi.fn(),
  blank: vi.fn(),
}

vi.mock('../src/inject/extension.js', () => ({
  installExtension: installExtensionMock,
  openIdeWorkspace: openIdeWorkspaceMock,
  openUri: openUriMock,
  resolveHostIdeBinary: resolveHostIdeBinaryMock,
}))

vi.mock('../src/commands/integration-host-ide.js', () => ({
  resolveIntegrationHostIde: resolveHostIdeMock,
}))

vi.mock('../src/commands/integration-dispatch-mode.js', () => ({
  resolveIntegrationDispatchMode: resolveDispatchModeMock,
}))

vi.mock('../src/utils/logger.js', () => ({
  log: logMock,
}))

vi.mock('../src/utils/fs.js', () => ({
  exists: existsMock,
}))

describe('runIntegrationAutomation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    installExtensionMock.mockResolvedValue(null)
    openIdeWorkspaceMock.mockResolvedValue(true)
    openUriMock.mockResolvedValue(true)
    resolveHostIdeBinaryMock.mockResolvedValue('cursor')
    existsMock.mockResolvedValue(true)
    resolveDispatchModeMock.mockResolvedValue({
      mode: 'extension',
      ready: true,
      reason: 'default',
    })
    setTimeoutMock.mockImplementation((callback, _delay) => {
      callback()
      return 0
    })
    vi.stubGlobal('setTimeout', setTimeoutMock as typeof setTimeout)
  })

  it('installs the resolved IDE extension and launches onboarding when confidence is high', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: 'cursor',
      confidence: 'high',
      source: 'explicit',
      candidates: ['cursor'],
    })
    installExtensionMock.mockResolvedValue({
      type: 'extension_installed',
      id: 'inspecto.inspecto',
      description: 'installed_via_cli',
    })

    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await runIntegrationAutomation('codex', { ide: 'cursor' }, '/repo')

    expect(resolveHostIdeMock).toHaveBeenCalledWith({
      explicitIde: 'cursor',
      cwd: '/repo',
    })
    expect(installExtensionMock).toHaveBeenCalledWith(false, 'cursor', true, undefined)
    expect(openIdeWorkspaceMock).toHaveBeenCalledWith('cursor', '/repo')
    expect(logMock.success).toHaveBeenCalledWith('Step 2/6: Resolved host IDE')
    expect(logMock.success).toHaveBeenCalledWith(
      'Step 3/6: Installed the Inspecto extension in Cursor',
    )
    expect(logMock.success).toHaveBeenCalledWith('Step 4/6: Resolved Codex runtime')
    expect(logMock.success).toHaveBeenCalledWith('Step 5/6: Opened workspace in Cursor')
    expect(logMock.success).toHaveBeenCalledWith('Step 6/6: Launched onboarding in Cursor')
    expect(openUriMock).toHaveBeenCalledWith(
      'cursor://inspecto.inspecto/send?target=codex&prompt=Set+up+Inspecto+in+this+project&autoSend=true&workspace=%2Frepo&overrides=%7B%22type%22%3A%22extension%22%7D',
    )
  })

  it('passes a local Inspecto VSIX path through to extension installation when provided', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: 'trae-cn',
      confidence: 'high',
      source: 'explicit',
      candidates: ['trae-cn'],
    })

    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await runIntegrationAutomation(
      'gemini',
      { ide: 'trae-cn', inspectoVsix: '/tmp/inspecto.vsix' },
      '/repo',
    )

    expect(installExtensionMock).toHaveBeenCalledWith(false, 'trae-cn', true, '/tmp/inspecto.vsix')
  })

  it('waits briefly after a fresh extension install before launching the onboarding URI', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: 'cursor',
      confidence: 'high',
      source: 'explicit',
      candidates: ['cursor'],
    })
    installExtensionMock.mockResolvedValue({
      type: 'extension_installed',
      id: 'inspecto.inspecto',
      description: 'installed_via_cli',
    })

    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await runIntegrationAutomation('codex', { ide: 'cursor' }, '/repo')

    expect(setTimeoutMock).toHaveBeenCalledWith(expect.any(Function), 1500)
    expect(setTimeoutMock).toHaveBeenCalledWith(expect.any(Function), 1000)
    expect(logMock.hint).toHaveBeenCalledWith(
      'Waiting briefly for the IDE extension to finish activating...',
    )
    expect(openUriMock).toHaveBeenCalledTimes(1)
  })

  it('launches Copilot onboarding via the Inspecto URI in VS Code', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: 'vscode',
      confidence: 'high',
      source: 'explicit',
      candidates: ['vscode'],
    })

    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await runIntegrationAutomation('copilot', { ide: 'vscode' }, '/repo')

    expect(openUriMock).toHaveBeenCalledWith(
      'vscode://inspecto.inspecto/send?target=copilot&prompt=Set+up+Inspecto+in+this+project&autoSend=true&workspace=%2Frepo&overrides=%7B%22type%22%3A%22extension%22%7D',
    )
    expect(logMock.success).toHaveBeenCalledWith('Step 6/6: Launched onboarding in VS Code')
    expect(logMock.hint).toHaveBeenCalledWith('copilot via extension mode')
  })

  it('does not open a generic VS Code chat session before launching Codex onboarding', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: 'vscode',
      confidence: 'high',
      source: 'explicit',
      candidates: ['vscode'],
    })
    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await runIntegrationAutomation('codex', { ide: 'vscode' }, '/repo')

    expect(openUriMock).toHaveBeenCalledWith(
      'vscode://inspecto.inspecto/send?target=codex&prompt=Set+up+Inspecto+in+this+project&autoSend=true&workspace=%2Frepo&overrides=%7B%22type%22%3A%22extension%22%7D',
    )
  })

  it('does not open a generic VS Code chat session before launching Claude Code onboarding', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: 'vscode',
      confidence: 'high',
      source: 'explicit',
      candidates: ['vscode'],
    })
    resolveDispatchModeMock.mockResolvedValue({
      mode: 'extension',
      ready: true,
      reason: 'vscode_claude-code_extension',
    })
    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await runIntegrationAutomation('claude-code', { ide: 'vscode' }, '/repo')

    expect(openUriMock).toHaveBeenCalledWith(
      'vscode://inspecto.inspecto/send?target=claude-code&prompt=Set+up+Inspecto+in+this+project&autoSend=false&workspace=%2Frepo&overrides=%7B%22type%22%3A%22extension%22%7D',
    )
  })

  it('uses codex CLI mode in Cursor when the Codex extension is unavailable but the CLI exists', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: 'cursor',
      confidence: 'high',
      source: 'explicit',
      candidates: ['cursor'],
    })
    resolveDispatchModeMock.mockResolvedValue({
      mode: 'cli',
      ready: true,
      reason: 'codex_cli',
    })

    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await runIntegrationAutomation('codex', { ide: 'cursor' }, '/repo')

    expect(openUriMock).toHaveBeenCalledWith(
      'cursor://inspecto.inspecto/send?target=codex&prompt=Set+up+Inspecto+in+this+project&autoSend=true&workspace=%2Frepo&overrides=%7B%22type%22%3A%22cli%22%7D',
    )
  })

  it('stops and explains what to install when codex cannot run in Cursor', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: 'cursor',
      confidence: 'high',
      source: 'explicit',
      candidates: ['cursor'],
    })
    resolveDispatchModeMock.mockResolvedValue({
      mode: null,
      ready: false,
      reason: 'missing_codex_runtime',
    })

    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await runIntegrationAutomation('codex', { ide: 'cursor' }, '/repo')

    expect(openUriMock).not.toHaveBeenCalled()
    expect(logMock.warn).toHaveBeenCalledWith(
      'Step 4/6: Could not resolve a runnable Codex runtime',
    )
    expect(logMock.hint).toHaveBeenCalledWith(
      'Install the Codex plugin in Cursor or install the `codex` CLI, then rerun the command.',
    )
  })

  it('uses Claude CLI mode in Cursor when the Claude extension is unavailable but the CLI exists', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: 'cursor',
      confidence: 'high',
      source: 'explicit',
      candidates: ['cursor'],
    })
    resolveDispatchModeMock.mockResolvedValue({
      mode: 'cli',
      ready: true,
      reason: 'claude-code_cli',
    })

    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await runIntegrationAutomation('claude-code', { ide: 'cursor' }, '/repo')

    expect(openUriMock).toHaveBeenCalledWith(
      'cursor://inspecto.inspecto/send?target=claude-code&prompt=Set+up+Inspecto+in+this+project&autoSend=false&workspace=%2Frepo&overrides=%7B%22type%22%3A%22cli%22%7D',
    )
  })

  it('stops and explains what to install when gemini cannot run in VS Code', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: 'vscode',
      confidence: 'high',
      source: 'explicit',
      candidates: ['vscode'],
    })
    resolveDispatchModeMock.mockResolvedValue({
      mode: null,
      ready: false,
      reason: 'missing_gemini_runtime',
    })

    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await runIntegrationAutomation('gemini', { ide: 'vscode' }, '/repo')

    expect(openUriMock).not.toHaveBeenCalled()
    expect(logMock.warn).toHaveBeenCalledWith(
      'Step 4/6: Could not resolve a runnable Gemini runtime',
    )
    expect(logMock.hint).toHaveBeenCalledWith(
      'Install the Gemini plugin in VS Code or install the `gemini` CLI, then rerun the command.',
    )
  })

  it('uses Gemini CLI mode in Trae CN when the Gemini extension is unavailable but the CLI exists', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: 'trae-cn',
      confidence: 'high',
      source: 'explicit',
      candidates: ['trae-cn'],
    })
    resolveDispatchModeMock.mockResolvedValue({
      mode: 'cli',
      ready: true,
      reason: 'gemini_cli',
    })

    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await runIntegrationAutomation('gemini', { ide: 'trae-cn' }, '/repo')

    expect(openIdeWorkspaceMock).toHaveBeenCalledWith('trae-cn', '/repo')
    expect(logMock.success).toHaveBeenCalledWith('Step 5/6: Opened workspace in Trae CN')
    expect(openUriMock).toHaveBeenCalledWith(
      'trae-cn://inspecto.inspecto/send?target=gemini&prompt=Set+up+Inspecto+in+this+project&autoSend=false&workspace=%2Frepo&overrides=%7B%22type%22%3A%22cli%22%7D',
    )
  })

  it('skips extension install and URI launch when host ide confidence is low', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: null,
      confidence: 'low',
      source: 'ambiguous',
      candidates: ['cursor', 'vscode'],
    })

    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await runIntegrationAutomation('codex', {}, '/repo')

    expect(installExtensionMock).not.toHaveBeenCalled()
    expect(openUriMock).not.toHaveBeenCalled()
    expect(logMock.warn).toHaveBeenCalledWith(
      'Step 2/6: Could not confidently resolve the host IDE',
    )
    expect(logMock.hint).toHaveBeenCalledWith(
      'Re-run with --host-ide <vscode|cursor|trae|trae-cn> or run the command from the target IDE terminal to continue automatic setup.',
    )
  })

  it('prints a dry preview without installing extensions or opening the IDE when preview mode is enabled', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: 'cursor',
      confidence: 'high',
      source: 'explicit',
      candidates: ['cursor'],
    })
    resolveDispatchModeMock.mockResolvedValue({
      mode: 'cli',
      ready: true,
      reason: 'codex_cli',
    })

    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await expect(
      runIntegrationAutomation('codex', { ide: 'cursor', preview: true }, '/repo'),
    ).resolves.toMatchObject({
      status: 'preview',
      message:
        'Preview complete. Inspecto did not write files or open IDE windows. Review the resolved setup below, then rerun without --preview to apply it.',
    })

    expect(installExtensionMock).not.toHaveBeenCalled()
    expect(openIdeWorkspaceMock).not.toHaveBeenCalled()
    expect(openUriMock).not.toHaveBeenCalled()
    expect(logMock.info).toHaveBeenCalledWith('Step 2/6: Previewed host IDE resolution')
    expect(logMock.info).toHaveBeenCalledWith('Step 3/6: Previewed Inspecto extension installation')
    expect(logMock.info).toHaveBeenCalledWith('Step 4/6: Previewed Codex runtime')
    expect(logMock.info).toHaveBeenCalledWith('Step 5/6: Previewed workspace routing in Cursor')
    expect(logMock.info).toHaveBeenCalledWith('Step 6/6: Previewed onboarding launch')
    expect(logMock.hint).toHaveBeenCalledWith(
      'cursor://inspecto.inspecto/send?target=codex&prompt=Set+up+Inspecto+in+this+project&autoSend=true&workspace=%2Frepo&overrides=%7B%22type%22%3A%22cli%22%7D',
    )
  })

  it('reports a blocked preflight when the host IDE binary is unavailable in preview mode', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: 'trae-cn',
      confidence: 'high',
      source: 'explicit',
      candidates: ['trae-cn'],
    })
    resolveDispatchModeMock.mockResolvedValue({
      mode: 'cli',
      ready: true,
      reason: 'gemini_cli',
    })
    resolveHostIdeBinaryMock.mockResolvedValue(null)

    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await expect(
      runIntegrationAutomation('gemini', { ide: 'trae-cn', preview: true }, '/repo'),
    ).resolves.toMatchObject({
      status: 'preview_blocked',
      message:
        'Preview blocked. Inspecto did not write files or open IDE windows because setup cannot continue until the blocking issue below is resolved.',
    })

    expect(logMock.warn).toHaveBeenCalledWith(
      'Step 3/6: Could not verify Inspecto extension installation in Trae CN',
    )
    expect(logMock.hint).toHaveBeenCalledWith(
      'No Trae CN CLI binary was found. Automatic extension install and workspace opening may not work.',
    )
    expect(openUriMock).not.toHaveBeenCalled()
  })

  it('suppresses step logs and returns structured details in silent preview mode', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: 'cursor',
      confidence: 'high',
      source: 'explicit',
      candidates: ['cursor'],
    })
    resolveDispatchModeMock.mockResolvedValue({
      mode: 'cli',
      ready: true,
      reason: 'codex_cli',
    })

    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await expect(
      runIntegrationAutomation('codex', { ide: 'cursor', preview: true, silent: true }, '/repo'),
    ).resolves.toMatchObject({
      status: 'preview',
      details: {
        hostIde: {
          id: 'cursor',
          label: 'Cursor',
          source: 'from --host-ide',
          confidence: 'high',
          candidates: ['cursor'],
        },
        inspectoExtension: {
          source: 'marketplace',
          reference: 'inspecto.inspecto',
          binaryAvailable: true,
          status: 'preview_ready',
        },
        runtime: {
          assistant: 'Codex',
          ready: true,
          mode: 'cli',
        },
        workspace: {
          path: '/repo',
          attempted: true,
        },
        onboarding: {
          uri: 'cursor://inspecto.inspecto/send?target=codex&prompt=Set+up+Inspecto+in+this+project&autoSend=true&workspace=%2Frepo&overrides=%7B%22type%22%3A%22cli%22%7D',
          autoSend: true,
        },
      },
    })

    expect(logMock.info).not.toHaveBeenCalled()
    expect(logMock.warn).not.toHaveBeenCalled()
    expect(logMock.hint).not.toHaveBeenCalled()
  })

  it('returns a workspace-specific message when onboarding opens but the target workspace could not be opened first', async () => {
    resolveHostIdeMock.mockResolvedValue({
      ide: 'cursor',
      confidence: 'high',
      source: 'explicit',
      candidates: ['cursor'],
    })
    installExtensionMock.mockResolvedValue({
      type: 'extension_installed',
      id: 'inspecto.inspecto',
      description: 'installed_via_cli',
    })
    openIdeWorkspaceMock.mockResolvedValue(false)

    const { runIntegrationAutomation } = await import('../src/commands/integration-automation.js')

    await expect(
      runIntegrationAutomation('codex', { ide: 'cursor' }, '/repo'),
    ).resolves.toMatchObject({
      status: 'partial',
      message:
        'Onboarding opened in Cursor for Codex, but Inspecto could not open the target workspace first.',
      nextStep:
        'If the wrong IDE window received onboarding, open /repo in Cursor and rerun the command from that project.',
    })
  })
})
