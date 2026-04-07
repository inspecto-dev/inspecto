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

function normalizePackagePath(packagePath?: string): string {
  if (!packagePath || packagePath === '.') return ''
  return packagePath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '')
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
    return {
      packagePath,
      configPath: buildTool.configPath,
      buildTool: buildTool.tool,
      frameworks: input.frameworkSupportByPackage[packagePath] ?? [],
      automaticInjection: true,
    }
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
    }
  }

  const explicitlySelected = normalizePackagePath(input.selectedPackagePath)
  if (input.selectedPackagePath !== undefined) {
    const selected = candidates.find(candidate => candidate.packagePath === explicitlySelected)
    if (selected) {
      return {
        status: 'resolved',
        selected,
        candidates,
        reason: `Using the explicitly selected target: ${selected.packagePath || '.'}.`,
      }
    }
  }

  if (candidates.length === 1) {
    return {
      status: 'resolved',
      selected: candidates[0],
      candidates,
      reason: 'Only one supported target was detected.',
    }
  }

  const ranked = rankCandidates(candidates)
  if (ranked.length > 1 && ranked[0]!.score === ranked[1]!.score) {
    return {
      status: 'needs_selection',
      candidates,
      reason: 'Multiple supported targets look equally plausible.',
    }
  }

  return {
    status: 'resolved',
    selected: ranked[0]!.candidate,
    candidates,
    reason: `Preselected ${ranked[0]!.candidate.packagePath || '.'} because it has the strongest supported app signal.`,
  }
}
