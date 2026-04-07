// ============================================================
// src/commands/init.ts — Main init orchestrator (v1)
//
// v1 scope:
//   - IDE: VS Code only
//   - Framework: React / Vue
//   - Build tools: Vite / Webpack / Rspack / esbuild / Rollup
// ============================================================
import path from 'node:path'
import { log } from '../utils/logger.js'
import { exists } from '../utils/fs.js'
import { detectPackageManager } from '../detect/package-manager.js'
import { detectBuildTools, resolveInjectionTarget } from '../detect/build-tool.js'
import { detectFrameworks } from '../detect/framework.js'
import { detectIDE } from '../detect/ide.js'
import { detectProviders, type ProviderDetection } from '../detect/provider.js'
import { applyOnboardingPlan } from '../onboarding/apply.js'
import type { InitOptions, Mutation, BuildToolDetection } from '../types.js'
import { resolveOnboardingTarget } from '../onboarding/target-resolution.js'
import {
  promptIDEChoice,
  promptProviderChoice,
  promptConfigChoice,
  promptMonorepoPackageChoice,
  promptUnsupportedFrameworkContinue,
} from '../prompts.js'
import { printNextJsManualInstructions, printNuxtManualInstructions } from '../instructions.js'

export async function init(options: InitOptions): Promise<void> {
  const repoRoot = process.cwd()
  let projectRoot = repoRoot
  const mutations: Mutation[] = []
  const normalizedPackages = normalizePackageList(options.packages)

  const verifiedPackages: string[] = []
  for (const pkg of normalizedPackages) {
    if (!pkg) {
      // Empty string represents the workspace root
      verifiedPackages.push(pkg)
      continue
    }

    const absolutePath = path.join(repoRoot, pkg)
    if (await exists(absolutePath)) {
      verifiedPackages.push(pkg)
    } else {
      log.warn(`Package path "${pkg}" not found (skipping)`)
      log.hint('Ensure --packages values are relative to the project root')
    }
  }

  if (normalizedPackages.length > 0 && verifiedPackages.length === 0) {
    log.error('No valid packages found from --packages input')
    return
  }

  log.header('Inspecto Setup')

  // ---- Step 1: Validate project ----
  if (!(await exists(path.join(repoRoot, 'package.json')))) {
    log.error('No package.json found in current directory')
    log.hint('Run this command from your project root')
    return
  }

  // ---- Step 2: Detect environment ----
  const pm = await detectPackageManager(repoRoot)
  let buildResult = await detectBuildTools(
    repoRoot,
    verifiedPackages.length > 0 ? verifiedPackages : undefined,
  )

  if (verifiedPackages.length === 0) {
    const monorepoCandidates = buildResult.supported.filter(detection => !!detection.packagePath)
    if (monorepoCandidates.length > 0) {
      const frameworkSupportByPackage = await detectFrameworkSupportByPackage(
        repoRoot,
        monorepoCandidates,
      )
      const targetResolution = resolveOnboardingTarget({
        repoRoot,
        buildTools: monorepoCandidates,
        frameworkSupportByPackage,
      })

      if (targetResolution.status === 'needs_selection') {
        log.warn('Monorepo root detected with multiple candidate apps.')
        const selectedPackage = await promptMonorepoPackageChoice(
          monorepoCandidates.filter(detection =>
            targetResolution.candidates.some(
              candidate => candidate.packagePath === (detection.packagePath ?? ''),
            ),
          ),
        )
        if (!selectedPackage) {
          log.hint('Run `inspecto init` inside the target app, or pass --packages <app-path>.')
          return
        }

        projectRoot = path.join(repoRoot, selectedPackage)
        buildResult = await detectBuildTools(repoRoot, [selectedPackage])
        log.info(`Continuing initialization in ${selectedPackage}`)
      } else if (targetResolution.selected?.packagePath) {
        const selectedPackage = targetResolution.selected.packagePath
        projectRoot = path.join(repoRoot, selectedPackage)
        buildResult = await detectBuildTools(repoRoot, [selectedPackage])
        log.warn(`Monorepo root detected. Using the only candidate app: ${selectedPackage}`)
        log.hint('Run `inspecto init` inside that app next time to skip this prompt.')
      }
    }
  }

  const [frameworkResult, ideProbe, providerProbe] = await Promise.all([
    detectFrameworks(projectRoot),
    detectIDE(projectRoot),
    detectProviders(projectRoot),
  ])

  // Package manager
  log.success(`Detected package manager: ${pm}`)

  // Framework verification
  if (frameworkResult.supported.length > 0) {
    const frameworks = frameworkResult.supported.join(', ')
    log.success(`Detected framework: ${frameworks}`)
    if (frameworkResult.unsupported.length > 0) {
      log.hint(
        `Other frameworks detected (${frameworkResult.unsupported
          .map(f => f.name)
          .join(', ')}) will be skipped in this setup.`,
      )
    }
  }

  const isSupported = frameworkResult.supported.length > 0
  const hasUnsupported = frameworkResult.unsupported.length > 0

  if (!isSupported) {
    if (hasUnsupported) {
      const names = frameworkResult.unsupported.map(f => f.name).join(', ')
      log.warn(`Detected ${names} — not supported in v1 (React / Vue only)`)
    } else {
      log.warn('No frontend framework detected')
      log.hint('Inspecto current version supports React and Vue projects')
    }

    if (!options.force) {
      const shouldContinue = await promptUnsupportedFrameworkContinue()
      if (!shouldContinue) {
        log.warn('Initialization aborted.')
        return
      }
    } else {
      log.warn('Continuing anyway (--force)')
    }
  } else if (hasUnsupported) {
    const names = frameworkResult.unsupported.map(f => f.name).join(', ')
    log.hint(
      `Note: Inspecto will be configured for ${frameworkResult.supported.join(', ')}. Other detected frameworks (${names}) will be ignored.`,
    )
  }

  // Build tool detection
  let manualConfigRequiredFor = ''
  if (verifiedPackages.length > 0 && buildResult.supported.length === 0) {
    log.warn(
      `No supported build configs detected for: ${verifiedPackages.map(pkg => (pkg ? pkg : '.')).join(', ')}`,
    )
    log.hint('Double-check the --packages values or run without the flag to scan the repo root')
  }

  if (buildResult.supported.length > 0) {
    buildResult.supported.forEach(bt => log.success(`Detected: ${bt.label}`))
  }
  if (buildResult.unsupported.length > 0) {
    const names = buildResult.unsupported.join(', ')
    manualConfigRequiredFor = buildResult.unsupported[0] || ''
    log.warn(`Detected ${names} — automatic plugin injection is not supported in current version`)
    log.hint('You can still manually configure it by modifying your configuration file')

    if (buildResult.unsupported.includes('Next.js')) {
      printNextJsManualInstructions()
    }
    if (buildResult.unsupported.includes('Nuxt')) {
      printNuxtManualInstructions()
    }
  }
  if (buildResult.supported.length === 0 && buildResult.unsupported.length === 0) {
    log.warn('No recognized build tool detected')
    log.hint('current version supports: Vite, Webpack, Rspack, esbuild, Rollup')
    log.hint('Dependency will be installed but plugin injection will be skipped')
    log.hint(
      'Please refer to the manual setup guide: https://inspecto-dev.github.io/inspecto/guide/manual-installation',
    )
  }

  // IDE detection
  let selectedIDE: { ide: string; supported: boolean } | null = null

  if (ideProbe.detected.length === 0) {
    log.error('No IDE detected in current project')
    log.hint('Please open this project in a supported IDE (like VS Code)')
  } else if (ideProbe.detected.length === 1) {
    selectedIDE = ideProbe.detected[0]!
  } else {
    selectedIDE = await promptIDEChoice(ideProbe.detected)
  }

  if (selectedIDE) {
    if (selectedIDE.supported) {
      log.success(`Selected IDE: ${selectedIDE.ide}`)
    } else {
      log.warn(`Selected IDE: ${selectedIDE.ide}`)
      log.hint(
        `Note: Inspecto currently requires VS Code (or compatible forks) to function properly.`,
      )
      log.hint(`Features may be severely limited or unavailable in ${selectedIDE.ide}.`)
    }
  }

  // AI Tool detection
  let selectedProvider: ProviderDetection | null = null
  const explicitProvider = options.provider
    ? (providerProbe.detected.find(provider => provider.id === options.provider) ?? null)
    : null

  if (!options.provider) {
    if (providerProbe.detected.length === 0) {
      log.warn('No supported AI tools detected')
      log.hint('Inspecto works best with Claude Code, Trae CLI, or GitHub Copilot')
    } else if (providerProbe.detected.length === 1) {
      selectedProvider = providerProbe.detected[0]!
      if (selectedProvider.supported) {
        log.success(`Detected AI tool: ${selectedProvider.label}`)
      }
    } else {
      log.info('Multiple providers detected, waiting for your selection...')
      selectedProvider = await promptProviderChoice(providerProbe.detected)
      if (selectedProvider) {
        log.success(`Selected provider: ${selectedProvider.label}`)
      } else {
        log.warn('No provider selected. You can set provider.default later in .inspecto/settings.')
      }
    }
  }

  // ---- Step 3: Resolve injection targets ----
  let injectionSkippedRequiresManualConfig = false
  const supportedBuildTargets: BuildToolDetection[] = []
  if (buildResult.supported.length > 0) {
    if (verifiedPackages.length > 0) {
      const targets = buildResult.supported.filter(detection =>
        matchesAnyPackage(detection, verifiedPackages),
      )

      const unmatchedPackages = verifiedPackages.filter(
        pkg => !buildResult.supported.some(detection => matchesPackage(detection, pkg)),
      )

      if (unmatchedPackages.length > 0) {
        log.warn(
          `No supported build configs detected for: ${unmatchedPackages
            .map(pkg => (pkg ? pkg : '.'))
            .join(', ')}`,
        )
        log.hint('Check the package paths or run without --packages to inspect the repo root')
      }

      if (targets.length === 0) {
        injectionSkippedRequiresManualConfig = true
      }

      supportedBuildTargets.push(...targets)
    } else {
      let target = resolveInjectionTarget(buildResult.supported)

      if (target === 'ambiguous') {
        target = await promptConfigChoice(buildResult.supported)
      }

      if (target) {
        supportedBuildTargets.push(target)
      } else {
        injectionSkippedRequiresManualConfig = true
        log.warn('Skipping plugin injection (manual configuration required)')
      }
    }
  }

  const providerDefault = options.provider
    ? `${options.provider}.${explicitProvider?.preferredMode ?? (options.provider === 'coco' ? 'cli' : 'extension')}`
    : selectedProvider
      ? `${selectedProvider.id}.${selectedProvider.preferredMode === 'cli' ? 'cli' : 'extension'}`
      : undefined

  const applyResult = await applyOnboardingPlan({
    repoRoot,
    projectRoot,
    packageManager: pm,
    supportedBuildTargets,
    options: {
      shared: options.shared,
      skipInstall: options.skipInstall,
      dryRun: options.dryRun,
      noExtension: options.noExtension,
    },
    selectedIDE,
    providerDefault,
    manualConfigRequiredFor,
    injectionSkippedRequiresManualConfig,
    allowManualPlanApply: true,
  })
  mutations.push(...applyResult.mutations)

  // ---- Done ----
  if (options.dryRun) {
    log.blank()
    log.warn('Dry run complete. No files were modified.')
  } else {
    log.blank()
    if (applyResult.postInstall.nextSteps.length > 0) {
      log.warn('──────── Manual Steps Required ────────')
      applyResult.postInstall.nextSteps.forEach(step => log.error(step))
      log.hint('Complete the items above.')
      log.blank()
    } else {
      log.ready('Ready! Inspecto is set up.')
      log.info('Next:')
      log.hint('1. Start or restart your dev server.')
      log.hint('2. Open your app in the browser.')
      log.hint('3. Hold Alt + Click any element to inspect.')
    }
  }
}

function normalizePackageList(packages?: string[]): string[] {
  if (!packages || packages.length === 0) return []

  const normalized = packages
    .map(pkg => {
      const trimmed = pkg.trim()
      if (trimmed === '') return null
      if (trimmed === '.' || trimmed === './') return ''

      return trimmed.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '')
    })
    .filter((value): value is string => value !== null)

  return Array.from(new Set(normalized))
}

function matchesPackage(detection: BuildToolDetection, pkg: string): boolean {
  const configPath = detection.configPath.replace(/\\/g, '/')
  if (!pkg) {
    return !configPath.includes('/')
  }

  return configPath === pkg || configPath.startsWith(`${pkg}/`)
}

function matchesAnyPackage(detection: BuildToolDetection, packages: string[]): boolean {
  if (packages.length === 0) return true
  return packages.some(pkg => matchesPackage(detection, pkg))
}

async function detectFrameworkSupportByPackage(
  repoRoot: string,
  buildTools: BuildToolDetection[],
): Promise<Record<string, string[]>> {
  const packagePaths = Array.from(
    new Set(
      buildTools
        .map(buildTool => buildTool.packagePath)
        .filter((value): value is string => !!value),
    ),
  )
  const supportByPackage: Record<string, string[]> = {}

  await Promise.all(
    packagePaths.map(async packagePath => {
      const result = await detectFrameworks(path.join(repoRoot, packagePath))
      supportByPackage[packagePath] = result.supported
    }),
  )

  return supportByPackage
}
