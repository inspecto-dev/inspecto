import type { TargetEvidence } from './types.js'

export function formatElement(evidence: TargetEvidence): string {
  const id = evidence.element.id ? `#${evidence.element.id}` : ''
  const classes = evidence.element.classList.map(className => `.${className}`).join('')
  return `${evidence.element.tagName}${id}${classes}`
}
