import { beforeEach, describe, expect, it, vi } from 'vitest'

const describeIntegrationMock = vi.fn()
const runIntegrationAutomationMock = vi.fn()
const exitProcessMock = vi.fn()
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

vi.mock('../src/commands/integration-install.js', () => ({
  describeIntegration: describeIntegrationMock,
}))

vi.mock('../src/commands/integration-automation.js', () => ({
  runIntegrationAutomation: runIntegrationAutomationMock,
}))

vi.mock('../src/utils/logger.js', () => ({
  log: logMock,
}))

vi.mock('../src/utils/process.js', () => ({
  exitProcess: exitProcessMock,
}))

describe('integration doctor', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(process, 'cwd').mockReturnValue('/repo')
    describeIntegrationMock.mockReturnValue({
      assistant: 'codex',
      type: 'native-skill',
      targets: ['.agents/skills/inspecto-onboarding-codex/SKILL.md'],
      preferredInstall: 'npx @inspecto-dev/cli integrations install codex',
      cliSupported: true,
    })
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
          uri: 'cursor://inspecto.inspecto/send?...',
          autoSend: true,
        },
      },
    })
  })

  it('returns structured JSON diagnostics for integration preflight checks', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { integrationDoctor } = await import('../src/commands/integration-doctor.js')

    const result = await integrationDoctor('codex', { ide: 'cursor', json: true })

    expect(runIntegrationAutomationMock).toHaveBeenCalledWith(
      'codex',
      { ide: 'cursor', preview: true, silent: true },
      '/repo',
    )
    expect(result).toMatchObject({
      schemaVersion: '1',
      status: 'ok',
      assistant: 'codex',
      assets: ['.agents/skills/inspecto-onboarding-codex/SKILL.md'],
      automation: {
        status: 'preview',
        details: {
          hostIde: {
            id: 'cursor',
          },
        },
      },
    })
    expect(logMock.header).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(result, null, 2))
  })

  it('prints a human-readable preflight summary in text mode', async () => {
    const { integrationDoctor } = await import('../src/commands/integration-doctor.js')

    const result = await integrationDoctor('codex', { ide: 'cursor' })

    expect(result.status).toBe('ok')
    expect(logMock.header).toHaveBeenCalledWith('Inspecto Integration Doctor')
    expect(logMock.info).toHaveBeenCalledWith('Assistant: codex')
    expect(logMock.info).toHaveBeenCalledWith('Host IDE: Cursor (from --host-ide)')
    expect(logMock.info).toHaveBeenCalledWith('Inspecto extension: marketplace (inspecto.inspecto)')
    expect(logMock.info).toHaveBeenCalledWith('Runtime: Codex via cli')
    expect(logMock.info).toHaveBeenCalledWith('Workspace: /repo')
    expect(logMock.info).toHaveBeenCalledWith('Onboarding URI: cursor://inspecto.inspecto/send?...')
  })

  it('prints a compact summary when compact mode is enabled', async () => {
    const { integrationDoctor } = await import('../src/commands/integration-doctor.js')

    const result = await integrationDoctor('codex', { ide: 'cursor', compact: true })

    expect(result.status).toBe('ok')
    expect(logMock.header).toHaveBeenCalledWith('Inspecto Integration Doctor')
    expect(logMock.info).toHaveBeenCalledWith('Assistant: codex')
    expect(logMock.info).toHaveBeenCalledWith('Host IDE: Cursor (from --host-ide)')
    expect(logMock.info).toHaveBeenCalledWith('Runtime: Codex via cli')
    expect(logMock.info).not.toHaveBeenCalledWith('Asset targets:')
    expect(logMock.info).not.toHaveBeenCalledWith(
      'Inspecto extension: marketplace (inspecto.inspecto)',
    )
    expect(logMock.info).not.toHaveBeenCalledWith(
      'Onboarding URI: cursor://inspecto.inspecto/send?...',
    )
  })

  it('exits with code 1 when failOnBlocked is enabled and the preflight is blocked', async () => {
    runIntegrationAutomationMock.mockResolvedValue({
      status: 'preview_blocked',
      message:
        'Preview blocked. Inspecto did not write files or open IDE windows because setup cannot continue until the blocking issue below is resolved.',
      nextStep: 'Install Codex in Cursor and rerun the command.',
      details: {
        runtime: {
          assistant: 'Codex',
          ready: false,
          mode: null,
        },
      },
    })

    const { integrationDoctor } = await import('../src/commands/integration-doctor.js')

    await integrationDoctor('codex', { ide: 'cursor', failOnBlocked: true })

    expect(exitProcessMock).toHaveBeenCalledWith(1)
  })
})
