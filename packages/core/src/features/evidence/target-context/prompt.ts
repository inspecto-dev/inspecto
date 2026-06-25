import type { TargetEvidence } from './types.js'
import { createTargetEvidencePromptValues } from './prompt-values.js'
import { formatTargetEvidenceForPrompt } from './prompt-formatters.js'

export function buildTargetEvidencePrompt(input: {
  prompt: string
  targetLabel?: string
  targetEvidence?: TargetEvidence
}): string {
  const renderedPrompt = renderTargetEvidencePromptTemplate(input.prompt, input.targetEvidence)
  return [
    renderedPrompt,
    input.targetLabel?.trim() ? `Selected component:\n- ${input.targetLabel.trim()}` : '',
    formatTargetEvidenceForPrompt(input.targetEvidence),
  ]
    .filter(Boolean)
    .join('\n\n')
}

export { formatTargetEvidenceForPrompt }

export function renderTargetEvidencePromptTemplate(
  template: string,
  evidence: TargetEvidence | null | undefined,
): string {
  const values = createTargetEvidencePromptValues(evidence)
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => {
    return values[key] ?? `unknown ${key}`
  })
}
