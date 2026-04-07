import type { HotKey, HotKeys, SourceLocation } from '@inspecto-dev/types'

const ATTR_NAME = 'data-inspecto'

export function parseAttrValue(value: string): SourceLocation | null {
  const parts = value.split(':')
  if (parts.length < 3) return null

  const col = parseInt(parts[parts.length - 1]!, 10)
  const line = parseInt(parts[parts.length - 2]!, 10)
  const file = parts.slice(0, parts.length - 2).join(':')

  if (isNaN(line) || isNaN(col) || !file) return null
  return { file, line, column: col }
}

export function findInspectable(el: Element | null): Element | null {
  while (el) {
    if (el.hasAttribute(ATTR_NAME)) return el
    el = el.parentElement
  }
  return null
}

function parseHotKeyString(hotKey: string): HotKey[] {
  const keys = hotKey.split('+').map(k => k.trim().toLowerCase())
  const result: HotKey[] = []

  if (keys.includes('alt') || keys.includes('option')) result.push('altKey')
  if (keys.includes('ctrl') || keys.includes('control')) result.push('ctrlKey')
  if (
    keys.includes('meta') ||
    keys.includes('cmd') ||
    keys.includes('command') ||
    keys.includes('win')
  ) {
    result.push('metaKey')
  }
  if (keys.includes('shift')) result.push('shiftKey')

  return result
}

export function hotKeysHeld(event: MouseEvent, hotKeys: HotKeys): boolean {
  if (!hotKeys) return false
  const mappedKeys = parseHotKeyString(hotKeys)
  if (mappedKeys.length === 0) return false
  return mappedKeys.every(key => event[key])
}

export function getDeepActiveElement(root: Document | ShadowRoot | null): Element | null {
  let current: Element | null = root?.activeElement ?? null
  while (current && current.shadowRoot?.activeElement) {
    current = current.shadowRoot.activeElement
  }
  return current
}

export function createElementSelector(element: Element): string {
  if (element.id) return `#${element.id}`

  const segments: string[] = []
  let current: Element | null = element

  while (current && current !== document.body) {
    const tag = current.tagName.toLowerCase()
    const siblings = current.parentElement
      ? Array.from(current.parentElement.children).filter(
          sibling => sibling.tagName.toLowerCase() === tag,
        )
      : []
    const index = siblings.indexOf(current)
    const nth = index >= 0 ? `:nth-of-type(${index + 1})` : ''
    segments.unshift(`${tag}${nth}`)

    if (current.id) {
      segments[0] = `#${current.id}`
      break
    }

    current = current.parentElement
  }

  return segments.join(' > ')
}

export { ATTR_NAME }
