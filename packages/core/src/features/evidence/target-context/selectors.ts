import { createElementSelector } from '../../../shared/component-utils.js'
import { compactText } from './sanitize.js'

export const TEST_ID_ATTRIBUTE_NAMES = ['data-testid', 'data-test', 'data-cy'] as const
const STABLE_ATTRIBUTE_NAMES = [...TEST_ID_ATTRIBUTE_NAMES, 'aria-label', 'id']

type CollectTargetSelectorsOptions = {
  cssSelector?: string
  text?: string
  testId?: string
}

export function collectTargetSelectors(
  element: Element,
  options: CollectTargetSelectorsOptions = {},
): {
  css: string
  stableCss?: string
  roleLocator?: string
  textLocator?: string
  testIdLocator?: string
} {
  const testId = options.testId ?? getFirstAttribute(element, TEST_ID_ATTRIBUTE_NAMES)
  const role = element.getAttribute('role') ?? inferRole(element)
  const text = options.text ?? compactText(element.textContent, 80)
  const textLocator = text ? compactText(text, 80) : undefined
  const stableCss = getStableCssSelector(element)

  return {
    css: options.cssSelector ?? createElementSelector(element),
    ...(stableCss ? { stableCss } : {}),
    ...(role ? { roleLocator: role } : {}),
    ...(textLocator ? { textLocator } : {}),
    ...(testId ? { testIdLocator: testId } : {}),
  }
}

export function getFirstAttribute(element: Element, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = element.getAttribute(name)?.trim()
    if (value) return value
  }
  return undefined
}

function getStableCssSelector(element: Element): string | undefined {
  for (const name of STABLE_ATTRIBUTE_NAMES) {
    const value = element.getAttribute(name)?.trim()
    const safeValue = compactText(value)
    if (safeValue && safeValue === value) return `[${name}="${escapeAttributeValue(safeValue)}"]`
  }
  return undefined
}

function inferRole(element: Element): string | undefined {
  const tagName = element.tagName.toLowerCase()
  if (tagName === 'button') return 'button'
  if (tagName === 'a') return 'link'
  if (tagName === 'input') return 'textbox'
  return undefined
}

function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
