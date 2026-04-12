import path from 'node:path'
import { detectFrameworks } from '../detect/framework.js'
import { detectIDE } from '../detect/ide.js'
import { detectProviders } from '../detect/provider.js'
import {
  getHostIdeBinaryName,
  isSupportedHostIde,
  type SupportedHostIde,
} from '../integrations/capabilities.js'
import { applyOnboardingPlan, type ApplyOnboardingResult } from './apply.js'
import { buildOnboardingContext } from './context.js'
import { createPlanResult, planManualFollowUp } from './planner.js'
import { resolveOnboardingTarget } from './target-resolution.js'
import { readJSON } from '../utils/fs.js'
import type {
  OnboardCommandResult,
  OnboardingContext,
  OnboardingDiagnostics,
  OnboardingExecutionResult,
  OnboardingIdeExtensionStatus,
  OnboardingSummary,
  OnboardingVerification,
  PlanResult,
  ResolvedOnboardingSession,
} from '../types.js'

export interface ResolveOnboardingSessionOptions {
  json?: boolean
  target?: string
  yes?: boolean
  shared?: boolean
  skipInstall?: boolean
  dryRun?: boolean
  noExtension?: boolean
}

function normalizePackagePath(packagePath?: string): string {
  if (!packagePath || packagePath === '.') return ''
  return packagePath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '')
}

function getProviderDefault(
  providerId?: string,
  preferredMode?: 'cli' | 'extension',
): string | undefined {
  if (!providerId) return undefined
  const mode = preferredMode ?? (providerId === 'coco' ? 'cli' : 'extension')
  return `${providerId}.${mode}`
}

function getVerificationCommand(packageManager: OnboardingContext['packageManager']): string {
  switch (packageManager) {
    case 'pnpm':
      return 'pnpm dev'
    case 'yarn':
      return 'yarn dev'
    case 'bun':
      return 'bun run dev'
    case 'npm':
    default:
      return 'npm run dev'
  }
}

async function buildVerification(
  projectRoot: string,
  packageManager: OnboardingContext['packageManager'],
): Promise<OnboardingVerification> {
  const packageJson = await readJSON<{
    scripts?: Record<string, string>
    dependencies?: Record<string, string>
  }>(path.join(projectRoot, 'package.json'))

  if (packageJson?.scripts?.dev) {
    const devCommand = getVerificationCommand(packageManager)
    return {
      available: true,
      devCommand,
      message: `Start the local dev server with \`${devCommand}\` to verify Inspecto in the browser.`,
    }
  }

  if (packageJson?.scripts?.start && packageJson?.dependencies?.next) {
    const devCommand = packageManager === 'bun' ? 'bunx next dev' : 'npx next dev'
    return {
      available: true,
      devCommand,
      message: `Start the local dev server with \`${devCommand}\` to verify Inspecto in the browser.`,
    }
  }

  return {
    available: false,
    message: 'Start your normal local dev server command to verify Inspecto in the browser.',
  }
}

function buildExtensionInstallCommand(ide?: string): string {
  if (ide && isSupportedHostIde(ide)) {
    const binaryName = getHostIdeBinaryName(ide as SupportedHostIde)
    if (binaryName) {
      return `${binaryName} --install-extension inspecto.inspecto`
    }
  }

  return 'code --install-extension inspecto.inspecto'
}

function buildIdeExtensionStatus(input: {
  ide?: string
  required: boolean
  installed: boolean
  manualRequired: boolean
}): OnboardingIdeExtensionStatus {
  if (!input.required) {
    return {
      required: false,
      installed: false,
      manualRequired: false,
    }
  }

  return {
    required: true,
    installed: input.installed,
    manualRequired: input.manualRequired,
    installCommand: buildExtensionInstallCommand(input.ide),
    ...(input.ide === 'vscode'
      ? {
          marketplaceUrl: 'https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto',
        }
      : {}),
    openVsxUrl: 'https://open-vsx.org/extension/inspecto/inspecto',
  }
}

async function detectFrameworkSupportByPackage(
  repoRoot: string,
  context: OnboardingContext,
): Promise<Record<string, string[]>> {
  const packagePaths = new Set(
    context.buildTools.supported.map(item => normalizePackagePath(item.packagePath)),
  )
  const supportByPackage: Record<string, string[]> = {}

  await Promise.all(
    Array.from(packagePaths).map(async packagePath => {
      const frameworkResult = await detectFrameworks(
        packagePath ? path.join(repoRoot, packagePath) : repoRoot,
      )
      supportByPackage[packagePath] = frameworkResult.supported
    }),
  )

  return supportByPackage
}

async function buildTargetedContext(
  rootContext: OnboardingContext,
  target: { id?: string; packagePath: string },
): Promise<OnboardingContext> {
  const packagePath = normalizePackagePath(target.packagePath)
  const projectRoot = packagePath ? path.join(rootContext.root, packagePath) : rootContext.root
  const [frameworks, ides, providers] = await Promise.all([
    detectFrameworks(projectRoot),
    detectIDE(projectRoot),
    detectProviders(projectRoot),
  ])

  return {
    root: projectRoot,
    packageManager: rootContext.packageManager,
    buildTools: {
      supported: rootContext.buildTools.supported.filter(item => {
        const itemPackagePath = normalizePackagePath(item.packagePath)
        if (target.id) {
          return `${itemPackagePath || '.'}:${item.tool}:${item.configPath}` === target.id
        }
        return itemPackagePath === packagePath
      }),
      unsupported: [],
    },
    frameworks: {
      supported: frameworks.supported,
      unsupported: frameworks.unsupported.map(item => item.name),
    },
    ides: ides.detected.map(({ ide, supported }) => ({ ide, supported })),
    providers: providers.detected.map(({ id, label, supported, preferredMode }) => ({
      id,
      label,
      supported,
      preferredMode,
    })),
  }
}

function buildOnboardingSummary(plan: PlanResult, projectRoot: string): OnboardingSummary {
  const changes = plan.actions
    .filter(
      action =>
        !['manual_step', 'generate_patch_plan', 'generate_file', 'manual_confirmation'].includes(
          action.type,
        ),
    )
    .map(action => action.description)
  const risks = [...plan.warnings.map(item => item.message)]
  const manualFollowUp = planManualFollowUp(plan)

  let headline = `Inspecto is ready to onboard ${projectRoot}.`
  if (manualFollowUp.length > 0) {
    headline = `Inspecto can partially onboard ${projectRoot}, but manual follow-up remains.`
  } else if (plan.status === 'blocked') {
    headline = `Inspecto could not build an automatic onboarding path for ${projectRoot}.`
  }

  return {
    headline,
    changes,
    risks,
    manualFollowUp,
  }
}

function buildConfirmation(
  plan: PlanResult,
  summary: OnboardingSummary,
  session: {
    targetWasHeuristic: boolean
    supportedIdeCount: number
    supportedProviderCount: number
  },
  options: ResolveOnboardingSessionOptions,
): { required: boolean; reason?: string; question?: string } {
  if (options.yes) {
    return { required: false }
  }

  const reasons: string[] = []
  if (session.targetWasHeuristic) reasons.push('a monorepo target was preselected')
  if (summary.manualFollowUp.length > 0) reasons.push('manual follow-up will remain after setup')
  if (options.noExtension || options.skipInstall)
    reasons.push('non-core setup steps are being skipped')
  if (session.supportedIdeCount > 1 || session.supportedProviderCount > 1) {
    reasons.push('multiple IDE or provider choices are still relevant')
  }
  if (plan.warnings.length > 0) reasons.push('the CLI detected non-blocking risk')

  if (reasons.length === 0) {
    return { required: false }
  }

  return {
    required: true,
    reason: reasons.join('; '),
    question: 'Proceed with Inspecto onboarding using the proposed default target and settings?',
  }
}

function buildPreApplyResult(
  status: ResolvedOnboardingSession['status'],
  session: ResolvedOnboardingSession,
): OnboardCommandResult {
  const diagnostics: OnboardingDiagnostics | undefined =
    session.summary.risks.length > 0 ||
    session.summary.manualFollowUp.length > 0 ||
    session.plan.blockers.length > 0
      ? {
          warnings: session.summary.risks,
          errors: session.plan.blockers.map(item => item.message),
          nextSteps: session.summary.manualFollowUp,
        }
      : undefined

  const ideExtension = buildIdeExtensionStatus({
    ...(session.selectedIDE?.ide ? { ide: session.selectedIDE.ide } : {}),
    required: session.plan.defaults.extension,
    installed: false,
    manualRequired: session.plan.defaults.extension,
  })

  return {
    status,
    target: session.target,
    summary: session.summary,
    confirmation: session.confirmation,
    ideExtension,
    verification: session.verification,
    ...(session.framework ? { framework: session.framework } : {}),
    ...(session.metaFramework ? { metaFramework: session.metaFramework } : {}),
    ...(session.routerMode ? { routerMode: session.routerMode } : {}),
    ...(session.autoApplied ? { autoApplied: session.autoApplied } : {}),
    ...(session.pendingSteps ? { pendingSteps: session.pendingSteps } : {}),
    ...(session.assistantPrompt ? { assistantPrompt: session.assistantPrompt } : {}),
    ...(session.patches ? { patches: session.patches } : {}),
    ...(diagnostics ? { diagnostics } : {}),
  }
}

function buildExecutionResult(
  session: ResolvedOnboardingSession,
  applyResult: ApplyOnboardingResult,
): OnboardingExecutionResult {
  return {
    changedFiles: Array.from(
      new Set(
        applyResult.mutations.map(item => item.path).filter((value): value is string => !!value),
      ),
    ),
    installedDependencies: applyResult.mutations
      .map(item => item.name)
      .filter((value): value is string => !!value),
    ...(session.providerDefault ? { selectedProviderDefault: session.providerDefault } : {}),
    ...(session.selectedIDE?.ide ? { selectedIDE: session.selectedIDE.ide } : {}),
    mutations: applyResult.mutations,
  }
}

function buildExecutionDiagnostics(
  session: ResolvedOnboardingSession,
  applyResult: ApplyOnboardingResult,
): OnboardingDiagnostics | undefined {
  const warnings = [...session.plan.warnings.map(item => item.message)]
  const errors: string[] = []

  if (applyResult.postInstall.installFailed) {
    errors.push('Dependency installation failed during onboarding.')
  }
  if (applyResult.postInstall.injectionFailed) {
    warnings.push('Automatic plugin injection did not finish cleanly.')
  }
  if (applyResult.postInstall.manualExtensionInstallNeeded) {
    warnings.push('IDE extension installation still needs manual completion.')
  }

  if (
    warnings.length === 0 &&
    errors.length === 0 &&
    applyResult.postInstall.nextSteps.length === 0
  ) {
    return undefined
  }

  return {
    warnings,
    errors,
    nextSteps: applyResult.postInstall.nextSteps,
  }
}

export async function resolveOnboardingSession(
  root: string,
  options: ResolveOnboardingSessionOptions = {},
): Promise<ResolvedOnboardingSession> {
  const rootContext = await buildOnboardingContext(root)
  const rootVerification = await buildVerification(root, rootContext.packageManager)
  const frameworkSupportByPackage = await detectFrameworkSupportByPackage(root, rootContext)
  const target = resolveOnboardingTarget({
    repoRoot: root,
    buildTools: rootContext.buildTools.supported,
    frameworkSupportByPackage,
    ...(options.target ? { selectedPackagePath: options.target } : {}),
  })

  if (target.candidates.length === 0) {
    const plan = createPlanResult(rootContext)
    const guidedStatus = plan.strategy === 'guided' ? 'partial_success' : 'error'
    const resolvedTarget =
      plan.strategy === 'guided'
        ? {
            status: 'guided' as const,
            candidates: [],
            reason: `Guided onboarding is available for ${plan.metaFramework ?? 'this project'}.`,
          }
        : target
    return {
      status: guidedStatus,
      target: resolvedTarget,
      summary: buildOnboardingSummary(plan, root),
      confirmation: { required: false },
      verification: rootVerification,
      context: rootContext,
      plan,
      projectRoot: root,
      ...(plan.framework ? { framework: plan.framework } : {}),
      ...(plan.metaFramework ? { metaFramework: plan.metaFramework } : {}),
      ...(plan.routerMode ? { routerMode: plan.routerMode } : {}),
      ...(plan.autoApplied ? { autoApplied: plan.autoApplied } : {}),
      ...(plan.pendingSteps ? { pendingSteps: plan.pendingSteps } : {}),
      ...(plan.assistantPrompt ? { assistantPrompt: plan.assistantPrompt } : {}),
      ...(plan.patches ? { patches: plan.patches } : {}),
    }
  }

  if (target.status === 'needs_selection') {
    const plan = createPlanResult(rootContext)
    const summary: OnboardingSummary = {
      headline:
        'Inspecto needs one build target selection before setup so it knows which local dev build should receive the plugin and settings.',
      changes: [],
      risks: [],
      manualFollowUp: [],
    }
    return {
      status: 'needs_target_selection',
      target,
      summary,
      confirmation: { required: false },
      verification: rootVerification,
      context: rootContext,
      plan,
      projectRoot: root,
    }
  }

  const context = await buildTargetedContext(rootContext, target.selected!)
  const verification = await buildVerification(context.root, context.packageManager)
  const plan = createPlanResult(context)
  const summary = buildOnboardingSummary(plan, context.root)
  const confirmation = buildConfirmation(
    plan,
    summary,
    {
      targetWasHeuristic: target.candidates.length > 1 && options.target === undefined,
      supportedIdeCount: context.ides.filter(item => item.supported).length,
      supportedProviderCount: context.providers.filter(item => item.supported).length,
    },
    options,
  )
  const selectedProvider =
    context.providers.find(provider => provider.id === plan.defaults.provider) ?? null
  const selectedIDE =
    context.ides.find(ide => ide.ide === plan.defaults.ide) ??
    context.ides.find(ide => ide.supported) ??
    null

  let status: ResolvedOnboardingSession['status'] = 'success'
  if (plan.status === 'blocked') {
    status = 'error'
  } else if (confirmation.required) {
    status = 'needs_confirmation'
  } else if (summary.manualFollowUp.length > 0 || plan.warnings.length > 0) {
    status = 'partial_success'
  }

  const providerDefault = getProviderDefault(
    plan.defaults.provider,
    selectedProvider?.preferredMode,
  )

  return {
    status,
    target,
    summary,
    confirmation,
    verification,
    context,
    plan,
    projectRoot: context.root,
    selectedIDE,
    ...(providerDefault ? { providerDefault } : {}),
    ...(plan.framework ? { framework: plan.framework } : {}),
    ...(plan.metaFramework ? { metaFramework: plan.metaFramework } : {}),
    ...(plan.routerMode ? { routerMode: plan.routerMode } : {}),
    ...(plan.autoApplied ? { autoApplied: plan.autoApplied } : {}),
    ...(plan.pendingSteps ? { pendingSteps: plan.pendingSteps } : {}),
    ...(plan.assistantPrompt ? { assistantPrompt: plan.assistantPrompt } : {}),
    ...(plan.patches ? { patches: plan.patches } : {}),
  }
}

export async function applyResolvedOnboardingSession(
  session: ResolvedOnboardingSession,
  options: ResolveOnboardingSessionOptions = {},
): Promise<OnboardCommandResult> {
  const verification = await buildVerification(session.projectRoot, session.context.packageManager)
  const applyResult = await applyOnboardingPlan({
    repoRoot: process.cwd(),
    projectRoot: session.projectRoot,
    packageManager: session.context.packageManager,
    supportedBuildTargets: session.context.buildTools.supported,
    options: {
      shared: options.shared ?? session.plan.defaults.shared,
      skipInstall: options.skipInstall ?? false,
      dryRun: options.dryRun ?? false,
      noExtension: options.noExtension ?? !session.plan.defaults.extension,
      quiet: options.json ?? false,
    },
    selectedIDE: session.selectedIDE,
    providerDefault: session.providerDefault,
    plan: session.plan,
    allowManualPlanApply:
      (session.plan.strategy === 'manual' || session.plan.strategy === 'guided') &&
      session.plan.blockers.length === 0,
  })

  const diagnostics = buildExecutionDiagnostics(session, applyResult)
  const status =
    applyResult.postInstall.installFailed && session.context.buildTools.supported.length === 0
      ? 'error'
      : diagnostics?.nextSteps.length || diagnostics?.errors.length || diagnostics?.warnings.length
        ? 'partial_success'
        : 'success'

  const ideExtension = buildIdeExtensionStatus({
    ...(session.selectedIDE?.ide ? { ide: session.selectedIDE.ide } : {}),
    required: session.plan.defaults.extension,
    installed:
      session.plan.defaults.extension && !applyResult.postInstall.manualExtensionInstallNeeded,
    manualRequired: applyResult.postInstall.manualExtensionInstallNeeded,
  })

  return {
    status,
    target: session.target,
    summary: session.summary,
    confirmation: session.confirmation,
    ideExtension,
    verification,
    result: buildExecutionResult(session, applyResult),
    ...(session.framework ? { framework: session.framework } : {}),
    ...(session.metaFramework ? { metaFramework: session.metaFramework } : {}),
    ...(session.routerMode ? { routerMode: session.routerMode } : {}),
    ...(session.autoApplied ? { autoApplied: session.autoApplied } : {}),
    ...(session.pendingSteps ? { pendingSteps: session.pendingSteps } : {}),
    ...(session.assistantPrompt ? { assistantPrompt: session.assistantPrompt } : {}),
    ...(session.patches ? { patches: session.patches } : {}),
    ...(diagnostics ? { diagnostics } : {}),
  }
}

export function buildDeferredOnboardResult(
  session: ResolvedOnboardingSession,
): OnboardCommandResult {
  return buildPreApplyResult(session.status, session)
}
