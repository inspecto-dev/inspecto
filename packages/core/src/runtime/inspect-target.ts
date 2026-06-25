import type { SourceLocation } from '@inspecto-dev/types'
import type { TargetEvidence } from '../features/evidence/target-context/index.js'
import { collectTargetEvidence } from '../features/evidence/target-context/index.js'
import { findInspectable, getInspectableLocation } from '../shared/component-utils.js'
import { isInspectoChromeEventTarget } from './interaction-targets.js'

const SOURCE_LESS_SEMANTIC_TARGET_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'textarea',
  'select',
  '[role="button"]',
  '[role="link"]',
  '[data-testid]',
  '[data-test]',
  '[data-cy]',
  '[aria-label]',
].join(', ')

export type RuntimeInspectTarget = {
  element: Element
  location: SourceLocation | null
  label: string
}

export function resolveRuntimeInspectTarget(input: {
  mode: 'inspect' | 'annotate'
  eventTarget: EventTarget | null
}): RuntimeInspectTarget | null {
  const sourceElement =
    input.eventTarget instanceof Element ? findInspectable(input.eventTarget) : null
  const element = sourceElement ?? resolveSourceLessEvidenceTarget(input.eventTarget)
  if (!element) return null

  const location = getInspectableLocation(element)
  return {
    element,
    location,
    label: location ? `${location.file.split('/').pop() ?? ''}:${location.line}` : '',
  }
}

export function collectEvidenceForTarget(target: RuntimeInspectTarget): TargetEvidence | undefined {
  return target.location ? undefined : collectTargetEvidence(target.element)
}

function resolveSourceLessEvidenceTarget(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null
  if (isInspectoChromeEventTarget(target)) return null
  return target.closest(SOURCE_LESS_SEMANTIC_TARGET_SELECTOR) ?? target
}
