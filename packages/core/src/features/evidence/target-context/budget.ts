export const TARGET_EVIDENCE_BUDGET = {
  maxAttributes: 16,
  maxClassTokens: 12,
  maxSourceHintTokens: 12,
} as const

export function takeEvidenceBudget<T>(values: T[], maxItems: number): T[] {
  return values.slice(0, maxItems)
}
