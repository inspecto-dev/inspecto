import { getFirstAttribute, TEST_ID_ATTRIBUTE_NAMES } from './selectors.js'
import { uniqueDefined } from './sanitize.js'
import type { TargetEvidence, TargetFrameworkEvidence } from './types.js'
import { isLikelyGeneratedComponentName } from './framework-shared.js'
import { TARGET_EVIDENCE_BUDGET, takeEvidenceBudget } from './budget.js'

export function collectTargetSourceHints(input: {
  element: Element
  text: string | undefined
  ariaLabel: string | undefined
  classList: string[]
  framework: TargetFrameworkEvidence | undefined
}): TargetEvidence['sourceHints'] {
  return {
    likelyFileNames: takeEvidenceBudget(
      uniqueDefined([
        ...buildLikelyFileNames(input.element, input.classList),
        ...(input.framework?.ownerChain.filter(name => !isLikelyGeneratedComponentName(name)) ??
          []),
        ...(input.framework?.componentSources?.map(source => source.file.split('/').pop()) ?? []),
      ]),
      TARGET_EVIDENCE_BUDGET.maxSourceHintTokens,
    ),
    textTokens: takeEvidenceBudget(
      uniqueDefined([input.text, input.ariaLabel]),
      TARGET_EVIDENCE_BUDGET.maxSourceHintTokens,
    ),
    classTokens: takeEvidenceBudget(input.classList, TARGET_EVIDENCE_BUDGET.maxClassTokens),
  }
}

function buildLikelyFileNames(element: Element, classList: string[]): string[] {
  return uniqueDefined([
    ...classList.filter(className => /[a-z]/i.test(className)),
    getFirstAttribute(element, TEST_ID_ATTRIBUTE_NAMES),
    element.id,
    element.getAttribute('name') ?? undefined,
  ])
}
