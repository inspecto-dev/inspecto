import { beforeEach, describe, expect, it, vi } from 'vitest'

const writeFileMock = vi.fn()
const existsMock = vi.fn()
const chmodMock = vi.fn()
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
const runIntegrationAutomationMock = vi.fn()

vi.mock('../src/utils/fs.js', () => ({
  writeFile: writeFileMock,
  exists: existsMock,
}))

vi.mock('node:fs/promises', () => ({
  default: {
    chmod: chmodMock,
  },
}))

vi.mock('node:os', () => ({
  homedir: () => '/Users/tester',
}))

vi.mock('../src/utils/logger.js', () => ({
  log: logMock,
}))

vi.mock('../src/commands/integration-automation.js', () => ({
  runIntegrationAutomation: runIntegrationAutomationMock,
}))

describe('integration install', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    existsMock.mockResolvedValue(false)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '# mock asset',
        status: 200,
        statusText: 'OK',
      }),
    )
    runIntegrationAutomationMock.mockResolvedValue({
      status: 'launched',
      message: 'Onboarding launched in Cursor for Codex.',
    })
  })

  it('installs the Claude Code skill into the user skill directory', async () => {
    const { installIntegration } = await import('../src/commands/integration-install.js')

    await installIntegration('claude-code', { scope: 'user' })

    expect(writeFileMock).toHaveBeenCalledWith(
      '/Users/tester/.claude/skills/inspecto-onboarding-claude-code/SKILL.md',
      '# mock asset',
    )
    expect(writeFileMock).toHaveBeenCalledWith(
      '/Users/tester/.claude/skills/inspecto-onboarding-claude-code/agents/openai.yaml',
      '# mock asset',
    )
    expect(writeFileMock).toHaveBeenCalledWith(
      '/Users/tester/.claude/skills/inspecto-onboarding-claude-code/scripts/run-inspecto.sh',
      '# mock asset',
    )
    expect(chmodMock).toHaveBeenCalledWith(
      '/Users/tester/.claude/skills/inspecto-onboarding-claude-code/scripts/run-inspecto.sh',
      0o755,
    )
    expect(runIntegrationAutomationMock).not.toHaveBeenCalled()
  })

  it('installs the Codex skill into the user skill directory when scoped to user', async () => {
    const { installIntegration } = await import('../src/commands/integration-install.js')

    await installIntegration('codex', { scope: 'user' })

    expect(writeFileMock).toHaveBeenCalledWith(
      '/Users/tester/.agents/skills/inspecto-onboarding-codex/SKILL.md',
      '# mock asset',
    )
    expect(writeFileMock).toHaveBeenCalledWith(
      '/Users/tester/.agents/skills/inspecto-onboarding-codex/agents/openai.yaml',
      '# mock asset',
    )
    expect(writeFileMock).toHaveBeenCalledWith(
      '/Users/tester/.agents/skills/inspecto-onboarding-codex/scripts/run-inspecto.sh',
      '# mock asset',
    )
    expect(chmodMock).toHaveBeenCalledWith(
      '/Users/tester/.agents/skills/inspecto-onboarding-codex/scripts/run-inspecto.sh',
      0o755,
    )
    expect(logMock.success).toHaveBeenCalledWith('Step 1/6: Installed Codex integration assets')
    expect(logMock.hint).toHaveBeenCalledWith(
      '/Users/tester/.agents/skills/inspecto-onboarding-codex/SKILL.md',
    )
    expect(runIntegrationAutomationMock).not.toHaveBeenCalled()
    expect(logMock.ready).toHaveBeenCalledWith(
      'Installed Codex integration assets. User-level installs only write integration assets and do not launch onboarding automatically.',
    )
    expect(logMock.hint).toHaveBeenCalledWith(
      'Run the install command again from your target project root with --host-ide <vscode|cursor|trae|trae-cn> when you want to launch onboarding automatically.',
    )
  })

  it('clarifies that --host-ide does not launch onboarding for user-level installs', async () => {
    const { installIntegration } = await import('../src/commands/integration-install.js')

    await installIntegration('codex', { scope: 'user', ide: 'cursor' })

    expect(runIntegrationAutomationMock).not.toHaveBeenCalled()
    expect(logMock.ready).toHaveBeenCalledWith(
      'Installed Codex integration assets. User-level installs only write integration assets and do not launch onboarding automatically.',
    )
    expect(logMock.hint).toHaveBeenCalledWith(
      'The provided --host-ide value is saved only as a rerun hint for later; this command does not open Cursor for user-level installs.',
    )
    expect(logMock.hint).toHaveBeenCalledWith(
      'Run the install command again from your target project root with --host-ide cursor when you want to launch onboarding automatically.',
    )
  })

  it('installs the Cursor agents fallback gracefully acting as skills mode', async () => {
    const { installIntegration } = await import('../src/commands/integration-install.js')

    await installIntegration('cursor', { mode: 'agents' })

    expect(writeFileMock).toHaveBeenCalledTimes(1)
    expect(writeFileMock).toHaveBeenCalledWith(
      '.cursor/skills/inspecto-onboarding/SKILL.md',
      '# mock asset',
    )
  })

  it('surfaces a blocked automation outcome as a warning with next-step guidance', async () => {
    runIntegrationAutomationMock.mockResolvedValue({
      status: 'blocked',
      message:
        'Automatic setup stopped: Inspecto could not find a runnable Gemini target in Trae CN.',
      nextStep:
        'Install the Gemini plugin in Trae CN or install the `gemini` CLI, then rerun the command.',
    })

    const { installIntegration } = await import('../src/commands/integration-install.js')

    await installIntegration('gemini', { ide: 'trae-cn' })

    expect(logMock.warn).toHaveBeenCalledWith(
      'Automatic setup stopped: Inspecto could not find a runnable Gemini target in Trae CN.',
    )
    expect(logMock.hint).toHaveBeenCalledWith(
      'Install the Gemini plugin in Trae CN or install the `gemini` CLI, then rerun the command.',
    )
  })

  it('surfaces a partial automation outcome as a warning with follow-up guidance', async () => {
    runIntegrationAutomationMock.mockResolvedValue({
      status: 'partial',
      message:
        'Onboarding opened in Trae CN for Gemini, but the Inspecto extension may still need manual setup.',
      nextStep: 'Install the Inspecto extension in Trae CN if IDE-side features are missing.',
    })

    const { installIntegration } = await import('../src/commands/integration-install.js')

    await installIntegration('gemini', { ide: 'trae-cn' })

    expect(logMock.warn).toHaveBeenCalledWith(
      'Onboarding opened in Trae CN for Gemini, but the Inspecto extension may still need manual setup.',
    )
    expect(logMock.hint).toHaveBeenCalledWith(
      'Install the Inspecto extension in Trae CN if IDE-side features are missing.',
    )
  })

  it('does not write files in preview mode and surfaces the preview summary', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '# mock asset',
      status: 200,
      statusText: 'OK',
    })
    vi.stubGlobal('fetch', fetchMock)
    runIntegrationAutomationMock.mockResolvedValue({
      status: 'preview',
      message:
        'Preview complete. Inspecto did not write files or open IDE windows. Review the resolved setup below, then rerun without --preview to apply it.',
      nextStep:
        'Run the same command again without --preview to apply the integration and launch onboarding.',
    })

    const { installIntegration } = await import('../src/commands/integration-install.js')

    await installIntegration('codex', { preview: true, ide: 'cursor' })

    expect(writeFileMock).not.toHaveBeenCalled()
    expect(chmodMock).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(logMock.info).toHaveBeenCalledWith('Step 1/6: Previewing Codex integration assets')
    expect(logMock.ready).toHaveBeenCalledWith(
      'Preview complete. Inspecto did not write files or open IDE windows. Review the resolved setup below, then rerun without --preview to apply it.',
    )
    expect(logMock.hint).toHaveBeenCalledWith(
      'Run the same command again without --preview to apply the integration and launch onboarding.',
    )
  })

  it('prints structured JSON output for preview mode when requested', async () => {
    const fetchMock = vi.fn()
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubGlobal('fetch', fetchMock)
    runIntegrationAutomationMock.mockResolvedValue({
      status: 'preview',
      message:
        'Preview complete. Inspecto did not write files or open IDE windows. Review the resolved setup below, then rerun without --preview to apply it.',
      nextStep:
        'Run the same command again without --preview to apply the integration and launch onboarding.',
      details: {
        hostIde: {
          id: 'cursor',
          label: 'Cursor',
          source: 'explicit --host-ide',
          confidence: 'high',
          candidates: ['cursor'],
        },
      },
    })

    const { installIntegration } = await import('../src/commands/integration-install.js')

    await installIntegration('codex', { preview: true, ide: 'cursor', json: true })

    expect(writeFileMock).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(logMock.header).not.toHaveBeenCalled()
    expect(logMock.info).not.toHaveBeenCalled()
    expect(logMock.ready).not.toHaveBeenCalled()
    const payload = JSON.parse(String(consoleLogSpy.mock.calls.at(-1)?.[0] ?? '{}'))
    expect(payload).toMatchObject({
      status: 'preview',
      assistant: 'codex',
      preview: true,
      message:
        'Preview complete. Inspecto did not write files or open IDE windows. Review the resolved setup below, then rerun without --preview to apply it.',
    })
    expect(payload.assets).toEqual(
      expect.arrayContaining(['.agents/skills/inspecto-onboarding-codex/SKILL.md']),
    )

    consoleLogSpy.mockRestore()
  })

  it('surfaces a blocked preview outcome as a warning with follow-up guidance', async () => {
    runIntegrationAutomationMock.mockResolvedValue({
      status: 'preview_blocked',
      message:
        'Preview blocked. Inspecto did not write files or open IDE windows because setup cannot continue until the blocking issue below is resolved.',
      nextStep:
        'Install the Trae CN CLI binary or rerun the command from a shell where it is available, then rerun the command.',
    })

    const { installIntegration } = await import('../src/commands/integration-install.js')

    await installIntegration('gemini', { preview: true, ide: 'trae-cn' })

    expect(logMock.warn).toHaveBeenCalledWith(
      'Preview blocked. Inspecto did not write files or open IDE windows because setup cannot continue until the blocking issue below is resolved.',
    )
    expect(logMock.hint).toHaveBeenCalledWith(
      'Install the Trae CN CLI binary or rerun the command from a shell where it is available, then rerun the command.',
    )
  })

  it('refuses a multi-file Claude install before writing anything when one target already exists', async () => {
    const { installIntegration } = await import('../src/commands/integration-install.js')

    existsMock.mockImplementation(async filePath => {
      return (
        filePath ===
        '/Users/tester/.claude/skills/inspecto-onboarding-claude-code/agents/openai.yaml'
      )
    })

    await expect(installIntegration('claude-code', { scope: 'user' })).rejects.toThrow(
      'Refusing to overwrite existing file',
    )

    expect(writeFileMock).not.toHaveBeenCalled()
    expect(chmodMock).not.toHaveBeenCalled()
  })

  it('downloads all Claude assets before writing any file', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '# skill',
        status: 200,
        statusText: 'OK',
      })
      .mockResolvedValueOnce({
        ok: false,
        text: async () => '',
        status: 503,
        statusText: 'Unavailable',
      })

    vi.stubGlobal('fetch', fetchMock)

    const { installIntegration } = await import('../src/commands/integration-install.js')

    await expect(installIntegration('claude-code', { scope: 'user' })).rejects.toThrow(
      'Failed to download',
    )

    expect(writeFileMock).not.toHaveBeenCalled()
    expect(chmodMock).not.toHaveBeenCalled()
  })

  it('surfaces the asset URL when fetch itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')))

    const { installIntegration } = await import('../src/commands/integration-install.js')

    await expect(installIntegration('codex')).rejects.toThrow(
      'Failed to download https://raw.githubusercontent.com/inspecto-dev/inspecto/main/skills/inspecto-onboarding-codex/SKILL.md: fetch failed',
    )

    expect(writeFileMock).not.toHaveBeenCalled()
    expect(chmodMock).not.toHaveBeenCalled()
  })

  it('lists supported integrations with their preferred install targets', async () => {
    const { listIntegrationManifests } = await import('../src/commands/integration-install.js')

    expect(listIntegrationManifests()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assistant: 'codex',
          type: 'native-skill',
          installTarget: '.agents/skills/',
          cliSupported: true,
        }),
        expect.objectContaining({
          assistant: 'claude-code',
          type: 'native-skill',
          installTarget: '.claude/skills/ or ~/.claude/skills/',
        }),
        expect.objectContaining({
          assistant: 'copilot',
          type: 'native-skill',
          installTarget: '.github/skills/inspecto-onboarding/',
        }),
      ]),
    )
  })

  it('describes the resolved install targets for a selected assistant variant', async () => {
    const { describeIntegration } = await import('../src/commands/integration-install.js')

    expect(describeIntegration('claude-code', { scope: 'user' })).toMatchObject({
      assistant: 'claude-code',
      targets: [
        '/Users/tester/.claude/skills/inspecto-onboarding-claude-code/SKILL.md',
        '/Users/tester/.claude/skills/inspecto-onboarding-claude-code/agents/openai.yaml',
        '/Users/tester/.claude/skills/inspecto-onboarding-claude-code/scripts/run-inspecto.sh',
      ],
      preferredInstall:
        'npx @inspecto-dev/cli integrations install claude-code --scope project --host-ide <vscode|cursor|trae|trae-cn>',
    })
  })

  it('describes codex using the same CLI-managed install target model', async () => {
    const { describeIntegration } = await import('../src/commands/integration-install.js')

    expect(describeIntegration('codex', { scope: 'user' })).toMatchObject({
      assistant: 'codex',
      targets: [
        '/Users/tester/.agents/skills/inspecto-onboarding-codex/SKILL.md',
        '/Users/tester/.agents/skills/inspecto-onboarding-codex/agents/openai.yaml',
        '/Users/tester/.agents/skills/inspecto-onboarding-codex/scripts/run-inspecto.sh',
      ],
      preferredInstall:
        'npx @inspecto-dev/cli integrations install codex --host-ide <vscode|cursor|trae|trae-cn>',
    })
  })

  it('prints integration paths without using post-install hints', async () => {
    const { printIntegrationPath } = await import('../src/commands/integration-install.js')

    printIntegrationPath('claude-code', { scope: 'user' })

    expect(logMock.info).toHaveBeenCalledWith(
      '/Users/tester/.claude/skills/inspecto-onboarding-claude-code/SKILL.md',
    )
    expect(logMock.hint).toHaveBeenCalledWith(
      'Preferred install: npx @inspecto-dev/cli integrations install claude-code --scope project --host-ide <vscode|cursor|trae|trae-cn>',
    )
    expect(logMock.hint).not.toHaveBeenCalledWith('Restart Claude Code to load the new skill.')
  })

  it('rejects unsupported extra args and options for list/path', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.doMock('../src/commands/init.js', () => ({ init: vi.fn() }))
    vi.doMock('../src/commands/doctor.js', () => ({ doctor: vi.fn() }))
    vi.doMock('../src/commands/teardown.js', () => ({ teardown: vi.fn() }))
    vi.doMock('../src/commands/detect.js', () => ({ detect: vi.fn() }))
    vi.doMock('../src/commands/plan.js', () => ({ plan: vi.fn() }))
    vi.doMock('../src/commands/apply.js', () => ({ apply: vi.fn() }))

    const { runCli } = await import('../src/bin.js')

    await runCli(['node', 'inspecto', 'integrations', 'list', 'extra'])
    await runCli(['node', 'inspecto', 'integrations', 'path', 'claude-code', '--force'])
    await runCli(['node', 'inspecto', 'integrations', 'list', '--host-ide', 'cursor'])
    await runCli([
      'node',
      'inspecto',
      'integrations',
      'path',
      'claude-code',
      '--inspecto-vsix',
      '/tmp/inspecto.vsix',
    ])
    await runCli(['node', 'inspecto', 'integrations', 'path', 'claude-code', '--preview'])
    await runCli(['node', 'inspecto', 'integrations', 'path', 'claude-code', '--json'])

    expect(logMock.error).toHaveBeenCalledWith(
      'The `list` subcommand does not accept assistant names, --scope, --mode, --host-ide, --inspecto-vsix, --compact, --json, --preview, or --force.',
    )
    expect(logMock.error).toHaveBeenCalledWith('The `path` subcommand does not support `--force`.')
    expect(logMock.error).toHaveBeenCalledWith(
      'The `path` subcommand does not support `--inspecto-vsix`.',
    )
    expect(logMock.error).toHaveBeenCalledWith(
      'The `path` subcommand does not support `--preview`.',
    )
    expect(JSON.parse(String(consoleErrorSpy.mock.calls.at(-1)?.[0] ?? '{}'))).toMatchObject({
      status: 'error',
      error: {
        message: 'The `path` subcommand does not support `--json`.',
      },
    })
    expect(exitSpy).toHaveBeenCalledWith(1)

    consoleErrorSpy.mockRestore()
    exitSpy.mockRestore()
  })

  it('wires the nested CLI command to the integration installer', async () => {
    const installCommand = vi.fn().mockResolvedValue(undefined)
    const doctorCommand = vi.fn().mockResolvedValue({ status: 'ok' })
    const listCommand = vi.fn().mockResolvedValue(undefined)
    const pathCommand = vi.fn().mockResolvedValue(undefined)

    vi.doMock('../src/commands/init.js', () => ({ init: vi.fn() }))
    vi.doMock('../src/commands/doctor.js', () => ({ doctor: vi.fn() }))
    vi.doMock('../src/commands/teardown.js', () => ({ teardown: vi.fn() }))
    vi.doMock('../src/commands/detect.js', () => ({ detect: vi.fn() }))
    vi.doMock('../src/commands/plan.js', () => ({ plan: vi.fn() }))
    vi.doMock('../src/commands/apply.js', () => ({ apply: vi.fn() }))
    vi.doMock('../src/commands/integration-install.js', () => ({
      installIntegration: installCommand,
      printIntegrationList: listCommand,
      printIntegrationPath: pathCommand,
    }))
    vi.doMock('../src/commands/integration-doctor.js', () => ({
      integrationDoctor: doctorCommand,
    }))

    const { runCli } = await import('../src/bin.js')

    await runCli([
      'node',
      'inspecto',
      'integrations',
      'install',
      'copilot',
      '--host-ide',
      'cursor',
      '--inspecto-vsix',
      '/tmp/inspecto.vsix',
      '--preview',
      '--json',
      '--mode',
      'agents',
      '--force',
    ])

    await runCli(['node', 'inspecto', 'integrations', 'list'])
    await runCli(['node', 'inspecto', 'integrations', 'path', 'claude-code', '--scope', 'user'])
    await runCli([
      'node',
      'inspecto',
      'integrations',
      'doctor',
      'codex',
      '--host-ide',
      'cursor',
      '--compact',
      '--json',
    ])

    expect(installCommand).toHaveBeenCalledWith('copilot', {
      ide: 'cursor',
      inspectoVsix: '/tmp/inspecto.vsix',
      preview: true,
      json: true,
      mode: 'agents',
      force: true,
    })
    expect(listCommand).toHaveBeenCalledWith()
    expect(pathCommand).toHaveBeenCalledWith('claude-code', { scope: 'user' })
    expect(doctorCommand).toHaveBeenCalledWith('codex', {
      ide: 'cursor',
      compact: true,
      failOnBlocked: true,
      json: true,
    })
  })

  it('sets a non-zero exit code when integrations doctor reports a blocked result', async () => {
    const doctorCommand = vi.fn().mockResolvedValue({ status: 'blocked' })

    vi.doMock('../src/commands/init.js', () => ({ init: vi.fn() }))
    vi.doMock('../src/commands/doctor.js', () => ({ doctor: vi.fn() }))
    vi.doMock('../src/commands/teardown.js', () => ({ teardown: vi.fn() }))
    vi.doMock('../src/commands/detect.js', () => ({ detect: vi.fn() }))
    vi.doMock('../src/commands/plan.js', () => ({ plan: vi.fn() }))
    vi.doMock('../src/commands/apply.js', () => ({ apply: vi.fn() }))
    vi.doMock('../src/commands/integration-doctor.js', () => ({
      integrationDoctor: doctorCommand,
    }))

    const { runCli } = await import('../src/bin.js')

    await runCli(['node', 'inspecto', 'integrations', 'doctor', 'codex', '--json'])

    expect(doctorCommand).toHaveBeenCalledWith('codex', { json: true, failOnBlocked: true })
  })
})
