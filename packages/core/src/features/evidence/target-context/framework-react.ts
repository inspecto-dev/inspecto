import { uniqueDefined } from './sanitize.js'
import type {
  TargetFrameworkEvidence,
  TargetFrameworkRenderNode,
  TargetFrameworkSourceEvidence,
} from './types.js'
import {
  getDisplayName,
  getObjectKeys,
  HOST_COMPONENT_PATTERN,
  isLikelyGeneratedComponentName,
  MAX_OWNER_DEPTH,
  normalizeSourceFile,
  numberField,
  stringValue,
  asRecord,
} from './framework-shared.js'

const REACT_FIBER_PREFIXES = ['__reactFiber$', '__reactInternalInstance$']

type ReactFiber = {
  type?: unknown
  elementType?: unknown
  memoizedProps?: unknown
  _debugSource?: unknown
  return?: ReactFiber | null
}

export function collectReactFrameworkEvidence(
  element: Element,
): TargetFrameworkEvidence | undefined {
  const fiber = findReactFiber(element)
  if (!fiber) return undefined

  const componentNames: string[] = []
  const componentSources: TargetFrameworkSourceEvidence[] = []
  const renderPath: TargetFrameworkRenderNode[] = []
  const propKeys: string[] = []
  let current: ReactFiber | null | undefined = fiber
  let renderedSource = getReactDebugSource(fiber)

  while (current && componentNames.length < MAX_OWNER_DEPTH) {
    const hostName = getReactHostName(current)
    if (hostName && renderPath.length === 0) {
      renderPath.push({ kind: 'host', name: hostName, propKeys: [], ...buildHostSelector(element) })
    }

    const componentName = getReactComponentName(current)
    if (componentName) {
      const componentPropKeys = getObjectKeys(current.memoizedProps)
      componentNames.push(componentName)
      propKeys.push(...componentPropKeys)
      renderPath.push({ kind: 'component', name: componentName, propKeys: componentPropKeys })
      const source = renderedSource ? { componentName, ...renderedSource } : undefined
      if (source) componentSources.push(source)
      renderedSource = getReactDebugSource(current)
    }
    current = current.return
  }

  const ownerChain = uniqueDefined(componentNames.reverse())
  const orderedSources = componentSources.reverse()
  const componentName = ownerChain.at(-1)
  if (!componentName) return undefined
  const source =
    orderedSources.find(item => item.componentName === componentName) ?? orderedSources.at(-1)
  const hasReadableOwnerName = ownerChain.some(name => !isLikelyGeneratedComponentName(name))

  return {
    name: 'react',
    componentName,
    ownerChain,
    propKeys: uniqueDefined(propKeys),
    renderPath: renderPath.reverse(),
    ...(source ? { source } : {}),
    ...(orderedSources.length > 0 ? { componentSources: orderedSources } : {}),
    confidence: source ? 'high' : hasReadableOwnerName ? 'medium' : 'low',
  }
}

function findReactFiber(element: Element): ReactFiber | undefined {
  let current: Element | null = element
  while (current) {
    const record = current as unknown as Record<string, unknown>
    const key = Object.keys(record).find(property =>
      REACT_FIBER_PREFIXES.some(prefix => property.startsWith(prefix)),
    )
    if (key) return record[key] as ReactFiber
    current = current.parentElement
  }
  return undefined
}

function getReactComponentName(fiber: ReactFiber): string | undefined {
  return getDisplayName(fiber.elementType) ?? getDisplayName(fiber.type)
}

function getReactHostName(fiber: ReactFiber): string | undefined {
  return typeof fiber.type === 'string' && HOST_COMPONENT_PATTERN.test(fiber.type)
    ? fiber.type
    : undefined
}

function getReactDebugSource(
  fiber: ReactFiber,
): Omit<TargetFrameworkSourceEvidence, 'componentName'> | undefined {
  const source = asRecord(fiber._debugSource)
  const file = normalizeSourceFile(stringValue(source?.fileName))
  if (!file) return undefined
  return {
    file,
    ...numberField('line', source?.lineNumber),
    ...numberField('column', source?.columnNumber),
  }
}

function buildHostSelector(element: Element): Pick<TargetFrameworkRenderNode, 'selector'> {
  const testId = element.getAttribute('data-testid')
  const id = element.id
  if (id && testId && id === testId) return { selector: `#${id}[data-testid="${testId}"]` }
  if (testId) return { selector: `[data-testid="${testId}"]` }
  if (id) return { selector: `#${id}` }
  return {}
}
