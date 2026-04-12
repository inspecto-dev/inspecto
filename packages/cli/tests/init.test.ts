import { beforeEach, describe, expect, it, vi } from 'vitest'
import { init } from '../src/commands/init.js'
import * as fsUtils from '../src/utils/fs.js'
import * as execUtils from '../src/utils/exec.js'
import * as promptUtils from '../src/prompts.js'
import * as buildToolUtils from '../src/detect/build-tool.js'
import * as frameworkUtils from '../src/detect/framework.js'
import * as ideUtils from '../src/detect/ide.js'
import * as packageManagerUtils from '../src/detect/package-manager.js'
import * as providerUtils from '../src/detect/provider.js'
import * as astInjectorUtils from '../src/inject/ast-injector.js'
import * as instructionUtils from '../src/instructions.js'
import * as onboardingApply from '../src/onboarding/apply.js'

vi.mock('../src/utils/fs.js', () => ({
  exists: vi.fn(),
  readJSON: vi.fn(),
  writeJSON: vi.fn(),
}))

vi.mock('../src/utils/exec.js', () => ({
  shell: vi.fn(),
}))

vi.mock('../src/detect/package-manager.js', async () => {
  const actual = await vi.importActual('../src/detect/package-manager.js')
  return {
    ...actual,
    detectPackageManager: vi.fn(),
  }
})

vi.mock('../src/detect/build-tool.js', async () => {
  const actual = await vi.importActual('../src/detect/build-tool.js')
  return {
    ...actual,
    detectBuildTools: vi.fn(),
    resolveInjectionTarget: vi.fn(),
  }
})

vi.mock('../src/detect/framework.js', () => ({
  detectFrameworks: vi.fn(),
}))

vi.mock('../src/detect/ide.js', () => ({
  detectIDE: vi.fn(),
}))

vi.mock('../src/detect/provider.js', () => ({
  detectProviders: vi.fn(),
}))

vi.mock('../src/prompts.js', async () => {
  const actual = await vi.importActual('../src/prompts.js')
  return {
    ...actual,
    promptMonorepoPackageChoice: vi.fn(),
  }
})

vi.mock('../src/inject/ast-injector.js', () => ({
  injectPlugin: vi.fn().mockResolvedValue({ success: true, mutations: [] }),
}))

vi.mock('../src/inject/gitignore.js', () => ({
  updateGitignore: vi.fn(),
}))

vi.mock('../src/inject/extension.js', () => ({
  installExtension: vi.fn().mockResolvedValue(null),
}))

vi.mock('../src/instructions.js', () => ({
  printNextJsManualInstructions: vi.fn(),
  printNuxtManualInstructions: vi.fn(),
}))

vi.mock('../src/onboarding/apply.js', async () => {
  const actual = await vi.importActual('../src/onboarding/apply.js')
  return {
    ...actual,
    applyOnboardingPlan: vi.fn().mockResolvedValue({
      status: 'ok',
      mutations: [],
      postInstall: {
        installFailed: false,
        injectionFailed: false,
        manualExtensionInstallNeeded: false,
        nextSteps: [],
      },
    }),
  }
})

describe('init in monorepo roots', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(process, 'cwd').mockReturnValue('/repo')
    vi.mocked(onboardingApply.applyOnboardingPlan).mockResolvedValue({
      status: 'ok',
      mutations: [],
      postInstall: {
        installFailed: false,
        injectionFailed: false,
        manualExtensionInstallNeeded: false,
        nextSteps: [],
      },
    })

    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return (
        filePath === '/repo/package.json' ||
        filePath === '/repo/apps/web' ||
        filePath === '/repo/apps/admin'
      )
    })

    vi.mocked(fsUtils.readJSON).mockResolvedValue({})
    vi.mocked(execUtils.shell).mockResolvedValue({ stdout: '', stderr: '' })
    vi.mocked(packageManagerUtils.detectPackageManager).mockResolvedValue('pnpm')
    vi.mocked(frameworkUtils.detectFrameworks).mockResolvedValue({
      supported: ['react'],
      unsupported: [],
    })
    vi.mocked(ideUtils.detectIDE).mockResolvedValue({
      detected: [{ ide: 'vscode', supported: true }],
    })
    vi.mocked(providerUtils.detectProviders).mockResolvedValue({
      detected: [],
    })
    vi.mocked(buildToolUtils.resolveInjectionTarget).mockReturnValue({
      tool: 'vite',
      configPath: 'apps/web/vite.config.ts',
      label: 'Vite (apps/web/vite.config.ts)',
      packagePath: 'apps/web',
    })
    vi.mocked(astInjectorUtils.injectPlugin).mockResolvedValue({
      success: true,
      mutations: [],
    })
  })

  it('routes installation and config generation into the selected app instead of the monorepo root', async () => {
    vi.mocked(buildToolUtils.detectBuildTools)
      .mockResolvedValueOnce({
        supported: [
          {
            tool: 'vite',
            configPath: 'apps/web/vite.config.ts',
            label: 'Vite (apps/web/vite.config.ts)',
            packagePath: 'apps/web',
          },
          {
            tool: 'vite',
            configPath: 'apps/admin/vite.config.ts',
            label: 'Vite (apps/admin/vite.config.ts)',
            packagePath: 'apps/admin',
          },
        ],
        unsupported: [],
      })
      .mockResolvedValueOnce({
        supported: [
          {
            tool: 'vite',
            configPath: 'apps/web/vite.config.ts',
            label: 'Vite (apps/web/vite.config.ts)',
            packagePath: 'apps/web',
          },
        ],
        unsupported: [],
      })

    vi.mocked(promptUtils.promptMonorepoPackageChoice).mockResolvedValue('apps/web')

    await init({
      shared: false,
      skipInstall: false,
      dryRun: false,
      noExtension: false,
      force: false,
    })

    expect(promptUtils.promptMonorepoPackageChoice).toHaveBeenCalledWith([
      {
        tool: 'vite',
        configPath: 'apps/web/vite.config.ts',
        label: 'Vite (apps/web/vite.config.ts)',
        packagePath: 'apps/web',
      },
      {
        tool: 'vite',
        configPath: 'apps/admin/vite.config.ts',
        label: 'Vite (apps/admin/vite.config.ts)',
        packagePath: 'apps/admin',
      },
    ])
    expect(buildToolUtils.detectBuildTools).toHaveBeenNthCalledWith(2, '/repo', ['apps/web'])
    expect(onboardingApply.applyOnboardingPlan).toHaveBeenCalledWith({
      repoRoot: '/repo',
      projectRoot: '/repo/apps/web',
      packageManager: 'pnpm',
      supportedBuildTargets: [
        {
          tool: 'vite',
          configPath: 'apps/web/vite.config.ts',
          label: 'Vite (apps/web/vite.config.ts)',
          packagePath: 'apps/web',
        },
      ],
      options: {
        shared: false,
        skipInstall: false,
        dryRun: false,
        noExtension: false,
      },
      selectedIDE: {
        ide: 'vscode',
        supported: true,
      },
      providerDefault: undefined,
      manualConfigRequiredFor: '',
      injectionSkippedRequiresManualConfig: false,
      allowManualPlanApply: true,
    })
  })

  it('prints detailed Next.js manual instructions when Next.js is detected', async () => {
    vi.mocked(buildToolUtils.detectBuildTools).mockResolvedValue({
      supported: [],
      unsupported: ['Next.js'],
    })

    await init({
      shared: false,
      skipInstall: true,
      dryRun: true,
      noExtension: true,
      force: false,
    })

    expect(instructionUtils.printNextJsManualInstructions).toHaveBeenCalled()
    expect(instructionUtils.printNuxtManualInstructions).not.toHaveBeenCalled()
  })

  it('prints detailed Nuxt guided instructions when Nuxt is detected', async () => {
    vi.mocked(buildToolUtils.detectBuildTools).mockResolvedValue({
      supported: [],
      unsupported: ['Nuxt'],
    })

    await init({
      shared: false,
      skipInstall: true,
      dryRun: true,
      noExtension: true,
      force: false,
    })

    expect(instructionUtils.printNuxtManualInstructions).toHaveBeenCalled()
  })

  it('preserves detected preferred mode for an explicit provider override', async () => {
    vi.mocked(buildToolUtils.detectBuildTools).mockResolvedValue({
      supported: [
        {
          tool: 'vite',
          configPath: 'vite.config.ts',
          label: 'Vite (vite.config.ts)',
        },
      ],
      unsupported: [],
    })
    vi.mocked(providerUtils.detectProviders).mockResolvedValue({
      detected: [
        {
          id: 'codex',
          label: 'Codex CLI',
          supported: true,
          providerModes: ['cli'],
          preferredMode: 'cli',
        },
      ],
    })

    await init({
      shared: false,
      skipInstall: false,
      dryRun: false,
      provider: 'codex',
      noExtension: false,
      force: false,
    })

    expect(onboardingApply.applyOnboardingPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        providerDefault: 'codex.cli',
      }),
    )
  })

  it('prints delegated manual steps when the shared apply flow returns a warning', async () => {
    vi.mocked(buildToolUtils.detectBuildTools).mockResolvedValue({
      supported: [
        {
          tool: 'vite',
          configPath: 'vite.config.ts',
          label: 'Vite (vite.config.ts)',
        },
      ],
      unsupported: [],
    })
    vi.mocked(onboardingApply.applyOnboardingPlan).mockResolvedValue({
      status: 'warning',
      mutations: [],
      postInstall: {
        installFailed: false,
        injectionFailed: false,
        manualExtensionInstallNeeded: false,
        nextSteps: [
          'Install dependencies manually in /repo: pnpm add -D @inspecto-dev/plugin @inspecto-dev/core',
        ],
      },
    })

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await init({
      shared: false,
      skipInstall: false,
      dryRun: false,
      noExtension: false,
      force: false,
    })

    const output = consoleSpy.mock.calls.flatMap(call => call.map(value => String(value)))
    expect(output.some(line => line.includes('Manual Steps Required'))).toBe(true)
    expect(
      output.some(line =>
        line.includes(
          'Install dependencies manually in /repo: pnpm add -D @inspecto-dev/plugin @inspecto-dev/core',
        ),
      ),
    ).toBe(true)
    expect(
      output.some(line => line.includes('Ready! Hold Alt + Click any element to inspect.')),
    ).toBe(false)
  })

  it('prints a short 3-step success guide after automatic setup succeeds', async () => {
    vi.mocked(buildToolUtils.detectBuildTools).mockResolvedValue({
      supported: [
        {
          tool: 'vite',
          configPath: 'vite.config.ts',
          label: 'Vite (vite.config.ts)',
        },
      ],
      unsupported: [],
    })

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await init({
      shared: false,
      skipInstall: false,
      dryRun: false,
      noExtension: false,
      force: false,
    })

    const output = consoleSpy.mock.calls.flatMap(call => call.map(value => String(value)))
    expect(output.some(line => line.includes('Ready! Inspecto is set up.'))).toBe(true)
    expect(output.some(line => line.includes('1. Start or restart your dev server.'))).toBe(true)
    expect(output.some(line => line.includes('2. Open your app in the browser.'))).toBe(true)
    expect(output.some(line => line.includes('3. Hold Alt + Click any element to inspect.'))).toBe(
      true,
    )
  })
})
