import {
  resolveOnboardingSession,
  applyResolvedOnboardingSession,
  buildDeferredOnboardResult,
} from '../onboarding/session.js'
import { log } from '../utils/logger.js'
import { writeCommandOutput } from '../utils/output.js'
import type { OnboardCommandResult } from '../types.js'

export interface OnboardCommandOptions {
  json?: boolean
  target?: string
  yes?: boolean
  shared?: boolean
  skipInstall?: boolean
  dryRun?: boolean
  noExtension?: boolean
}

function printManualExtensionGuidance(result: OnboardCommandResult): void {
  if (!result.ideExtension?.required || !result.ideExtension.manualRequired) {
    return
  }

  log.warn('Complete the IDE extension install before verification.')
  if (result.ideExtension.installCommand) {
    log.hint(result.ideExtension.installCommand)
  }
  if (result.ideExtension.marketplaceUrl) {
    log.hint(result.ideExtension.marketplaceUrl)
  }
  if (result.ideExtension.openVsxUrl) {
    log.hint(result.ideExtension.openVsxUrl)
  }
}

function printOnboardResult(result: OnboardCommandResult): void {
  log.header('Inspecto Onboard')
  log.info(`Status: ${result.status}`)
  log.info(result.summary.headline)

  if (result.status === 'needs_target_selection') {
    if (result.target.selectionPurpose) {
      log.warn(result.target.selectionPurpose)
    }
    for (const candidate of result.target.candidates) {
      const identifier = candidate.candidateId ?? candidate.id ?? candidate.configPath
      const label = candidate.label ?? candidate.configPath
      log.hint(`${identifier}: ${label}`)
    }
    if (result.target.selectionInstructions) {
      log.hint(result.target.selectionInstructions)
    }
  }

  for (const change of result.summary.changes) {
    log.hint(change)
  }
  for (const step of result.diagnostics?.nextSteps ?? []) {
    log.warn(step)
  }
  if (result.confirmation.required && result.confirmation.question) {
    log.warn(result.confirmation.question)
  }

  printManualExtensionGuidance(result)

  const extensionReady =
    !result.ideExtension?.required ||
    (result.ideExtension.installed && !result.ideExtension.manualRequired)

  if (
    extensionReady &&
    (result.status === 'success' || result.status === 'partial_success') &&
    result.verification?.message
  ) {
    log.info(result.verification.message)
  }
}

export async function onboard(options: OnboardCommandOptions = {}): Promise<OnboardCommandResult> {
  const root = process.cwd()
  const session = await resolveOnboardingSession(root, options)

  if (
    session.status === 'error' ||
    session.status === 'needs_target_selection' ||
    session.status === 'needs_confirmation'
  ) {
    return writeCommandOutput(
      buildDeferredOnboardResult(session),
      options.json ?? false,
      printOnboardResult,
    )
  }

  const result = await applyResolvedOnboardingSession(session, options)
  return writeCommandOutput(result, options.json ?? false, printOnboardResult)
}
