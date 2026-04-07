import path from 'node:path'
import ora from 'ora'
import { getInstallCommand } from '../detect/package-manager.js'
import { injectPlugin } from '../inject/ast-injector.js'
import { installExtension } from '../inject/extension.js'
import { updateGitignore } from '../inject/gitignore.js'
import { shell } from '../utils/exec.js'
import { exists, readJSON, writeJSON } from '../utils/fs.js'
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

function manualPlanSteps(plan: PlanResult): string[] {
  return [
    ...plan.blockers.map(blocker => blocker.message),
    ...plan.actions
      .filter(action => action.type === 'manual_step')
      .map(action => action.description),
  ]
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

  if (input.plan && input.plan.strategy !== 'supported' && !input.allowManualPlanApply) {
    return {
      status: input.plan.status,
      mutations: [],
      postInstall: {
        installFailed: false,
        injectionFailed: false,
        manualExtensionInstallNeeded: false,
        nextSteps: manualPlanSteps(input.plan),
      },
    }
  }

  const mutations: Mutation[] = []
  const settingsDir = path.join(input.projectRoot, '.inspecto')
  const settingsFileName = input.options.shared ? 'settings.json' : 'settings.local.json'
  const promptsFileName = input.options.shared ? 'prompts.json' : 'prompts.local.json'
  const settingsPath = path.join(settingsDir, settingsFileName)
  const promptsPath = path.join(settingsDir, promptsFileName)
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
      reporter.hint(`Run manually in ${input.projectRoot}: ${installCmd}`)
      reporter.hint(
        'Setup will continue without dependencies, but Inspecto may not run until installation succeeds.',
      )
    }
  }

  let injectionFailed = Boolean(input.injectionSkippedRequiresManualConfig)
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

  if (await exists(settingsPath)) {
    const existingSettings = await readJSON(settingsPath)
    if (existingSettings === null) {
      reporter.warn(`.inspecto/${settingsFileName} exists but contains invalid JSON`)
      reporter.hint('Please fix the syntax errors manually, or delete it and re-run init')
      nextSteps.push(`Fix .inspecto/${settingsFileName} or delete it and rerun Inspecto setup.`)
    } else {
      reporter.success(`.inspecto/${settingsFileName} already exists (skipped)`)
    }
  } else {
    const defaultSettings: Record<string, unknown> = {}

    if (input.selectedIDE?.supported) {
      defaultSettings.ide =
        input.selectedIDE.ide.toLowerCase() === 'vscode'
          ? 'vscode'
          : input.selectedIDE.ide.toLowerCase()
    }

    if (input.providerDefault) {
      defaultSettings['provider.default'] = input.providerDefault
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
