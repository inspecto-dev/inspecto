import { beforeEach, describe, expect, it, vi } from 'vitest'
import { onboard } from '../src/commands/onboard.js'
import {
  applyResolvedOnboardingSession,
  buildDeferredOnboardResult,
  resolveOnboardingSession,
} from '../src/onboarding/session.js'
import { resolveOnboardingTarget } from '../src/onboarding/target-resolution.js'
import type { OnboardCommandResult, ResolvedOnboardingSession } from '../src/types.js'

vi.mock('../src/onboarding/session.js', () => ({
  resolveOnboardingSession: vi.fn(),
  applyResolvedOnboardingSession: vi.fn(),
  buildDeferredOnboardResult: vi.fn(),
}))

describe('target resolution', () => {
  it('returns needs_selection when multiple monorepo candidates are equally plausible', () => {
    const resolution = resolveOnboardingTarget({
      repoRoot: '/repo',
      buildTools: [
        {
          tool: 'vite',
          configPath: 'apps/web/vite.config.ts',
          label: 'Vite',
          packagePath: 'apps/web',
        },
        {
          tool: 'vite',
          configPath: 'apps/admin/vite.config.ts',
          label: 'Vite',
          packagePath: 'apps/admin',
        },
      ],
      frameworkSupportByPackage: {
        'apps/web': ['vue'],
        'apps/admin': ['vue'],
      },
    })

    expect(resolution.status).toBe('needs_selection')
    expect(resolution.candidates.map(item => item.packagePath)).toEqual(['apps/web', 'apps/admin'])
  })

  it('preselects the strongest supported app candidate', () => {
    const resolution = resolveOnboardingTarget({
      repoRoot: '/repo',
      buildTools: [
        {
          tool: 'vite',
          configPath: 'playground/demo/vite.config.ts',
          label: 'Vite',
          packagePath: 'playground/demo',
        },
        {
          tool: 'vite',
          configPath: 'apps/web/vite.config.ts',
          label: 'Vite',
          packagePath: 'apps/web',
        },
      ],
      frameworkSupportByPackage: {
        'playground/demo': ['react'],
        'apps/web': ['react'],
      },
    })

    expect(resolution.status).toBe('resolved')
    expect(resolution.selected?.packagePath).toBe('apps/web')
  })
})

describe('onboard command', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(process, 'cwd').mockReturnValue('/repo')
  })

  it('prints assistant-facing JSON for a supported happy path', async () => {
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
        ides: [{ ide: 'vscode', supported: true }],
        providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
      },
      plan: {
        status: 'ok',
        warnings: [],
        blockers: [],
        strategy: 'supported',
        actions: [],
        defaults: {
          provider: 'codex',
          ide: 'vscode',
          shared: false,
          extension: true,
        },
      },
      projectRoot: '/repo',
      selectedIDE: { ide: 'vscode', supported: true },
      providerDefault: 'codex.cli',
    }

    const applied: OnboardCommandResult = {
      status: 'success',
      target: session.target,
      summary: session.summary,
      confirmation: session.confirmation,
      ideExtension: {
        required: true,
        installed: true,
        manualRequired: false,
        installCommand: 'code --install-extension inspecto.inspecto',
        marketplaceUrl: 'https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto',
        openVsxUrl: 'https://open-vsx.org/extension/inspecto/inspecto',
      },
      verification: session.verification,
      result: {
        changedFiles: ['vite.config.ts'],
        installedDependencies: ['@inspecto-dev/plugin', '@inspecto-dev/core'],
        selectedProviderDefault: 'codex.cli',
        selectedIDE: 'vscode',
        mutations: [],
      },
    }

    vi.mocked(resolveOnboardingSession).mockResolvedValue(session)
    vi.mocked(applyResolvedOnboardingSession).mockResolvedValue(applied)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = await onboard({ json: true })

    expect(result.status).toBe('success')
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(result, null, 2))
    expect(applyResolvedOnboardingSession).toHaveBeenCalledWith(session, { json: true })
    expect(result.verification?.devCommand).toBe('pnpm dev')
  })

  it('returns needs_target_selection without applying when target selection is ambiguous', async () => {
    const session: ResolvedOnboardingSession = {
      status: 'needs_target_selection',
      target: {
        status: 'needs_selection',
        candidates: [
          {
            packagePath: 'apps/web',
            configPath: 'apps/web/vite.config.ts',
            buildTool: 'vite',
            frameworks: ['react'],
            automaticInjection: true,
          },
          {
            packagePath: 'apps/admin',
            configPath: 'apps/admin/vite.config.ts',
            buildTool: 'vite',
            frameworks: ['react'],
            automaticInjection: true,
          },
        ],
        reason: 'Multiple supported targets look equally plausible.',
      },
      summary: {
        headline: 'Inspecto found multiple plausible app targets and needs one selection.',
        changes: [],
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
        ides: [{ ide: 'vscode', supported: true }],
        providers: [],
      },
      plan: {
        status: 'blocked',
        warnings: [],
        blockers: [],
        strategy: 'manual',
        actions: [],
        defaults: {
          shared: false,
          extension: true,
        },
      },
      projectRoot: '/repo',
    }

    const deferred: OnboardCommandResult = {
      status: 'needs_target_selection',
      target: session.target,
      summary: session.summary,
      confirmation: session.confirmation,
      ideExtension: {
        required: true,
        installed: false,
        manualRequired: true,
        installCommand: 'code --install-extension inspecto.inspecto',
        marketplaceUrl: 'https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto',
        openVsxUrl: 'https://open-vsx.org/extension/inspecto/inspecto',
      },
      verification: session.verification,
    }

    vi.mocked(resolveOnboardingSession).mockResolvedValue(session)
    vi.mocked(buildDeferredOnboardResult).mockReturnValue(deferred)

    const result = await onboard({ json: true })

    expect(result.status).toBe('needs_target_selection')
    expect(result.result).toBeUndefined()
    expect(applyResolvedOnboardingSession).not.toHaveBeenCalled()
    expect(result.ideExtension?.required).toBe(true)
  })

  it('prints verification guidance in text mode after successful onboarding', async () => {
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
        ides: [{ ide: 'vscode', supported: true }],
        providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
      },
      plan: {
        status: 'ok',
        warnings: [],
        blockers: [],
        strategy: 'supported',
        actions: [],
        defaults: {
          provider: 'codex',
          ide: 'vscode',
          shared: false,
          extension: true,
        },
      },
      projectRoot: '/repo',
      selectedIDE: { ide: 'vscode', supported: true },
      providerDefault: 'codex.cli',
    }

    const applied: OnboardCommandResult = {
      status: 'success',
      target: session.target,
      summary: session.summary,
      confirmation: session.confirmation,
      ideExtension: {
        required: true,
        installed: true,
        manualRequired: false,
        installCommand: 'code --install-extension inspecto.inspecto',
        marketplaceUrl: 'https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto',
        openVsxUrl: 'https://open-vsx.org/extension/inspecto/inspecto',
      },
      verification: session.verification,
      result: {
        changedFiles: ['vite.config.ts'],
        installedDependencies: ['@inspecto-dev/plugin', '@inspecto-dev/core'],
        selectedProviderDefault: 'codex.cli',
        selectedIDE: 'vscode',
        mutations: [],
      },
    }

    vi.mocked(resolveOnboardingSession).mockResolvedValue(session)
    vi.mocked(applyResolvedOnboardingSession).mockResolvedValue(applied)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = await onboard({ json: false })

    expect(result.status).toBe('success')
    expect(
      consoleSpy.mock.calls.some(call =>
        String(call[0]).includes('Start the local dev server with `pnpm dev`'),
      ),
    ).toBe(true)
    expect(
      consoleSpy.mock.calls.some(call =>
        String(call[0]).includes('code --install-extension inspecto.inspecto'),
      ),
    ).toBe(false)
  })

  it('prints manual extension guidance only when the IDE extension still needs manual completion', async () => {
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
        ides: [{ ide: 'vscode', supported: true }],
        providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
      },
      plan: {
        status: 'ok',
        warnings: [],
        blockers: [],
        strategy: 'supported',
        actions: [],
        defaults: {
          provider: 'codex',
          ide: 'vscode',
          shared: false,
          extension: true,
        },
      },
      projectRoot: '/repo',
      selectedIDE: { ide: 'vscode', supported: true },
      providerDefault: 'codex.cli',
    }

    const applied: OnboardCommandResult = {
      status: 'partial_success',
      target: session.target,
      summary: session.summary,
      confirmation: session.confirmation,
      ideExtension: {
        required: true,
        installed: false,
        manualRequired: true,
        installCommand: 'code --install-extension inspecto.inspecto',
        marketplaceUrl: 'https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto',
        openVsxUrl: 'https://open-vsx.org/extension/inspecto/inspecto',
      },
      verification: session.verification,
      result: {
        changedFiles: ['vite.config.ts'],
        installedDependencies: ['@inspecto-dev/plugin', '@inspecto-dev/core'],
        selectedProviderDefault: 'codex.cli',
        selectedIDE: 'vscode',
        mutations: [],
      },
      diagnostics: {
        warnings: ['IDE extension installation still needs manual completion.'],
        errors: [],
        nextSteps: [],
      },
    }

    vi.mocked(resolveOnboardingSession).mockResolvedValue(session)
    vi.mocked(applyResolvedOnboardingSession).mockResolvedValue(applied)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = await onboard({ json: false })

    expect(result.status).toBe('partial_success')
    expect(
      consoleSpy.mock.calls.some(call =>
        String(call[0]).includes('Complete the IDE extension install before verification'),
      ),
    ).toBe(true)
    expect(
      consoleSpy.mock.calls.some(call =>
        String(call[0]).includes('code --install-extension inspecto.inspecto'),
      ),
    ).toBe(true)
    expect(
      consoleSpy.mock.calls.some(call =>
        String(call[0]).includes('Start the local dev server with `pnpm dev`'),
      ),
    ).toBe(false)
  })
})
