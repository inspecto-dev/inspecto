import {
  resolveOnboardingSession,
  applyResolvedOnboardingSession,
  buildDeferredOnboardResult,
} from '../onboarding/session.js'
import { log } from '../utils/logger.js'
import { writeCommandOutput } from '../utils/output.js'
import type { OnboardCommandResult, OnboardingAssistantHandoff } from '../types.js'

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

function buildAssistantHandoff(
  result: OnboardCommandResult,
): OnboardingAssistantHandoff | undefined {
  if (
    !result.framework &&
    !result.metaFramework &&
    !result.routerMode &&
    !result.autoApplied &&
    !result.pendingSteps &&
    !result.assistantPrompt &&
    !result.patches
  ) {
    return result.handoff
  }

  return {
    ...(result.framework ? { framework: result.framework } : {}),
    ...(result.metaFramework ? { metaFramework: result.metaFramework } : {}),
    ...(result.routerMode ? { routerMode: result.routerMode } : {}),
    ...(result.autoApplied ? { autoApplied: result.autoApplied } : {}),
    ...(result.pendingSteps ? { pendingSteps: result.pendingSteps } : {}),
    ...(result.assistantPrompt ? { assistantPrompt: result.assistantPrompt } : {}),
    ...(result.patches ? { patches: result.patches } : {}),
  }
}

function normalizeOnboardResult(result: OnboardCommandResult): OnboardCommandResult {
  const handoff = buildAssistantHandoff(result)
  if (!handoff) {
    return result
  }

  return {
    ...result,
    handoff,
  }
}

function collectDisplayNextSteps(result: OnboardCommandResult): string[] {
  return Array.from(
    new Set([...(result.diagnostics?.nextSteps ?? []), ...(result.handoff?.pendingSteps ?? [])]),
  )
}

function printOnboardResult(result: OnboardCommandResult): void {
  const normalized = normalizeOnboardResult(result)
  log.header('Inspecto Onboard')
  log.info(`Status: ${normalized.status}`)
  log.info(normalized.summary.headline)

  if (normalized.status === 'needs_target_selection') {
    if (normalized.target.selectionPurpose) {
      log.warn(normalized.target.selectionPurpose)
    }
    for (const candidate of normalized.target.candidates) {
      const identifier = candidate.candidateId ?? candidate.id ?? candidate.configPath
      const label = candidate.label ?? candidate.configPath
      log.hint(`${identifier}: ${label}`)
    }
    if (normalized.target.selectionInstructions) {
      log.hint(normalized.target.selectionInstructions)
    }
  }

  for (const change of normalized.summary.changes) {
    log.hint(change)
  }
  for (const step of collectDisplayNextSteps(normalized)) {
    log.warn(step)
  }
  for (const patch of normalized.handoff?.patches ?? []) {
    log.hint(`Patch target: ${patch.path} (${patch.reason})`)
  }
  if (normalized.handoff?.assistantPrompt) {
    log.hint(normalized.handoff.assistantPrompt)
  }
  if (normalized.confirmation.required && normalized.confirmation.question) {
    log.warn(normalized.confirmation.question)
  }

  printManualExtensionGuidance(normalized)

  const extensionReady =
    !normalized.ideExtension?.required ||
    (normalized.ideExtension.installed && !normalized.ideExtension.manualRequired)

  if (
    extensionReady &&
    (normalized.status === 'success' || normalized.status === 'partial_success') &&
    normalized.verification?.message
  ) {
    log.info(normalized.verification.message)
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
      normalizeOnboardResult(buildDeferredOnboardResult(session)),
      options.json ?? false,
      printOnboardResult,
    )
  }

  const result = normalizeOnboardResult(await applyResolvedOnboardingSession(session, options))
  return writeCommandOutput(result, options.json ?? false, printOnboardResult)
}
