import type { AnnotationTarget, SourceLocation } from '@inspecto-dev/types'
import { createElementSelector } from '../../../shared/component-utils.js'

export function getAnnotationTargetKey(target: AnnotationTarget): string {
  return `${target.location.file}:${target.location.line}:${target.location.column}::${target.selector ?? ''}`
}

export function createAnnotationTarget(
  element: Element,
  location: SourceLocation,
): AnnotationTarget {
  const rect = element.getBoundingClientRect()

  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `target-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    location,
    label: describeElement(element),
    selector: createSelector(element),
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    },
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
