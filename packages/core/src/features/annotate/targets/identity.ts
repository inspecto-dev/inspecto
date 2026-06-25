import type { AnnotationTarget, SourceLocation } from '@inspecto-dev/types'
import type { TargetEvidence } from '../../evidence/target-context/index.js'
import { formatTargetEvidenceForPrompt } from '../../evidence/target-context/index.js'
import { createElementSelector } from '../../../shared/component-utils.js'

export function getAnnotationTargetKey(target: AnnotationTarget): string {
  const locationKey = target.location
    ? `${target.location.file}:${target.location.line}:${target.location.column}`
    : `runtime:${target.selector ?? target.label}`
  return `${locationKey}::${target.selector ?? ''}`
}

export function createAnnotationTarget(
  element: Element,
  location: SourceLocation | null,
  targetEvidence?: TargetEvidence,
): AnnotationTarget {
  const rect = element.getBoundingClientRect()
  const base = {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `target-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: describeElement(element),
    selector: createSelector(element),
    ...(location ? { location } : {}),
    ...(targetEvidence
      ? { targetEvidence, targetEvidencePrompt: formatTargetEvidenceForPrompt(targetEvidence) }
      : {}),
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    },
  }

  if (location) {
    return {
      ...base,
      location,
      ...(targetEvidence
        ? { targetEvidence, targetEvidencePrompt: formatTargetEvidenceForPrompt(targetEvidence) }
        : {}),
    }
  }

  return {
    ...base,
    ...(targetEvidence ? { targetEvidence } : {}),
    targetEvidencePrompt: targetEvidence ? formatTargetEvidenceForPrompt(targetEvidence) : '',
  }
}

export function describeElement(element: Element): string {
  const id = element.id ? `#${element.id}` : ''
  const className =
    typeof element.className === 'string'
      ? element.className
          .split(/\s+/)
          .filter(Boolean)
          .map(name => `.${name}`)
          .join('')
      : ''

  return `${element.tagName.toLowerCase()}${id}${className}` || element.tagName.toLowerCase()
}

export const createSelector = createElementSelector
