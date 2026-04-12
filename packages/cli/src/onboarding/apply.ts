import path from 'node:path'
import ora from 'ora'
import { getInstallCommand } from '../detect/package-manager.js'
import { injectPlugin } from '../inject/ast-injector.js'
import { installExtension } from '../inject/extension.js'
import { updateGitignore } from '../inject/gitignore.js'
import { shell } from '../utils/exec.js'
import { exists, readFile, readJSON, writeFile, writeJSON } from '../utils/fs.js'
import { log } from '../utils/logger.js'
import type {
  BuildToolDetection,
  CommandStatus,
  InstallLock,
  Mutation,
  PackageManager,
  PlanResult,
} from '../types.js'

export interface ApplyOnboardingInput {
  repoRoot: string
  projectRoot: string
  packageManager: PackageManager
  supportedBuildTargets: BuildToolDetection[]
  options: {
    shared: boolean
    skipInstall: boolean
    dryRun: boolean
    noExtension: boolean
    quiet?: boolean | undefined
  }
  selectedIDE?: { ide: string; supported: boolean } | null | undefined
  providerDefault?: string | undefined
  manualConfigRequiredFor?: string | undefined
  injectionSkippedRequiresManualConfig?: boolean | undefined
  plan?: PlanResult | undefined
  allowManualPlanApply?: boolean | undefined
}

interface ApplyReporter {
  warn(text: string): void
  success(text: string): void
  error(text: string): void
  hint(text: string): void
  dryRun(text: string): void
}

interface ApplySpinner {
  start(): void
  succeed(text: string): void
  fail(text: string): void
}

function normalizeSupportedIde(ide?: string): string | undefined {
  if (!ide) return undefined
  return ide.toLowerCase() === 'vscode' ? 'vscode' : ide.toLowerCase()
}

async function readInheritedSettingsDefaults(
  repoRoot: string,
  projectRoot: string,
  settingsFileName: string,
): Promise<{ ide?: string; providerDefault?: string }> {
  if (path.resolve(repoRoot) === path.resolve(projectRoot)) {
    return {}
  }

  const inheritedSettingsPath = path.join(repoRoot, '.inspecto', settingsFileName)
  if (!(await exists(inheritedSettingsPath))) {
    return {}
  }

  const inheritedSettings = await readJSON<Record<string, unknown>>(inheritedSettingsPath)
  if (!inheritedSettings || typeof inheritedSettings !== 'object') {
    return {}
  }

  const inheritedDefaults: { ide?: string; providerDefault?: string } = {}

  if (typeof inheritedSettings.ide === 'string') {
    const normalizedIde = normalizeSupportedIde(inheritedSettings.ide)
    if (normalizedIde) {
      inheritedDefaults.ide = normalizedIde
    }
  }

  if (typeof inheritedSettings['provider.default'] === 'string') {
    inheritedDefaults.providerDefault = inheritedSettings['provider.default']
  }

  return inheritedDefaults
}

export interface ApplyOnboardingResult {
  status: CommandStatus
  mutations: Mutation[]
  postInstall: {
    installFailed: boolean
    injectionFailed: boolean
    manualExtensionInstallNeeded: boolean
    nextSteps: string[]
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function resolveRuntimePackages(): {
  installSpec: string
  installedDependencyNames: string[]
} {
  const devRepo = process.env.INSPECTO_DEV_REPO
  if (!devRepo) {
    return {
      installSpec: '@inspecto-dev/plugin @inspecto-dev/core',
      installedDependencyNames: ['@inspecto-dev/plugin', '@inspecto-dev/core'],
    }
  }

  const normalizedRepo = path.resolve(devRepo)
  return {
    installSpec: [
      shellQuote(path.join(normalizedRepo, 'packages/plugin')),
      shellQuote(path.join(normalizedRepo, 'packages/core')),
    ].join(' '),
    installedDependencyNames: ['@inspecto-dev/plugin', '@inspecto-dev/core'],
  }
}

function resultStatus(nextSteps: string[]): CommandStatus {
  return nextSteps.length > 0 ? 'warning' : 'ok'
}

function manualPlanSteps(plan: PlanResult, includeBlockers = true): string[] {
  const steps = plan.actions
    .filter(action =>
      ['manual_step', 'generate_patch_plan', 'generate_file', 'manual_confirmation'].includes(
        action.type,
      ),
    )
    .map(action => action.description)

  if (!includeBlockers) {
    return steps
  }

  return [...plan.blockers.map(blocker => blocker.message), ...steps]
}

function applyGuidedPatchContent(source: string, snippet: string): string {
  if (source.includes("import { webpackPlugin as inspecto } from '@inspecto-dev/plugin'")) {
    return source
  }
  if (source.includes("import { vitePlugin as inspecto } from '@inspecto-dev/plugin'")) {
    return source
  }

  const trimmedSource = source.trimEnd()
  if (/export\s+default\s*\{/m.test(source)) {
    const nextSource = trimmedSource.replace(
      /export\s+default\s*\{/m,
      "import { webpackPlugin as inspecto } from '@inspecto-dev/plugin'\n\nexport default {\n  webpack(config, { dev, isServer }) {\n    if (dev) {\n      config.plugins.push(inspecto())\n    }\n    return config\n  },",
    )
    return `${nextSource}\n`
  }

  if (/module\.exports\s*=\s*\{/m.test(source)) {
    const nextSource = trimmedSource.replace(
      /module\.exports\s*=\s*\{/m,
      "const { webpackPlugin: inspecto } = require('@inspecto-dev/plugin')\n\nmodule.exports = {\n  webpack(config, { dev, isServer }) {\n    if (dev) {\n      config.plugins.push(inspecto())\n    }\n    return config\n  },",
    )
    return `${nextSource}\n`
  }

  const objectExportVariableMatch = source.match(
    /(const\s+([A-Za-z0-9_$]+)\s*(?::[^=]+)?=\s*\{[\s\S]*?\}\s*;?\s*)export\s+default\s+\2\s*;?/m,
  )
  const variableDeclaration = objectExportVariableMatch?.[1]
  const variableName = objectExportVariableMatch?.[2]
  if (variableDeclaration && variableName) {
    const nextDeclaration = variableDeclaration.replace(
      /=\s*\{/m,
      '= {\n  webpack(config, { dev, isServer }) {\n    if (dev) {\n      config.plugins.push(inspecto())\n    }\n    return config\n  },',
    )
    const nextSource = source.replace(
      objectExportVariableMatch[0],
      `import { webpackPlugin as inspecto } from '@inspecto-dev/plugin'\n\n${nextDeclaration}export default ${variableName}`,
    )
    return `${nextSource.trimEnd()}\n`
  }

  if (/defineNuxtConfig\s*\(\s*\{/m.test(source)) {
    const trimmedSource = source.trimEnd()
    const nextSource = trimmedSource.replace(
      /defineNuxtConfig\s*\(\s*\{/m,
      'defineNuxtConfig({\n  vite: {\n    plugins: [inspecto()],\n  },',
    )
    return `import { vitePlugin as inspecto } from '@inspecto-dev/plugin'\n\n${nextSource}\n`
  }

  const jsdocMatch = source.match(
    /\/\*\*[\s\S]*?@type\s*\{import\('next'\)\.NextConfig\}[\s\S]*?\*\/[\s\S]*?(export\s+default|module\.exports)\s*=?\s*\{/m,
  )
  if (jsdocMatch) {
    const isEsm = jsdocMatch[1] === 'export default'
    const importStatement = isEsm
      ? "import { webpackPlugin as inspecto } from '@inspecto-dev/plugin'\n\n"
      : "const { webpackPlugin: inspecto } = require('@inspecto-dev/plugin')\n\n"

    const replacementPattern = isEsm ? /export\s+default\s*\{/m : /module\.exports\s*=\s*\{/m

    const injectConfig = isEsm
      ? 'export default {\n  webpack(config, { dev, isServer }) {\n    if (dev) {\n      config.plugins.push(inspecto())\n    }\n    return config\n  },'
      : 'module.exports = {\n  webpack(config, { dev, isServer }) {\n    if (dev) {\n      config.plugins.push(inspecto())\n    }\n    return config\n  },'

    const nextSource = source.replace(replacementPattern, injectConfig)
    return `${importStatement}${nextSource.trimEnd()}\n`
  }

  return `${trimmedSource}\n\n${snippet}\n`
}

async function applyGuidedPlanPatches(
  input: ApplyOnboardingInput,
  mutations: Mutation[],
  reporter: ApplyReporter,
): Promise<string[]> {
  const nextSteps: string[] = []

  if (!input.plan || input.plan.strategy !== 'guided' || !input.plan.patches?.length) {
    return nextSteps
  }

  for (const patch of input.plan.patches) {
    if (
      patch.status !== 'planned' ||
      (!patch.reason.startsWith('next_config_') && !patch.reason.startsWith('nuxt_config_'))
    ) {
      continue
    }

    const patchPath = path.join(input.projectRoot, patch.path)
    const existingContent = await readFile(patchPath)
    if (existingContent === null) {
      nextSteps.push(`Could not auto-apply the guided patch for ${patch.path}.`)
      continue
    }

    const nextContent = applyGuidedPatchContent(existingContent, patch.snippet)
    if (nextContent === existingContent) {
      continue
    }

    if (input.options.dryRun) {
      reporter.dryRun(`Would apply guided patch to ${patch.path}`)
      continue
    }

    await writeFile(patchPath, nextContent)
    mutations.push({
      type: 'file_modified',
      path: patch.path,
      description: 'Automatically configured Inspecto guided Next.js patch',
    })
    reporter.success(`Applied guided patch to ${patch.path}`)
  }

  return nextSteps
}

export async function applyOnboardingPlan(
  input: ApplyOnboardingInput,
): Promise<ApplyOnboardingResult> {
  return applyOnboardingPlanInternal(input)
}

function createReporter(quiet = false): ApplyReporter {
  if (quiet) {
    return {
      warn() {},
      success() {},
      error() {},
      hint() {},
      dryRun() {},
    }
  }

  return {
    warn(text: string) {
      log.warn(text)
    },
    success(text: string) {
      log.success(text)
    },
    error(text: string) {
      log.error(text)
    },
    hint(text: string) {
      log.hint(text)
    },
    dryRun(text: string) {
      log.dryRun(text)
    },
  }
}

function createSpinner(text: string, quiet = false): ApplySpinner {
  if (quiet) {
    return {
      start() {},
      succeed() {},
      fail() {},
    }
  }

  const spinner = ora(text)
  return {
    start() {
      spinner.start()
    },
    succeed(successText: string) {
      spinner.succeed(successText)
    },
    fail(failureText: string) {
      spinner.fail(failureText)
    },
  }
}

async function applyOnboardingPlanInternal(
  input: ApplyOnboardingInput,
): Promise<ApplyOnboardingResult> {
  const reporter = createReporter(input.options.quiet)
  const additiveManualPlan =
    (input.plan?.strategy === 'manual' || input.plan?.strategy === 'guided') &&
    input.allowManualPlanApply &&
    input.plan.blockers.length === 0

  if (input.plan && input.plan.strategy !== 'supported' && !input.allowManualPlanApply) {
    return {
      status: input.plan.status,
      mutations: [],
      postInstall: {
        installFailed: false,
        injectionFailed: false,
        manualExtensionInstallNeeded: false,
        nextSteps: manualPlanSteps(input.plan, true),
      },
    }
  }

  const mutations: Mutation[] = []
  const settingsDir = path.join(input.projectRoot, '.inspecto')
  const settingsFileName = input.options.shared ? 'settings.json' : 'settings.local.json'
  const promptsFileName = input.options.shared ? 'prompts.json' : 'prompts.local.json'
  const settingsPath = path.join(settingsDir, settingsFileName)
  const promptsPath = path.join(settingsDir, promptsFileName)
  const inheritedDefaults = await readInheritedSettingsDefaults(
    input.repoRoot,
    input.projectRoot,
    settingsFileName,
  )
  const runtimePackages = resolveRuntimePackages()
  const installCmd = getInstallCommand(input.packageManager, runtimePackages.installSpec)
  const nextSteps: string[] = []

  let installFailed = false
  if (input.options.skipInstall) {
    reporter.warn('Skipping dependency installation (--skip-install)')
  } else if (input.options.dryRun) {
    reporter.dryRun(`Would run: ${installCmd}`)
  } else {
    const spinner = createSpinner(
      `Installing devDependencies via: ${installCmd}`,
      input.options.quiet,
    )
    try {
      spinner.start()
      await shell(installCmd, input.projectRoot)
      spinner.succeed('Dependencies installed successfully')
      reporter.success('Installed @inspecto-dev/plugin and @inspecto-dev/core as devDependencies')
      for (const name of runtimePackages.installedDependencyNames) {
        mutations.push({ type: 'dependency_added', name, dev: true })
      }
    } catch (error: any) {
      spinner.fail('Dependency installation failed')
      installFailed = true
      reporter.error(`Failed to install dependency: ${error?.message || 'Unknown error'}`)
      if (error?.stderr) {
        reporter.error(`Details: ${error.stderr}`)
      } else if (error?.stdout) {
        reporter.error(`Details: ${error.stdout}`)
      }
      reporter.hint(`Run manually in ${input.projectRoot}: ${installCmd}`)
      reporter.hint(
        'Setup will continue without dependencies, but Inspecto may not run until installation succeeds.',
      )
    }
  }

  let injectionFailed = Boolean(input.injectionSkippedRequiresManualConfig)
  if (!additiveManualPlan) {
    for (const target of input.supportedBuildTargets) {
      const result = await injectPlugin(
        input.repoRoot,
        target,
        input.options.dryRun,
        input.options.quiet ?? false,
      )
      if (result.success) {
        mutations.push(...result.mutations)
      } else {
        injectionFailed = true
      }
    }
  }

  if (additiveManualPlan) {
    nextSteps.push(...(await applyGuidedPlanPatches(input, mutations, reporter)))
  }

  if (await exists(settingsPath)) {
    const existingSettings = await readJSON(settingsPath)
    if (existingSettings === null) {
      reporter.warn(`.inspecto/${settingsFileName} exists but contains invalid JSON`)
      reporter.hint('Please fix the syntax errors manually, or delete it and re-run init')
      nextSteps.push(`Fix .inspecto/${settingsFileName} or delete it and rerun Inspecto setup.`)
    } else {
      const mergedSettings =
        existingSettings && typeof existingSettings === 'object'
          ? { ...(existingSettings as Record<string, unknown>) }
          : {}
      let settingsChanged = false

      const desiredIde =
        inheritedDefaults.ide ??
        (input.selectedIDE?.supported ? normalizeSupportedIde(input.selectedIDE.ide) : undefined)

      if (desiredIde && !mergedSettings.ide) {
        mergedSettings.ide = desiredIde
        settingsChanged = true
      }

      const desiredProviderDefault = inheritedDefaults.providerDefault ?? input.providerDefault
      if (desiredProviderDefault && !mergedSettings['provider.default']) {
        mergedSettings['provider.default'] = desiredProviderDefault
        settingsChanged = true
      }

      if (settingsChanged) {
        if (input.options.dryRun) {
          reporter.dryRun(`Would update .inspecto/${settingsFileName}`)
        } else {
          await writeJSON(settingsPath, mergedSettings)
          reporter.success(`Updated .inspecto/${settingsFileName} with missing defaults`)
          mutations.push({
            type: 'file_modified',
            path: `.inspecto/${settingsFileName}`,
            description: 'Merged missing Inspecto defaults into existing settings',
          })
        }
      } else {
        reporter.success(`.inspecto/${settingsFileName} already exists (skipped)`)
      }
    }
  } else {
    const defaultSettings: Record<string, unknown> = {}
    const desiredIde =
      inheritedDefaults.ide ??
      (input.selectedIDE?.supported ? normalizeSupportedIde(input.selectedIDE.ide) : undefined)
    const desiredProviderDefault = inheritedDefaults.providerDefault ?? input.providerDefault

    if (desiredIde) {
      defaultSettings.ide = desiredIde
    }

    if (desiredProviderDefault) {
      defaultSettings['provider.default'] = desiredProviderDefault
    }

    if (input.options.dryRun) {
      reporter.dryRun(`Would create .inspecto/${settingsFileName}`)
    } else {
      await writeJSON(settingsPath, defaultSettings)
      reporter.success(`Created .inspecto/${settingsFileName}`)
      mutations.push({ type: 'file_created', path: `.inspecto/${settingsFileName}` })
    }
  }

  if (await exists(promptsPath)) {
    reporter.success(`.inspecto/${promptsFileName} already exists (skipped)`)
  } else if (input.options.dryRun) {
    reporter.dryRun(`Would create .inspecto/${promptsFileName}`)
  } else {
    await writeJSON(promptsPath, [])
    reporter.success(`Created .inspecto/${promptsFileName}`)
    mutations.push({ type: 'file_created', path: `.inspecto/${promptsFileName}` })
  }

  if (!input.options.dryRun) {
    await updateGitignore(
      input.projectRoot,
      input.options.shared,
      input.options.dryRun,
      input.options.quiet ?? false,
    )
    mutations.push({
      type: 'file_modified',
      path: '.gitignore',
      description: 'Appended .inspecto/ ignore rules',
    })
  } else {
    reporter.dryRun('Would update .gitignore')
  }

  if (!input.options.dryRun && mutations.length > 0) {
    const lock: InstallLock = {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      mutations,
    }
    await writeJSON(path.join(settingsDir, 'install.lock'), lock)
  }

  const shouldInstallExt =
    !input.options.noExtension && (!input.selectedIDE || input.selectedIDE.supported)
  let manualExtensionInstallNeeded = false

  if (input.options.noExtension) {
    reporter.warn('Skipping IDE extension (--no-extension)')
  } else if (shouldInstallExt) {
    const extMutation = await installExtension(
      input.options.dryRun,
      input.selectedIDE?.ide,
      input.options.quiet ?? false,
    )
    if (extMutation && !input.options.dryRun) {
      mutations.push(extMutation)

      if (extMutation.manual_action_required) {
        manualExtensionInstallNeeded = true
      }

      const lockPath = path.join(settingsDir, 'install.lock')
      const lock = await readJSON<InstallLock>(lockPath)
      if (lock) {
        lock.mutations = mutations
        await writeJSON(lockPath, lock)
      }
    } else if (extMutation === null && !input.options.dryRun) {
      manualExtensionInstallNeeded = true
    }
  }

  if (!input.options.dryRun) {
    if (installFailed) {
      nextSteps.push(`Install dependencies manually in ${input.projectRoot}: ${installCmd}`)
    }
    if (injectionFailed) {
      nextSteps.push(
        'Plugin injection skipped. Follow manual instructions printed above to update your config.',
      )
    }
    if (manualExtensionInstallNeeded) {
      nextSteps.push('Install the Inspecto IDE extension manually')
    }
    if (additiveManualPlan && input.plan) {
      nextSteps.push(...manualPlanSteps(input.plan, false))
    }
    if (input.manualConfigRequiredFor === 'Nuxt') {
      nextSteps.push(
        'Nuxt detected—please follow the Nuxt instructions printed above to finish setup.',
      )
    } else if (input.manualConfigRequiredFor === 'Next.js') {
      nextSteps.push(
        'Next.js detected—please follow the Next.js instructions printed above to finish setup.',
      )
    }
  }

  return {
    status: resultStatus(nextSteps),
    mutations,
    postInstall: {
      installFailed,
      injectionFailed,
      manualExtensionInstallNeeded,
      nextSteps,
    },
  }
}
