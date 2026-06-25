import { compactText } from './sanitize.js'
import type { TargetElementSummary } from './types.js'
import { getElementClassList, getElementTagName } from './dom-shared.js'

const MAX_PARENT_DEPTH = 4
const MAX_CHILDREN = 5
const MAX_NEARBY_TEXT = 6
const MAX_NEARBY_TEXT_LENGTH = 240

export function collectTargetDomContext(element: Element): {
  parentChain: TargetElementSummary[]
  childrenSummary: TargetElementSummary[]
  nearbyText: string[]
} {
  return {
    parentChain: collectParentChain(element),
    childrenSummary: collectChildrenSummary(element),
    nearbyText: collectNearbyText(element),
  }
}

function collectParentChain(element: Element): TargetElementSummary[] {
  const parents: TargetElementSummary[] = []
  let current = element.parentElement
  while (current && current !== document.body && parents.length < MAX_PARENT_DEPTH) {
    parents.push(summarizeElement(current))
    current = current.parentElement
  }
  return parents
}

function collectChildrenSummary(element: Element): TargetElementSummary[] {
  const children: TargetElementSummary[] = []
  for (
    let index = 0;
    index < element.children.length && children.length < MAX_CHILDREN;
    index += 1
  ) {
    children.push(summarizeElement(element.children[index]!))
  }
  return children
}

function collectNearbyText(element: Element): string[] {
  const nearby: string[] = []
  const parent = element.parentElement
  if (!parent) return nearby

  for (
    let index = 0;
    index < parent.children.length && nearby.length < MAX_NEARBY_TEXT;
    index += 1
  ) {
    const child = parent.children[index]!
    if (child === element) continue
    const text = compactText(getDirectTextContent(child), MAX_NEARBY_TEXT_LENGTH)
    if (text) nearby.push(text)
  }
  return nearby
}

function summarizeElement(element: Element): TargetElementSummary {
  const text = compactText(getDirectTextContent(element), 80)
  return {
    tagName: getElementTagName(element),
    ...(element.id ? { id: element.id } : {}),
    classList: getElementClassList(element),
    ...(text ? { text } : {}),
  }
}

function getDirectTextContent(element: Element): string | undefined {
  const text = Array.from(element.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent ?? '')
    .join(' ')
  return text || undefined
}
