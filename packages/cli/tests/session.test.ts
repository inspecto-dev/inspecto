import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyResolvedOnboardingSession } from '../src/onboarding/session.js'
import type { ApplyOnboardingResult } from '../src/onboarding/apply.js'
import type { ResolvedOnboardingSession } from '../src/types.js'

const { applyOnboardingPlanMock, readJSONMock } = vi.hoisted(() => ({
  applyOnboardingPlanMock: vi.fn(),
  readJSONMock: vi.fn(),
}))

vi.mock('../src/onboarding/apply.js', () => ({
  applyOnboardingPlan: applyOnboardingPlanMock,
}))

vi.mock('../src/utils/fs.js', async () => {
  const actual = await vi.importActual('../src/utils/fs.js')
  return {
    ...actual,
    readJSON: readJSONMock,
  }
})

describe('onboarding session extension guidance', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    readJSONMock.mockResolvedValue({
      scripts: {
        dev: 'vite',
      },
    })
  })

  it('returns Cursor-specific manual extension guidance when onboarding still needs manual completion', async () => {
    const session: ResolvedOnboardingSession = {
      status: 'success',
      target: {
        status: 'resolved',
        selected: {
          packagePath: '',
          configPath: 'vite.config.ts',
          buildTool: 'vite',
          frameworks: ['react'],
          automaticInjection: true,
        },
        candidates: [
          {
            packagePath: '',
            configPath: 'vite.config.ts',
            buildTool: 'vite',
            frameworks: ['react'],
            automaticInjection: true,
          },
        ],
        reason: 'Only one supported target was detected.',
      },
      summary: {
        headline: 'Inspecto is ready to onboard /repo.',
        changes: ['Install dependencies.'],
        risks: [],
        manualFollowUp: [],
      },
      confirmation: { required: false },
      verification: {
        available: true,
        devCommand: 'pnpm dev',
        message: 'Start the local dev server with `pnpm dev` to verify Inspecto in the browser.',
      },
      context: {
        root: '/repo',
        packageManager: 'pnpm',
        buildTools: { supported: [], unsupported: [] },
        frameworks: { supported: ['react'], unsupported: [] },
        ides: [{ ide: 'cursor', supported: true }],
        providers: [
          { id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'extension' },
        ],
      },
      plan: {
        status: 'ok',
        warnings: [],
        blockers: [],
        strategy: 'supported',
        actions: [],
        defaults: {
          provider: 'codex',
          ide: 'cursor',
          shared: false,
          extension: true,
        },
      },
      projectRoot: '/repo',
      selectedIDE: { ide: 'cursor', supported: true },
      providerDefault: 'codex.extension',
    }

    const applyResult: ApplyOnboardingResult = {
      status: 'warning',
      mutations: [],
      postInstall: {
        installFailed: false,
        injectionFailed: false,
        manualExtensionInstallNeeded: true,
        nextSteps: ['Install the Inspecto IDE extension manually'],
      },
    }

    applyOnboardingPlanMock.mockResolvedValue(applyResult)

    const result = await applyResolvedOnboardingSession(session, {})

    expect(result.status).toBe('partial_success')
    expect(result.ideExtension).toMatchObject({
      required: true,
      installed: false,
      manualRequired: true,
      installCommand: 'cursor --install-extension inspecto.inspecto',
      openVsxUrl: 'https://open-vsx.org/extension/inspecto/inspecto',
    })
  })
})
