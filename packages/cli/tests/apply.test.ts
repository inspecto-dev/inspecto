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
  readFile: vi.fn(),
  readJSON: vi.fn(),
  writeFile: vi.fn(),
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
    vi.mocked(fsUtils.readFile).mockResolvedValue(null)
    vi.mocked(fsUtils.readJSON).mockResolvedValue(null)
    vi.mocked(fsUtils.writeFile).mockResolvedValue()
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

  it('only injects the explicitly selected build target', async () => {
    const rspackBuild: BuildToolDetection = {
      tool: 'rspack',
      configPath: 'finder/rspack.config.ts',
      label: 'Rspack (finder/rspack.config.ts)',
      packagePath: 'finder',
    }

    const result = await applyOnboardingPlan({
      repoRoot: '/repo',
      projectRoot: '/repo/finder',
      packageManager: 'pnpm',
      supportedBuildTargets: [rspackBuild],
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

    expect(astInjectorUtils.injectPlugin).toHaveBeenCalledTimes(1)
    expect(astInjectorUtils.injectPlugin).toHaveBeenCalledWith('/repo', rspackBuild, false, false)
    expect(result.postInstall.injectionFailed).toBe(false)
  })

  it('supports legacy rspack partial onboarding without attempting automatic injection', async () => {
    const legacyRspackBuild: BuildToolDetection = {
      tool: 'rspack',
      configPath: 'finder/rspack-config/rspack.config.dev.ts',
      label: 'Rspack (finder/rspack-config/rspack.config.dev.ts) [Legacy]',
      packagePath: 'finder',
      isLegacyRspack: true,
    }

    const result = await applyOnboardingPlan({
      repoRoot: '/repo',
      projectRoot: '/repo/finder',
      packageManager: 'pnpm',
      supportedBuildTargets: [legacyRspackBuild],
      options: {
        shared: false,
        skipInstall: false,
        dryRun: false,
        noExtension: false,
      },
      selectedIDE: { ide: 'trae', supported: true },
      providerDefault: 'coco.cli',
      plan: {
        status: 'warning',
        warnings: [
          {
            code: 'legacy-rspack-requires-manual-config',
            message:
              'Legacy Rspack detected at finder/rspack-config/rspack.config.dev.ts. Inspecto must use the legacy Rspack plugin entry and manual config steps.',
          },
        ],
        blockers: [],
        strategy: 'manual',
        actions: [
          {
            type: 'install_dependency',
            target: '@inspecto-dev/plugin @inspecto-dev/core',
            description: 'Install the Inspecto runtime packages with pnpm.',
          },
          {
            type: 'manual_step',
            target: 'finder/rspack-config/rspack.config.dev.ts',
            description:
              'Update finder/rspack-config/rspack.config.dev.ts to import `rspackPlugin` from `@inspecto-dev/plugin/legacy/rspack` and add it to the Rspack plugins array.',
          },
        ],
        defaults: {
          shared: false,
          extension: true,
          provider: 'coco',
          ide: 'trae',
        },
      },
      allowManualPlanApply: true,
    })

    expect(astInjectorUtils.injectPlugin).not.toHaveBeenCalled()
    expect(result.status).toBe('warning')
    expect(result.postInstall.nextSteps).toContain(
      'Update finder/rspack-config/rspack.config.dev.ts to import `rspackPlugin` from `@inspecto-dev/plugin/legacy/rspack` and add it to the Rspack plugins array.',
    )
  })

  it('supports webpack 4 partial onboarding without attempting automatic injection', async () => {
    const legacyWebpackBuild: BuildToolDetection = {
      tool: 'webpack',
      configPath: 'app/webpack.config.js',
      label: 'Webpack (app/webpack.config.js) [Webpack 4]',
      packagePath: 'app',
      isLegacyWebpack: true,
    }

    const result = await applyOnboardingPlan({
      repoRoot: '/repo',
      projectRoot: '/repo/app',
      packageManager: 'pnpm',
      supportedBuildTargets: [legacyWebpackBuild],
      options: {
        shared: false,
        skipInstall: false,
        dryRun: false,
        noExtension: false,
      },
      selectedIDE: { ide: 'cursor', supported: true },
      providerDefault: 'copilot.extension',
      plan: {
        status: 'warning',
        warnings: [
          {
            code: 'legacy-webpack4-requires-manual-config',
            message:
              'Webpack 4 detected at app/webpack.config.js. Inspecto must use the legacy Webpack 4 plugin entry and manual config steps.',
          },
        ],
        blockers: [],
        strategy: 'manual',
        actions: [
          {
            type: 'install_dependency',
            target: '@inspecto-dev/plugin @inspecto-dev/core',
            description: 'Install the Inspecto runtime packages with pnpm.',
          },
          {
            type: 'manual_step',
            target: 'app/webpack.config.js',
            description:
              'Update app/webpack.config.js to import `webpackPlugin` from `@inspecto-dev/plugin/legacy/webpack4` and add it to the Webpack plugins array.',
          },
        ],
        defaults: {
          shared: false,
          extension: true,
          provider: 'copilot',
          ide: 'cursor',
        },
      },
      allowManualPlanApply: true,
    })

    expect(astInjectorUtils.injectPlugin).not.toHaveBeenCalled()
    expect(result.status).toBe('warning')
    expect(result.postInstall.nextSteps).toContain(
      'Update app/webpack.config.js to import `webpackPlugin` from `@inspecto-dev/plugin/legacy/webpack4` and add it to the Webpack plugins array.',
    )
  })

  it('auto-applies high-confidence Next.js config patches for guided plans', async () => {
    vi.mocked(fsUtils.readFile).mockImplementation(async filePath => {
      if (filePath === '/repo/next.config.mjs') {
        return 'export default {\n  reactStrictMode: true,\n}\n'
      }
      return null
    })

    const result = await applyOnboardingPlan({
      repoRoot: '/repo',
      projectRoot: '/repo',
      packageManager: 'pnpm',
      supportedBuildTargets: [],
      options: {
        shared: false,
        skipInstall: false,
        dryRun: false,
        noExtension: false,
      },
      selectedIDE: { ide: 'vscode', supported: true },
      providerDefault: 'codex.extension',
      plan: {
        status: 'warning',
        warnings: [],
        blockers: [],
        strategy: 'guided',
        actions: [
          {
            type: 'install_dependency',
            target: '@inspecto-dev/plugin @inspecto-dev/core',
            description: 'Install the Inspecto runtime packages with pnpm.',
          },
          {
            type: 'generate_patch_plan',
            target: 'next.config',
            description:
              'Generate a guided patch plan for the Next.js Inspecto webpack integration.',
          },
          {
            type: 'manual_confirmation',
            target: '/repo',
            description:
              'Complete the remaining client-side Inspecto mount step in your assistant or editor.',
          },
        ],
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
            snippet:
              "import { webpackPlugin as inspecto } from '@inspecto-dev/plugin'\n\nwebpack(config, { dev, isServer }) {\n  if (dev && !isServer) {\n    config.plugins.push(inspecto())\n  }\n  return config\n}",
          },
        ],
      },
      allowManualPlanApply: true,
    })

    expect(astInjectorUtils.injectPlugin).not.toHaveBeenCalled()
    expect(fsUtils.writeFile).toHaveBeenCalledWith(
      '/repo/next.config.mjs',
      expect.stringContaining("import { webpackPlugin as inspecto } from '@inspecto-dev/plugin'"),
    )
    expect(fsUtils.writeFile).toHaveBeenCalledWith(
      '/repo/next.config.mjs',
      expect.stringContaining('if (dev) {\n      config.plugins.push(inspecto())'),
    )
    expect(result.mutations).toEqual(
      expect.arrayContaining([
        {
          type: 'file_modified',
          path: 'next.config.mjs',
          description: 'Automatically configured Inspecto guided Next.js patch',
        },
      ]),
    )
    expect(result.postInstall.nextSteps).toContain(
      'Complete the remaining client-side Inspecto mount step in your assistant or editor.',
    )
  })

  it('auto-applies high-confidence Next.js patches for exported nextConfig objects', async () => {
    vi.mocked(fsUtils.readFile).mockImplementation(async filePath => {
      if (filePath === '/repo/next.config.ts') {
        return "import type { NextConfig } from 'next'\nconst nextConfig: NextConfig = {\n  reactStrictMode: true,\n}\n\nexport default nextConfig\n"
      }
      return null
    })

    const result = await applyOnboardingPlan({
      repoRoot: '/repo',
      projectRoot: '/repo',
      packageManager: 'pnpm',
      supportedBuildTargets: [],
      options: {
        shared: false,
        skipInstall: false,
        dryRun: false,
        noExtension: false,
      },
      selectedIDE: { ide: 'vscode', supported: true },
      providerDefault: 'codex.extension',
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
          'Review the generated Next.js patch plan for next.config.ts.',
          'Complete the remaining client-side mount step for your App Router entry.',
        ],
        assistantPrompt: 'Complete the remaining Inspecto onboarding for this Next.js project.',
        patches: [
          {
            path: 'next.config.ts',
            status: 'planned',
            reason: 'next_config_object_export',
            confidence: 'high',
            snippet:
              "import { webpackPlugin as inspecto } from '@inspecto-dev/plugin'\n\nwebpack(config, { dev, isServer }) {\n  if (dev && !isServer) {\n    config.plugins.push(inspecto())\n  }\n  return config\n}",
          },
        ],
      },
      allowManualPlanApply: true,
    })

    expect(fsUtils.writeFile).toHaveBeenCalledWith(
      '/repo/next.config.ts',
      expect.stringContaining("import { webpackPlugin as inspecto } from '@inspecto-dev/plugin'"),
    )
    expect(fsUtils.writeFile).toHaveBeenCalledWith(
      '/repo/next.config.ts',
      expect.stringContaining(
        'const nextConfig: NextConfig = {\n  webpack(config, { dev, isServer }) {',
      ),
    )
    expect(fsUtils.writeFile).toHaveBeenCalledWith(
      '/repo/next.config.ts',
      expect.not.stringContaining('!isServer'),
    )
    expect(result.mutations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'next.config.ts',
          description: 'Automatically configured Inspecto guided Next.js patch',
        }),
      ]),
    )
  })

  it('preserves manual patch follow-up for guided Next.js plans that are not auto-applicable', async () => {
    const result = await applyOnboardingPlan({
      repoRoot: '/repo',
      projectRoot: '/repo',
      packageManager: 'pnpm',
      supportedBuildTargets: [],
      options: {
        shared: false,
        skipInstall: false,
        dryRun: false,
        noExtension: false,
      },
      selectedIDE: { ide: 'vscode', supported: true },
      providerDefault: 'codex.extension',
      plan: {
        status: 'warning',
        warnings: [],
        blockers: [],
        strategy: 'guided',
        actions: [
          {
            type: 'generate_patch_plan',
            target: 'next.config',
            description:
              'Generate a guided patch plan for the Next.js Inspecto webpack integration.',
          },
        ],
        defaults: {
          provider: 'codex',
          ide: 'vscode',
          shared: false,
          extension: true,
        },
        framework: 'react',
        metaFramework: 'Next.js',
        routerMode: 'pages',
        pendingSteps: ['Review the generated Next.js patch plan for next.config.js.'],
        patches: [
          {
            path: 'next.config.js',
            status: 'manual_patch_required',
            reason: 'next_config_wrapped_export',
            confidence: 'medium',
            snippet: 'module.exports = withBundleAnalyzer({ /* ... */ })',
          },
        ],
      },
      allowManualPlanApply: true,
    })

    expect(astInjectorUtils.injectPlugin).not.toHaveBeenCalled()
    expect(fsUtils.writeFile).not.toHaveBeenCalledWith('/repo/next.config.js', expect.any(String))
    expect(result.postInstall.nextSteps).toContain(
      'Generate a guided patch plan for the Next.js Inspecto webpack integration.',
    )
  })

  it('auto-applies high-confidence Nuxt config patches for guided plans', async () => {
    vi.mocked(fsUtils.readFile).mockImplementation(async filePath => {
      if (filePath === '/repo/nuxt.config.ts') {
        return 'export default defineNuxtConfig({\n  devtools: { enabled: true },\n})\n'
      }
      return null
    })

    const result = await applyOnboardingPlan({
      repoRoot: '/repo',
      projectRoot: '/repo',
      packageManager: 'pnpm',
      supportedBuildTargets: [],
      options: {
        shared: false,
        skipInstall: false,
        dryRun: false,
        noExtension: false,
      },
      selectedIDE: { ide: 'vscode', supported: true },
      providerDefault: 'codex.extension',
      plan: {
        status: 'warning',
        warnings: [],
        blockers: [],
        strategy: 'guided',
        actions: [
          {
            type: 'generate_patch_plan',
            target: 'nuxt.config',
            description: 'Generate a guided patch plan for the Nuxt Inspecto Vite integration.',
          },
        ],
        defaults: {
          provider: 'codex',
          ide: 'vscode',
          shared: false,
          extension: true,
        },
        framework: 'vue',
        metaFramework: 'Nuxt',
        pendingSteps: [
          'Review the generated Nuxt patch plan for nuxt.config.ts.',
          'Complete the remaining Nuxt client plugin mount step in plugins/inspecto.client.ts.',
        ],
        patches: [
          {
            path: 'nuxt.config.ts',
            status: 'planned',
            reason: 'nuxt_config_object_export',
            confidence: 'high',
            snippet:
              "import { vitePlugin as inspecto } from '@inspecto-dev/plugin'\n\nexport default defineNuxtConfig({\n  vite: {\n    plugins: [inspecto()],\n  },\n})",
          },
          {
            path: 'plugins/inspecto.client.ts',
            status: 'manual_patch_required',
            reason: 'nuxt_client_plugin_mount',
            confidence: 'medium',
            snippet: 'export default defineNuxtPlugin(() => {})',
          },
        ],
      },
      allowManualPlanApply: true,
    })

    expect(fsUtils.writeFile).toHaveBeenCalledWith(
      '/repo/nuxt.config.ts',
      expect.stringContaining("import { vitePlugin as inspecto } from '@inspecto-dev/plugin'"),
    )
    expect(result.mutations).toEqual(
      expect.arrayContaining([
        {
          type: 'file_modified',
          path: 'nuxt.config.ts',
          description: 'Automatically configured Inspecto guided Next.js patch',
        },
      ]),
    )
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

  it('merges missing defaults into an existing valid local settings file', async () => {
    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return filePath === '/repo/.inspecto/settings.local.json'
    })
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath === '/repo/.inspecto/settings.local.json') {
        return { ide: 'trae-cn' }
      }
      return null
    })

    await applyOnboardingPlan({
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
      selectedIDE: { ide: 'trae-cn', supported: true },
      providerDefault: 'coco.cli',
    })

    expect(fsUtils.writeJSON).toHaveBeenCalledWith('/repo/.inspecto/settings.local.json', {
      ide: 'trae-cn',
      'provider.default': 'coco.cli',
    })
  })

  it('inherits root inspecto defaults when writing package-local settings for a selected subproject', async () => {
    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return filePath === '/repo/.inspecto/settings.local.json'
    })
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath === '/repo/.inspecto/settings.local.json') {
        return {
          ide: 'vscode',
          'provider.default': 'codex.extension',
        }
      }
      return null
    })

    await applyOnboardingPlan({
      repoRoot: '/repo',
      projectRoot: '/repo/finder',
      packageManager: 'pnpm',
      supportedBuildTargets: [],
      options: {
        shared: false,
        skipInstall: true,
        dryRun: false,
        noExtension: true,
      },
      selectedIDE: { ide: 'cursor', supported: true },
      providerDefault: 'codex.extension',
    })

    expect(fsUtils.writeJSON).toHaveBeenCalledWith('/repo/finder/.inspecto/settings.local.json', {
      ide: 'vscode',
      'provider.default': 'codex.extension',
    })
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
