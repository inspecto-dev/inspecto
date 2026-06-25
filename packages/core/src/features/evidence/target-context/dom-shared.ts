import { TARGET_EVIDENCE_BUDGET, takeEvidenceBudget } from './budget.js'

export function getElementClassList(element: Element): string[] {
  return takeEvidenceBudget(
    Array.from(element.classList).filter(Boolean),
    TARGET_EVIDENCE_BUDGET.maxClassTokens,
  )
}

export function getElementTagName(element: Element): string {
  return element.tagName.toLowerCase()
}
