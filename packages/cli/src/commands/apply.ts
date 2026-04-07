import { applyOnboardingPlan, type ApplyOnboardingResult } from '../onboarding/apply.js'
import { buildOnboardingContext } from '../onboarding/context.js'
import { createPlanResult } from '../onboarding/planner.js'
import { log } from '../utils/logger.js'
import { writeCommandOutput } from '../utils/output.js'
import type { PlanResult } from '../types.js'

export interface ApplyCommandOptions {
  json?: boolean
  shared?: boolean
  skipInstall?: boolean
  dryRun?: boolean
  noExtension?: boolean
}

export interface ApplyCommandResult extends ApplyOnboardingResult {
  plan: PlanResult
}

function getProviderDefault(
  providerId?: string,
  preferredMode?: 'cli' | 'extension',
): string | undefined {
  if (!providerId) return undefined
  const mode = preferredMode ?? (providerId === 'coco' ? 'cli' : 'extension')
  return `${providerId}.${mode}`
}

function statusRank(status: ApplyCommandResult['status']): number {
  switch (status) {
    case 'error':
      return 3
    case 'blocked':
      return 2
    case 'warning':
      return 1
    case 'ok':
    default:
      return 0
  }
}

function mergeStatus(
  planStatus: PlanResult['status'],
  applyStatus: ApplyOnboardingResult['status'],
): ApplyCommandResult['status'] {
  return statusRank(planStatus) >= statusRank(applyStatus) ? planStatus : applyStatus
}

function printApplyResult(result: ApplyCommandResult): void {
  const manualSteps = result.postInstall.nextSteps.filter(
    step => !result.plan.blockers.some(blocker => blocker.message === step),
  )

  log.header('Inspecto Apply')
  log.info(`Status: ${result.status}`)
  log.info(`Strategy: ${result.plan.strategy}`)

  for (const blocker of result.plan.blockers) {
    log.error(blocker.message)
  }
  for (const warning of result.plan.warnings) {
    log.warn(warning.message)
  }

  if (manualSteps.length > 0 || result.plan.blockers.length > 0) {
    log.blank()
    log.warn('──────── Manual Steps Required ────────')
    manualSteps.forEach(step => log.error(step))
    return
  }

  if (result.plan.warnings.length > 0) {
    return
  }

  log.ready('Ready! Inspecto is set up.')
  log.info('Next:')
  log.hint('1. Start or restart your dev server.')
  log.hint('2. Open your app in the browser.')
  log.hint('3. Hold Alt + Click any element to inspect.')
}

export async function apply(options: ApplyCommandOptions = {}): Promise<ApplyCommandResult> {
  const root = process.cwd()
  const context = await buildOnboardingContext(root)
  const plan = createPlanResult(context)
  const selectedProvider =
    context.providers.find(provider => provider.id === plan.defaults.provider) ?? null
  const selectedIDE =
    context.ides.find(ide => ide.ide === plan.defaults.ide) ??
    context.ides.find(ide => ide.supported) ??
    null

  const applyResult = await applyOnboardingPlan({
    repoRoot: root,
    projectRoot: root,
    packageManager: context.packageManager,
    supportedBuildTargets: context.buildTools.supported,
    options: {
      shared: options.shared ?? plan.defaults.shared,
      skipInstall: options.skipInstall ?? false,
      dryRun: options.dryRun ?? false,
      noExtension: options.noExtension ?? !plan.defaults.extension,
      quiet: options.json ?? false,
    },
    selectedIDE,
    providerDefault: getProviderDefault(plan.defaults.provider, selectedProvider?.preferredMode),
    plan,
  })

  const result: ApplyCommandResult = {
    ...applyResult,
    status: mergeStatus(plan.status, applyResult.status),
    plan,
  }
  return writeCommandOutput(result, options.json ?? false, printApplyResult)
}
