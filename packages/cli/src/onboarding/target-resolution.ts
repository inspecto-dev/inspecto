import type {
  BuildToolDetection,
  OnboardingTargetCandidate,
  OnboardingTargetResolution,
} from '../types.js'

export interface ResolveOnboardingTargetInput {
  repoRoot: string
  buildTools: BuildToolDetection[]
  frameworkSupportByPackage: Record<string, string[]>
  selectedPackagePath?: string
}

interface RankedCandidate {
  candidate: OnboardingTargetCandidate
  score: number
}

function buildCandidateId(candidate: {
  packagePath: string
  buildTool: string
  configPath: string
}): string {
  return [candidate.packagePath || '.', candidate.buildTool, candidate.configPath].join(':')
}

function normalizePackagePath(packagePath?: string): string {
  if (!packagePath || packagePath === '.') return ''
  return packagePath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '')
}

function normalizeTargetValue(target?: string): string {
  if (!target) return ''
  return target.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '')
}

function buildSelectionPurpose(): string {
  return 'Choose the build target that runs your local development build so Inspecto can attach the right plugin and settings.'
}

function buildSelectionInstructions(hasCandidates: boolean): string {
  if (!hasCandidates) {
    return 'If auto-detection missed your build entrypoint, rerun with --target <configPath> using the config file or wrapper script your dev command actually starts.'
  }

  return 'Rerun with --target <candidateId> using one returned candidateId. The CLI also accepts an exact configPath from the candidate list as a compatibility fallback.'
}

function looksLikeAppPackage(packagePath: string): boolean {
  if (!packagePath) return true
  return /(^|\/)(app|apps|web|client|frontend|site)(\/|$)/i.test(packagePath)
}

function looksLikeAuxiliaryPackage(packagePath: string): boolean {
  return /(^|\/)(docs?|example|examples|playground|storybook|demo)(\/|$)/i.test(packagePath)
}

function buildCandidates(input: ResolveOnboardingTargetInput): OnboardingTargetCandidate[] {
  return input.buildTools.map(buildTool => {
    const packagePath = normalizePackagePath(buildTool.packagePath)
    const candidate: OnboardingTargetCandidate = {
      packagePath,
      configPath: buildTool.configPath,
      label: buildTool.label,
      buildTool: buildTool.tool,
      ...(buildTool.isLegacyRspack ? { isLegacyRspack: true } : {}),
      ...(buildTool.isLegacyWebpack ? { isLegacyWebpack: true } : {}),
      frameworks: input.frameworkSupportByPackage[packagePath] ?? [],
      automaticInjection: true,
    }
    candidate.id = buildCandidateId(candidate)
    candidate.candidateId = candidate.id
    return candidate
  })
}

function rankCandidate(candidate: OnboardingTargetCandidate): number {
  let score = 0

  if (candidate.frameworks.length > 0) score += 4
  if (candidate.automaticInjection) score += 2
  if (looksLikeAppPackage(candidate.packagePath)) score += 1
  if (looksLikeAuxiliaryPackage(candidate.packagePath)) score -= 2

  return score
}

function rankCandidates(candidates: OnboardingTargetCandidate[]): RankedCandidate[] {
  return candidates
    .map(candidate => ({
      candidate,
      score: rankCandidate(candidate),
    }))
    .sort((left, right) => right.score - left.score)
}

export function resolveOnboardingTarget(
  input: ResolveOnboardingTargetInput,
): OnboardingTargetResolution {
  const candidates = buildCandidates(input)

  if (candidates.length === 0) {
    return {
      status: 'needs_selection',
      candidates,
      reason: 'No supported targets were detected.',
      selectionPurpose: buildSelectionPurpose(),
      selectionInstructions: buildSelectionInstructions(false),
    }
  }

  const explicitlySelected = normalizePackagePath(input.selectedPackagePath)
  const explicitlySelectedValue = normalizeTargetValue(input.selectedPackagePath)
  if (input.selectedPackagePath !== undefined) {
    const selectedById = candidates.find(
      candidate =>
        candidate.id === input.selectedPackagePath ||
        candidate.candidateId === input.selectedPackagePath,
    )
    if (selectedById) {
      return {
        status: 'resolved',
        selected: selectedById,
        candidates,
        reason: `Using the explicitly selected target: ${selectedById.configPath}.`,
        selectionPurpose: buildSelectionPurpose(),
        selectionInstructions: buildSelectionInstructions(true),
      }
    }

    const selectedByConfigPath = candidates.find(
      candidate => normalizeTargetValue(candidate.configPath) === explicitlySelectedValue,
    )
    if (selectedByConfigPath) {
      return {
        status: 'resolved',
        selected: selectedByConfigPath,
        candidates,
        reason: `Using the explicitly selected config path: ${selectedByConfigPath.configPath}.`,
        selectionPurpose: buildSelectionPurpose(),
        selectionInstructions: buildSelectionInstructions(true),
      }
    }

    const matchingPackageCandidates = candidates.filter(
      candidate => candidate.packagePath === explicitlySelected,
    )
    const selected =
      matchingPackageCandidates.length === 1 ? matchingPackageCandidates[0] : undefined
    if (selected) {
      return {
        status: 'resolved',
        selected,
        candidates,
        reason: `Using the explicitly selected target: ${selected.packagePath || '.'}.`,
        selectionPurpose: buildSelectionPurpose(),
        selectionInstructions: buildSelectionInstructions(true),
      }
    }
  }

  if (candidates.length === 1) {
    return {
      status: 'resolved',
      selected: candidates[0]!,
      candidates,
      reason: 'Only one supported target was detected.',
      selectionPurpose: buildSelectionPurpose(),
      selectionInstructions: buildSelectionInstructions(true),
    }
  }

  const ranked = rankCandidates(candidates)
  if (ranked.length > 1 && ranked[0]!.score === ranked[1]!.score) {
    return {
      status: 'needs_selection',
      candidates,
      reason: 'Multiple supported targets look equally plausible.',
      selectionPurpose: buildSelectionPurpose(),
      selectionInstructions: buildSelectionInstructions(true),
    }
  }

  return {
    status: 'resolved',
    selected: ranked[0]!.candidate,
    candidates,
    reason: `Preselected ${ranked[0]!.candidate.packagePath || '.'} because it has the strongest supported app signal.`,
    selectionPurpose: buildSelectionPurpose(),
    selectionInstructions: buildSelectionInstructions(true),
  }
}
