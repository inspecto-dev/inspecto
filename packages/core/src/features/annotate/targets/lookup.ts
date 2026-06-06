import type { SourceLocation } from '@inspecto-dev/types'
import { ATTR_NAME, getInspectableLocation } from '../../../shared/component-utils.js'

export function findElementForLocation(
  location: SourceLocation,
  selector?: string,
): Element | null {
  if (selector) {
    const bySelector = document.querySelector(selector)
    if (bySelector instanceof Element) {
      return bySelector
    }
  }

  const locationAttr = `${location.file}:${location.line}:${location.column}`
  const byLocation = Array.from(document.querySelectorAll(`[${ATTR_NAME}]`)).find(
    candidate => candidate.getAttribute(ATTR_NAME) === locationAttr,
  )
  if (byLocation instanceof Element) {
    return byLocation
  }

  const byAstroLocation = Array.from(
    document.querySelectorAll('[data-astro-source-file][data-astro-source-loc]'),
  ).find(candidate => {
    const candidateLocation = getInspectableLocation(candidate)
    return (
      candidateLocation?.file === location.file &&
      candidateLocation.line === location.line &&
      candidateLocation.column === location.column
    )
  })

  return byAstroLocation instanceof Element ? byAstroLocation : null
}
