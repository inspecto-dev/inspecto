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

  it('requires explicit selection when one package has multiple supported build configs', () => {
    const resolution = resolveOnboardingTarget({
      repoRoot: '/repo',
      buildTools: [
        {
          tool: 'vite',
          configPath: 'finder/vite.config.mts',
          label: 'Vite (finder/vite.config.mts)',
          packagePath: 'finder',
        },
        {
          tool: 'rspack',
          configPath: 'finder/rspack-config/rspack.config.dev.ts',
          label: 'Rspack (finder/rspack-config/rspack.config.dev.ts)',
          packagePath: 'finder',
          isLegacyRspack: true,
        },
      ],
      frameworkSupportByPackage: {
        finder: ['react'],
      },
    })

    expect(resolution.status).toBe('needs_selection')
    expect(resolution.candidates).toHaveLength(2)
    expect(new Set(resolution.candidates.map(item => item.id)).size).toBe(2)
    expect(new Set(resolution.candidates.map(item => item.candidateId)).size).toBe(2)
    expect(resolution.candidates.map(item => item.configPath)).toEqual([
      'finder/vite.config.mts',
      'finder/rspack-config/rspack.config.dev.ts',
    ])
    expect(resolution.selectionPurpose).toContain('build target')
    expect(resolution.selectionInstructions).toContain('--target <candidateId>')
  })

  it('resolves an explicitly selected build target by candidate id', () => {
    const resolution = resolveOnboardingTarget({
      repoRoot: '/repo',
      buildTools: [
        {
          tool: 'vite',
          configPath: 'finder/vite.config.mts',
          label: 'Vite (finder/vite.config.mts)',
          packagePath: 'finder',
        },
        {
          tool: 'rspack',
          configPath: 'finder/rspack-config/rspack.config.dev.ts',
          label: 'Rspack (finder/rspack-config/rspack.config.dev.ts)',
          packagePath: 'finder',
          isLegacyRspack: true,
        },
      ],
      frameworkSupportByPackage: {
        finder: ['react'],
      },
      selectedPackagePath: 'finder:rspack:finder/rspack-config/rspack.config.dev.ts',
    })

    expect(resolution.status).toBe('resolved')
    expect(resolution.selected?.buildTool).toBe('rspack')
    expect(resolution.selected?.configPath).toBe('finder/rspack-config/rspack.config.dev.ts')
    expect(resolution.selected?.isLegacyRspack).toBe(true)
  })

  it('resolves an explicitly selected build target by config path for root-level candidates', () => {
    const resolution = resolveOnboardingTarget({
      repoRoot: '/repo',
      buildTools: [
        {
          tool: 'webpack',
          configPath: 'webpack.config.common.js',
          label: 'Webpack (webpack.config.common.js)',
          packagePath: '',
          isLegacyWebpack: true,
        },
        {
          tool: 'webpack',
          configPath: 'webpack.dll.config.js',
          label: 'Webpack (webpack.dll.config.js)',
          packagePath: '',
          isLegacyWebpack: true,
        },
      ],
      frameworkSupportByPackage: {
        '': ['react'],
      },
      selectedPackagePath: 'webpack.config.common.js',
    })

    expect(resolution.status).toBe('resolved')
    expect(resolution.selected?.configPath).toBe('webpack.config.common.js')
    expect(resolution.selected?.buildTool).toBe('webpack')
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

  it('keeps guided Next.js patch metadata in deferred JSON output', async () => {
    const session: ResolvedOnboardingSession = {
      status: 'needs_confirmation',
      target: {
        status: 'guided',
        candidates: [],
        reason: 'Awaiting confirmation before guided onboarding.',
      },
      summary: {
        headline: 'Inspecto can partially onboard /repo, but manual follow-up remains.',
        changes: ['Install the Inspecto runtime packages with pnpm.'],
        risks: [],
        manualFollowUp: [
          'Generate a guided patch plan for the Next.js Inspecto webpack integration.',
          'Complete the remaining client-side Inspecto mount step in your assistant or editor.',
        ],
      },
      confirmation: {
        required: true,
        question:
          'Proceed with Inspecto onboarding using the proposed default target and settings?',
      },
      verification: {
        available: true,
        devCommand: 'pnpm dev',
        message: 'Start the local dev server with `pnpm dev` to verify Inspecto in the browser.',
      },
      context: {
        root: '/repo',
        packageManager: 'pnpm',
        buildTools: { supported: [], unsupported: ['Next.js'] },
        frameworks: { supported: ['react'], unsupported: [] },
        ides: [{ ide: 'vscode', supported: true }],
        providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
      },
      plan: {
        status: 'warning',
        warnings: [],
        blockers: [],
        strategy: 'guided',
        actions: [],
        defaults: {
          provider: 'codex',
          ide: 'vscode',
          shared: false,
          extension: true,
        },
        framework: 'react',
        metaFramework: 'Next.js',
        routerMode: 'app',
        autoApplied: ['dependencies', 'inspecto_settings'],
        pendingSteps: [
          'Review the generated Next.js patch plan for next.config.mjs.',
          'Complete the remaining client-side mount step for your App Router entry.',
        ],
        assistantPrompt: 'Complete the remaining Inspecto onboarding for this Next.js project.',
        patches: [
          {
            path: 'next.config.mjs',
            status: 'planned',
            reason: 'next_config_object_export',
            confidence: 'high',
            snippet: '...',
          },
          {
            path: 'app/layout.tsx',
            status: 'manual_patch_required',
            reason: 'next_app_router_mount',
            confidence: 'medium',
            snippet: '...',
          },
        ],
      },
      projectRoot: '/repo',
      selectedIDE: { ide: 'vscode', supported: true },
      providerDefault: 'codex.cli',
      framework: 'react',
      metaFramework: 'Next.js',
      routerMode: 'app',
      autoApplied: ['dependencies', 'inspecto_settings'],
      pendingSteps: [
        'Review the generated Next.js patch plan for next.config.mjs.',
        'Complete the remaining client-side mount step for your App Router entry.',
      ],
      assistantPrompt: 'Complete the remaining Inspecto onboarding for this Next.js project.',
      patches: [
        {
          path: 'next.config.mjs',
          status: 'planned',
          reason: 'next_config_object_export',
          confidence: 'high',
          snippet: '...',
        },
        {
          path: 'app/layout.tsx',
          status: 'manual_patch_required',
          reason: 'next_app_router_mount',
          confidence: 'medium',
          snippet: '...',
        },
      ],
    }

    const deferred: OnboardCommandResult = {
      status: 'needs_confirmation',
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
      framework: 'react',
      metaFramework: 'Next.js',
      routerMode: 'app',
      autoApplied: ['dependencies', 'inspecto_settings'],
      pendingSteps: [
        'Review the generated Next.js patch plan for next.config.mjs.',
        'Complete the remaining client-side mount step for your App Router entry.',
      ],
      assistantPrompt: 'Complete the remaining Inspecto onboarding for this Next.js project.',
      patches: [
        {
          path: 'next.config.mjs',
          status: 'planned',
          reason: 'next_config_object_export',
          confidence: 'high',
          snippet: '...',
        },
        {
          path: 'app/layout.tsx',
          status: 'manual_patch_required',
          reason: 'next_app_router_mount',
          confidence: 'medium',
          snippet: '...',
        },
      ],
    }

    vi.mocked(resolveOnboardingSession).mockResolvedValue(session)
    vi.mocked(buildDeferredOnboardResult).mockReturnValue(deferred)

    const result = await onboard({ json: true })

    expect(result.metaFramework).toBe('Next.js')
    expect(result.routerMode).toBe('app')
    expect(result.handoff?.metaFramework).toBe('Next.js')
    expect(result.handoff?.pendingSteps).toEqual(
      expect.arrayContaining([
        'Review the generated Next.js patch plan for next.config.mjs.',
        'Complete the remaining client-side mount step for your App Router entry.',
      ]),
    )
    expect(result.assistantPrompt).toContain('Complete the remaining Inspecto onboarding')
    expect(result.patches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'next.config.mjs', reason: 'next_config_object_export' }),
        expect.objectContaining({ path: 'app/layout.tsx', reason: 'next_app_router_mount' }),
      ]),
    )
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

  it('prints guided patch targets and assistant handoff in text mode', async () => {
    const session: ResolvedOnboardingSession = {
      status: 'partial_success',
      target: {
        status: 'resolved',
        selected: {
          packagePath: '',
          configPath: 'next.config.mjs',
          buildTool: 'webpack',
          frameworks: ['react'],
          automaticInjection: false,
        },
        candidates: [],
        reason: 'Guided onboarding is available.',
      },
      summary: {
        headline: 'Inspecto can partially onboard /repo, but manual follow-up remains.',
        changes: ['Install the Inspecto runtime packages with pnpm.'],
        risks: [],
        manualFollowUp: [
          'Generate a guided patch plan for the Next.js Inspecto webpack integration.',
          'Complete the remaining client-side Inspecto mount step in your assistant or editor.',
        ],
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
        buildTools: { supported: [], unsupported: ['Next.js'] },
        frameworks: { supported: ['react'], unsupported: [] },
        ides: [{ ide: 'vscode', supported: true }],
        providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
      },
      plan: {
        status: 'warning',
        warnings: [],
        blockers: [],
        strategy: 'guided',
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
        installed: true,
        manualRequired: false,
        installCommand: 'code --install-extension inspecto.inspecto',
        marketplaceUrl: 'https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto',
        openVsxUrl: 'https://open-vsx.org/extension/inspecto/inspecto',
      },
      verification: session.verification,
      diagnostics: {
        warnings: [],
        errors: [],
        nextSteps: [
          'Generate a guided patch plan for the Next.js Inspecto webpack integration.',
          'Complete the remaining client-side Inspecto mount step in your assistant or editor.',
        ],
      },
      metaFramework: 'Next.js',
      routerMode: 'app',
      pendingSteps: [
        'Review the generated Next.js patch plan for next.config.mjs.',
        'Complete the remaining client-side mount step for your App Router entry.',
      ],
      assistantPrompt: 'Complete the remaining Inspecto onboarding for this Next.js project.',
      patches: [
        {
          path: 'next.config.mjs',
          status: 'planned',
          reason: 'next_config_object_export',
          confidence: 'high',
          snippet: '...',
        },
        {
          path: 'app/layout.tsx',
          status: 'manual_patch_required',
          reason: 'next_app_router_mount',
          confidence: 'medium',
          snippet: '...',
        },
      ],
    }

    vi.mocked(resolveOnboardingSession).mockResolvedValue(session)
    vi.mocked(applyResolvedOnboardingSession).mockResolvedValue(applied)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await onboard({ json: false })

    expect(consoleSpy.mock.calls.some(call => String(call[0]).includes('next.config.mjs'))).toBe(
      true,
    )
    expect(
      consoleSpy.mock.calls.some(call =>
        String(call[0]).includes('Complete the remaining Inspecto onboarding'),
      ),
    ).toBe(true)
    expect(
      consoleSpy.mock.calls.some(call =>
        String(call[0]).includes(
          'Complete the remaining client-side mount step for your App Router entry.',
        ),
      ),
    ).toBe(true)
  })

  it('keeps guided Nuxt handoff metadata in applied JSON output', async () => {
    const session: ResolvedOnboardingSession = {
      status: 'partial_success',
      target: {
        status: 'resolved',
        selected: {
          packagePath: '',
          configPath: 'nuxt.config.ts',
          buildTool: 'vite',
          frameworks: ['vue'],
          automaticInjection: false,
        },
        candidates: [],
        reason: 'Guided onboarding is available.',
      },
      summary: {
        headline: 'Inspecto can partially onboard /repo, but manual follow-up remains.',
        changes: ['Install the Inspecto runtime packages with pnpm.'],
        risks: [],
        manualFollowUp: [
          'Generate a guided patch plan for the Nuxt Inspecto Vite integration.',
          'Complete the remaining Nuxt client plugin mount step in your assistant or editor.',
        ],
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
        buildTools: { supported: [], unsupported: ['Nuxt'] },
        frameworks: { supported: ['vue'], unsupported: [] },
        ides: [{ ide: 'vscode', supported: true }],
        providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
      },
      plan: {
        status: 'warning',
        warnings: [],
        blockers: [],
        strategy: 'guided',
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
        installed: true,
        manualRequired: false,
        installCommand: 'code --install-extension inspecto.inspecto',
        marketplaceUrl: 'https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto',
        openVsxUrl: 'https://open-vsx.org/extension/inspecto/inspecto',
      },
      verification: session.verification,
      diagnostics: {
        warnings: [],
        errors: [],
        nextSteps: [
          'Generate a guided patch plan for the Nuxt Inspecto Vite integration.',
          'Complete the remaining Nuxt client plugin mount step in your assistant or editor.',
        ],
      },
      framework: 'vue',
      metaFramework: 'Nuxt',
      autoApplied: ['dependencies', 'inspecto_settings'],
      pendingSteps: [
        'Review the generated Nuxt patch plan for nuxt.config.ts.',
        'Complete the remaining Nuxt client plugin mount step in plugins/inspecto.client.ts.',
      ],
      assistantPrompt: 'Complete the remaining Inspecto onboarding for this Nuxt project.',
      patches: [
        {
          path: 'nuxt.config.ts',
          status: 'planned',
          reason: 'nuxt_config_object_export',
          confidence: 'high',
          snippet: '...',
        },
        {
          path: 'plugins/inspecto.client.ts',
          status: 'manual_patch_required',
          reason: 'nuxt_client_plugin_mount',
          confidence: 'medium',
          snippet: '...',
        },
      ],
    }

    vi.mocked(resolveOnboardingSession).mockResolvedValue(session)
    vi.mocked(applyResolvedOnboardingSession).mockResolvedValue(applied)

    const result = await onboard({ json: true })

    expect(result.handoff?.metaFramework).toBe('Nuxt')
    expect(result.handoff?.framework).toBe('vue')
    expect(result.handoff?.patches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'nuxt.config.ts', reason: 'nuxt_config_object_export' }),
        expect.objectContaining({
          path: 'plugins/inspecto.client.ts',
          reason: 'nuxt_client_plugin_mount',
        }),
      ]),
    )
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
