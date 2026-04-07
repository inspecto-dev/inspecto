import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../src/commands/apply.js'
import { applyOnboardingPlan } from '../src/onboarding/apply.js'
import * as onboardingContext from '../src/onboarding/context.js'
import * as planner from '../src/onboarding/planner.js'
import * as packageManagerUtils from '../src/detect/package-manager.js'
import * as fsUtils from '../src/utils/fs.js'
import * as execUtils from '../src/utils/exec.js'
import * as astInjectorUtils from '../src/inject/ast-injector.js'
import * as gitignoreUtils from '../src/inject/gitignore.js'
import * as extensionUtils from '../src/inject/extension.js'
import type { BuildToolDetection, OnboardingContext, PlanResult } from '../src/types.js'

vi.mock('../src/onboarding/context.js', () => ({
  buildOnboardingContext: vi.fn(),
}))

vi.mock('../src/onboarding/planner.js', async () => {
  const actual = await vi.importActual('../src/onboarding/planner.js')
  return {
    ...actual,
    createPlanResult: vi.fn(),
  }
})

vi.mock('../src/detect/package-manager.js', async () => {
  const actual = await vi.importActual('../src/detect/package-manager.js')
  return {
    ...actual,
    getInstallCommand: vi.fn(),
  }
})

vi.mock('../src/utils/fs.js', () => ({
  exists: vi.fn(),
  readJSON: vi.fn(),
  writeJSON: vi.fn(),
}))

vi.mock('../src/utils/exec.js', () => ({
  shell: vi.fn(),
}))

vi.mock('../src/detect/build-tool.js', async () => {
  const actual = await vi.importActual('../src/detect/build-tool.js')
  return {
    ...actual,
    resolveInjectionTarget: vi.fn(),
  }
})

vi.mock('../src/inject/ast-injector.js', () => ({
  injectPlugin: vi.fn(),
}))

vi.mock('../src/inject/gitignore.js', () => ({
  updateGitignore: vi.fn(),
}))

vi.mock('../src/inject/extension.js', () => ({
  installExtension: vi.fn(),
}))

describe('apply onboarding flow', () => {
  const supportedBuild: BuildToolDetection = {
    tool: 'vite',
    configPath: 'vite.config.ts',
    label: 'Vite (vite.config.ts)',
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(process, 'cwd').mockReturnValue('/repo')
    vi.mocked(packageManagerUtils.getInstallCommand).mockReturnValue(
      'pnpm add -D @inspecto-dev/plugin @inspecto-dev/core',
    )
    vi.mocked(execUtils.shell).mockResolvedValue({ stdout: '', stderr: '' })
    vi.mocked(astInjectorUtils.injectPlugin).mockResolvedValue({
      success: true,
      mutations: [{ type: 'file_modified', path: 'vite.config.ts' }],
    })
    vi.mocked(fsUtils.exists).mockResolvedValue(false)
    vi.mocked(fsUtils.readJSON).mockResolvedValue(null)
    vi.mocked(gitignoreUtils.updateGitignore).mockResolvedValue()
    vi.mocked(extensionUtils.installExtension).mockResolvedValue({
      type: 'extension_installed',
      id: 'inspecto.inspecto',
    })
  })

  it('applies the supported setup path and returns structured mutations and post-install state', async () => {
    const result = await applyOnboardingPlan({
      repoRoot: '/repo',
      projectRoot: '/repo',
      packageManager: 'pnpm',
      supportedBuildTargets: [supportedBuild],
      options: {
        shared: false,
        skipInstall: false,
        dryRun: false,
        noExtension: false,
      },
      selectedIDE: { ide: 'vscode', supported: true },
      providerDefault: 'codex.extension',
      plan: {
        status: 'ok',
        warnings: [],
        blockers: [],
        strategy: 'supported',
        actions: [],
        defaults: {
          shared: false,
          extension: true,
          provider: 'codex',
          ide: 'vscode',
        },
      },
    })

    expect(execUtils.shell).toHaveBeenCalledWith(
      'pnpm add -D @inspecto-dev/plugin @inspecto-dev/core',
      '/repo',
    )
    expect(astInjectorUtils.injectPlugin).toHaveBeenCalledWith(
      '/repo',
      supportedBuild,
      false,
      false,
    )
    expect(fsUtils.writeJSON).toHaveBeenCalledWith('/repo/.inspecto/settings.local.json', {
      ide: 'vscode',
      'provider.default': 'codex.extension',
    })
    expect(fsUtils.writeJSON).toHaveBeenCalledWith('/repo/.inspecto/prompts.local.json', [])
    expect(fsUtils.writeJSON).toHaveBeenCalledWith(
      '/repo/.inspecto/install.lock',
      expect.objectContaining({
        version: '1.0.0',
        mutations: expect.arrayContaining([
          { type: 'dependency_added', name: '@inspecto-dev/plugin', dev: true },
          { type: 'dependency_added', name: '@inspecto-dev/core', dev: true },
          { type: 'file_modified', path: 'vite.config.ts' },
          { type: 'file_created', path: '.inspecto/settings.local.json' },
          { type: 'file_created', path: '.inspecto/prompts.local.json' },
          {
            type: 'file_modified',
            path: '.gitignore',
            description: 'Appended .inspecto/ ignore rules',
          },
          { type: 'extension_installed', id: 'inspecto.inspecto' },
        ]),
      }),
    )
    expect(result).toMatchObject({
      status: 'ok',
      mutations: expect.arrayContaining([
        { type: 'dependency_added', name: '@inspecto-dev/plugin', dev: true },
        { type: 'extension_installed', id: 'inspecto.inspecto' },
      ]),
      postInstall: {
        installFailed: false,
        injectionFailed: false,
        manualExtensionInstallNeeded: false,
        nextSteps: [],
      },
    })
  })

  it('uses onboarding context and planner output and prints JSON from the apply command', async () => {
    const context: OnboardingContext = {
      root: '/repo',
      packageManager: 'pnpm',
      buildTools: {
        supported: [supportedBuild],
        unsupported: [],
      },
      frameworks: {
        supported: ['react'],
        unsupported: [],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    }

    const planResult: PlanResult = {
      status: 'ok',
      warnings: [],
      blockers: [],
      strategy: 'supported',
      actions: [
        {
          type: 'install_dependency',
          target: '@inspecto-dev/plugin @inspecto-dev/core',
          description: 'Install dependencies.',
        },
      ],
      defaults: {
        provider: 'codex',
        ide: 'vscode',
        shared: false,
        extension: true,
      },
    }

    vi.mocked(onboardingContext.buildOnboardingContext).mockResolvedValue(context)
    vi.mocked(planner.createPlanResult).mockReturnValue(planResult)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const result = await apply({ json: true })

    expect(onboardingContext.buildOnboardingContext).toHaveBeenCalledWith('/repo')
    expect(planner.createPlanResult).toHaveBeenCalledWith(context)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(result, null, 2))
    expect(result.plan).toEqual(planResult)
    expect(result.status).toBe('ok')
    expect(fsUtils.writeJSON).toHaveBeenCalledWith('/repo/.inspecto/settings.local.json', {
      ide: 'vscode',
      'provider.default': 'codex.cli',
    })
  })

  it('does not run side effects for manual plans and returns manual next steps', async () => {
    const context: OnboardingContext = {
      root: '/repo',
      packageManager: 'pnpm',
      buildTools: {
        supported: [],
        unsupported: ['Next.js'],
      },
      frameworks: {
        supported: ['react'],
        unsupported: [],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    }

    const planResult: PlanResult = {
      status: 'blocked',
      warnings: [],
      blockers: [
        {
          code: 'unsupported-build-tool',
          message: 'Detected unsupported build tool(s): Next.js',
        },
      ],
      strategy: 'manual',
      actions: [
        {
          type: 'manual_step',
          target: 'Next.js',
          description: 'Follow the printed Next.js instructions.',
        },
      ],
      defaults: {
        provider: 'codex',
        ide: 'vscode',
        shared: true,
        extension: true,
      },
    }

    vi.mocked(onboardingContext.buildOnboardingContext).mockResolvedValue(context)
    vi.mocked(planner.createPlanResult).mockReturnValue(planResult)

    const result = await apply({ json: true })

    expect(execUtils.shell).not.toHaveBeenCalled()
    expect(astInjectorUtils.injectPlugin).not.toHaveBeenCalled()
    expect(gitignoreUtils.updateGitignore).not.toHaveBeenCalled()
    expect(extensionUtils.installExtension).not.toHaveBeenCalled()
    expect(fsUtils.writeJSON).not.toHaveBeenCalled()
    expect(result.status).toBe('blocked')
    expect(result.postInstall.nextSteps).toEqual([
      'Detected unsupported build tool(s): Next.js',
      'Follow the printed Next.js instructions.',
    ])
  })

  it('preserves warning status from the plan when execution adds no new next steps', async () => {
    const context: OnboardingContext = {
      root: '/repo',
      packageManager: 'pnpm',
      buildTools: {
        supported: [supportedBuild],
        unsupported: [],
      },
      frameworks: {
        supported: ['react'],
        unsupported: ['svelte'],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    }

    const planResult: PlanResult = {
      status: 'warning',
      warnings: [
        {
          code: 'unsupported-framework-present',
          message: 'Unsupported framework(s) also detected: svelte',
        },
      ],
      blockers: [],
      strategy: 'supported',
      actions: [
        {
          type: 'install_dependency',
          target: '@inspecto-dev/plugin @inspecto-dev/core',
          description: 'Install dependencies.',
        },
      ],
      defaults: {
        provider: 'codex',
        ide: 'vscode',
        shared: true,
        extension: true,
      },
    }

    vi.mocked(onboardingContext.buildOnboardingContext).mockResolvedValue(context)
    vi.mocked(planner.createPlanResult).mockReturnValue(planResult)

    const result = await apply({ json: true })

    expect(result.status).toBe('warning')
    expect(result.postInstall.nextSteps).toEqual([])
  })

  it('blocks apply when multiple supported build targets are detected from the repo root', async () => {
    const context: OnboardingContext = {
      root: '/repo',
      packageManager: 'pnpm',
      buildTools: {
        supported: [
          {
            tool: 'vite',
            configPath: 'apps/web/vite.config.ts',
            label: 'Vite (apps/web/vite.config.ts)',
            packagePath: 'apps/web',
          },
          {
            tool: 'webpack',
            configPath: 'apps/admin/webpack.config.js',
            label: 'Webpack (apps/admin/webpack.config.js)',
            packagePath: 'apps/admin',
          },
        ],
        unsupported: [],
      },
      frameworks: {
        supported: ['react'],
        unsupported: [],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    }

    const planResult: PlanResult = {
      status: 'blocked',
      warnings: [],
      blockers: [
        {
          code: 'multiple-supported-build-targets',
          message:
            'Multiple supported build targets detected: apps/web, apps/admin. Run inspecto apply from a single app/package root until explicit target selection is available.',
        },
      ],
      strategy: 'manual',
      actions: [
        {
          type: 'manual_step',
          target: 'apps/web, apps/admin',
          description:
            'Run inspecto apply from the target app/package root. Root-level apply is blocked when multiple supported targets are detected.',
        },
      ],
      defaults: {
        provider: 'codex',
        ide: 'vscode',
        shared: true,
        extension: true,
      },
    }

    vi.mocked(onboardingContext.buildOnboardingContext).mockResolvedValue(context)
    vi.mocked(planner.createPlanResult).mockReturnValue(planResult)

    const result = await apply({ json: true })

    expect(execUtils.shell).not.toHaveBeenCalled()
    expect(astInjectorUtils.injectPlugin).not.toHaveBeenCalled()
    expect(fsUtils.writeJSON).not.toHaveBeenCalled()
    expect(result.status).toBe('blocked')
    expect(result.postInstall.nextSteps).toEqual([
      'Multiple supported build targets detected: apps/web, apps/admin. Run inspecto apply from a single app/package root until explicit target selection is available.',
      'Run inspecto apply from the target app/package root. Root-level apply is blocked when multiple supported targets are detected.',
    ])
  })

  it('prints planner warnings in plain-text apply output', async () => {
    const context: OnboardingContext = {
      root: '/repo',
      packageManager: 'pnpm',
      buildTools: {
        supported: [supportedBuild],
        unsupported: [],
      },
      frameworks: {
        supported: ['react'],
        unsupported: ['svelte'],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    }

    const planResult: PlanResult = {
      status: 'warning',
      warnings: [
        {
          code: 'unsupported-framework-present',
          message: 'Unsupported framework(s) also detected: svelte',
        },
      ],
      blockers: [],
      strategy: 'supported',
      actions: [
        {
          type: 'install_dependency',
          target: '@inspecto-dev/plugin @inspecto-dev/core',
          description: 'Install dependencies.',
        },
      ],
      defaults: {
        provider: 'codex',
        ide: 'vscode',
        shared: true,
        extension: true,
      },
    }

    vi.mocked(onboardingContext.buildOnboardingContext).mockResolvedValue(context)
    vi.mocked(planner.createPlanResult).mockReturnValue(planResult)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await apply()

    const output = consoleSpy.mock.calls.flatMap(call => call.map(value => String(value)))
    expect(output.some(line => line.includes('Status: warning'))).toBe(true)
    expect(
      output.some(line => line.includes('Unsupported framework(s) also detected: svelte')),
    ).toBe(true)
    expect(
      output.some(line => line.includes('Ready! Hold Alt + Click any element to inspect.')),
    ).toBe(false)
  })

  it('prints manual apply blockers and next steps without duplicating blocker text', async () => {
    const context: OnboardingContext = {
      root: '/repo',
      packageManager: 'pnpm',
      buildTools: {
        supported: [],
        unsupported: ['Next.js'],
      },
      frameworks: {
        supported: ['react'],
        unsupported: [],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    }

    const planResult: PlanResult = {
      status: 'blocked',
      warnings: [],
      blockers: [
        {
          code: 'unsupported-build-tool',
          message: 'Detected unsupported build tool(s): Next.js',
        },
      ],
      strategy: 'manual',
      actions: [
        {
          type: 'manual_step',
          target: 'Next.js',
          description: 'Follow the printed Next.js instructions.',
        },
      ],
      defaults: {
        provider: 'codex',
        ide: 'vscode',
        shared: true,
        extension: true,
      },
    }

    vi.mocked(onboardingContext.buildOnboardingContext).mockResolvedValue(context)
    vi.mocked(planner.createPlanResult).mockReturnValue(planResult)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await apply()

    const output = consoleSpy.mock.calls.map(call => call.join(' ')).join('\n')

    expect(output.match(/Detected unsupported build tool\(s\): Next\.js/g)).toHaveLength(1)
    expect(output.match(/Follow the printed Next\.js instructions\./g)).toHaveLength(1)
    expect(output).toContain('Manual Steps Required')
  })

  it('treats malformed existing settings as a manual follow-up instead of ok', async () => {
    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return filePath === '/repo/.inspecto/settings.local.json'
    })
    vi.mocked(fsUtils.readJSON).mockResolvedValue(null)

    const result = await applyOnboardingPlan({
      repoRoot: '/repo',
      projectRoot: '/repo',
      packageManager: 'pnpm',
      supportedBuildTargets: [],
      options: {
        shared: false,
        skipInstall: true,
        dryRun: false,
        noExtension: true,
      },
      selectedIDE: { ide: 'vscode', supported: true },
    })

    expect(result.status).toBe('warning')
    expect(result.postInstall.nextSteps).toContain(
      'Fix .inspecto/settings.local.json or delete it and rerun Inspecto setup.',
    )
    expect(fsUtils.writeJSON).toHaveBeenCalledWith('/repo/.inspecto/prompts.local.json', [])
  })

  it('prints the same short 3-step success guide when apply finishes cleanly', async () => {
    const context: OnboardingContext = {
      root: '/repo',
      packageManager: 'pnpm',
      buildTools: {
        supported: [supportedBuild],
        unsupported: [],
      },
      frameworks: {
        supported: ['react'],
        unsupported: [],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    }

    const planResult: PlanResult = {
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
    }

    vi.mocked(onboardingContext.buildOnboardingContext).mockResolvedValue(context)
    vi.mocked(planner.createPlanResult).mockReturnValue(planResult)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await apply()

    const output = consoleSpy.mock.calls.flatMap(call => call.map(value => String(value)))
    expect(output.some(line => line.includes('Ready! Inspecto is set up.'))).toBe(true)
    expect(output.some(line => line.includes('1. Start or restart your dev server.'))).toBe(true)
    expect(output.some(line => line.includes('2. Open your app in the browser.'))).toBe(true)
    expect(output.some(line => line.includes('3. Hold Alt + Click any element to inspect.'))).toBe(
      true,
    )
  })
})
