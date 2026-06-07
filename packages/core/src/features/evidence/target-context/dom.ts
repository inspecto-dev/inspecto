import { createElementSelector } from '../../../shared/component-utils.js'
import { collectTargetSelectors, getFirstAttribute, TEST_ID_ATTRIBUTE_NAMES } from './selectors.js'
import { compactText, sanitizeAttribute, sanitizeAttributes, sanitizeUrl } from './sanitize.js'
import { collectFrameworkEvidence } from './framework.js'
import type { TargetEvidence } from './types.js'
import { collectTargetDomContext } from './dom-context.js'
import { collectTargetSourceHints } from './source-hints.js'
import { getElementClassList, getElementTagName } from './dom-shared.js'

export function collectTargetEvidence(element: Element): TargetEvidence {
  const rect = element.getBoundingClientRect()
  const classList = getElementClassList(element)
  const text = compactText(element.textContent)
  const ariaLabel = compactText(element.getAttribute('aria-label'))
  const testId = getFirstAttribute(element, TEST_ID_ATTRIBUTE_NAMES)
  const role = element.getAttribute('role')
  const name = sanitizeAttribute('name', element.getAttribute('name') ?? '')
  const href = sanitizeUrl(element.getAttribute('href'))
  const src = sanitizeUrl(element.getAttribute('src'))
  const cssSelector = createElementSelector(element)
  const framework = collectFrameworkEvidence(element)
  const selectorOptions = {
    cssSelector,
    ...(text ? { text } : {}),
    ...(testId ? { testId } : {}),
  }

  return {
    page: {
      url: sanitizeUrl(globalThis.location?.href) ?? '',
      ...(document.title ? { title: document.title } : {}),
      ...(globalThis.location?.pathname ? { route: globalThis.location.pathname } : {}),
    },
    element: {
      tagName: getElementTagName(element),
      ...(element.id ? { id: element.id } : {}),
      classList,
      ...(text ? { text } : {}),
      ...(ariaLabel ? { ariaLabel } : {}),
      ...(role ? { role } : {}),
      ...(testId ? { testId } : {}),
      ...(name ? { name } : {}),
      ...(href ? { href } : {}),
      ...(src ? { src } : {}),
      attributes: sanitizeAttributes(element),
    },
    selectors: collectTargetSelectors(element, selectorOptions),
    layout: {
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      viewport: {
        width: document.documentElement.clientWidth || window.innerWidth || 0,
        height: document.documentElement.clientHeight || window.innerHeight || 0,
      },
      visible: rect.width > 0 && rect.height > 0,
    },
    context: collectTargetDomContext(element),
    ...(framework ? { framework } : {}),
    sourceHints: collectTargetSourceHints({ element, text, ariaLabel, classList, framework }),
  }
}
