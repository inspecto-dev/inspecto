import { uniqueDefined } from './sanitize.js'
import type {
  TargetFrameworkEvidence,
  TargetFrameworkRenderNode,
  TargetFrameworkSourceEvidence,
} from './types.js'
import {
  asRecord,
  getObjectKeys,
  MAX_OWNER_DEPTH,
  normalizeSourceFile,
  stringValue,
} from './framework-shared.js'

type VueComponentInstance = {
  type?: unknown
  parent?: VueComponentInstance | null
  proxy?: { $options?: unknown } | null
  props?: unknown
  subTree?: VueVNode | null
}

type VueVNode = {
  el?: unknown
  anchor?: unknown
  component?: VueComponentInstance | null
  children?: unknown
  dynamicChildren?: unknown
  ssContent?: VueVNode | null
  ssFallback?: VueVNode | null
}

type VueApp = {
  _instance?: VueComponentInstance | null
}

export function collectVueFrameworkEvidence(element: Element): TargetFrameworkEvidence | undefined {
  const instance = findVueInstance(element)
  if (!instance) return undefined

  const componentNames: string[] = []
  const componentSources: TargetFrameworkSourceEvidence[] = []
  const renderPath: TargetFrameworkRenderNode[] = []
  const propKeys: string[] = []
  let current: VueComponentInstance | null | undefined = instance

  while (current && componentNames.length < MAX_OWNER_DEPTH) {
    const componentName = getVueComponentName(current)
    if (componentName) {
      const componentPropKeys = getVuePropKeys(current)
      componentNames.push(componentName)
      propKeys.push(...componentPropKeys)
      renderPath.push({ kind: 'component', name: componentName, propKeys: componentPropKeys })
      const source = getVueSource(current, componentName)
      if (source) componentSources.push(source)
    }
    current = current.parent
  }

  const ownerChain = uniqueDefined(componentNames.reverse())
  const orderedSources = componentSources.reverse()
  const componentName = ownerChain.at(-1)
  if (!componentName) return undefined
  const source =
    orderedSources.find(item => item.componentName === componentName) ?? orderedSources.at(-1)

  return {
    name: 'vue',
    componentName,
    ownerChain,
    propKeys: uniqueDefined(propKeys),
    renderPath: [
      ...renderPath.reverse(),
      {
        kind: 'host',
        name: element.tagName.toLowerCase(),
        propKeys: [],
        ...buildHostSelector(element),
      },
    ],
    ...(source ? { source } : {}),
    ...(orderedSources.length > 0 ? { componentSources: orderedSources } : {}),
    confidence: source ? 'high' : 'medium',
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

function findVueInstance(element: Element): VueComponentInstance | undefined {
  let current: Element | null = element
  while (current) {
    const record = current as unknown as Record<string, unknown>
    if (record.__vueParentComponent) return record.__vueParentComponent as VueComponentInstance
    if (record.__vue__) return record.__vue__ as VueComponentInstance
    if (record.__vue_app__) {
      const instance = findVueInstanceFromApp(record.__vue_app__ as VueApp, element)
      if (instance) return instance
    }
    if (record._vnode) {
      const instance = findDeepestVueComponent(record._vnode as VueVNode, element)
      if (instance) return instance
    }
    current = current.parentElement
  }
  return undefined
}

function findVueInstanceFromApp(app: VueApp, target: Element): VueComponentInstance | undefined {
  const root = app._instance
  if (!root) return undefined
  return findDeepestVueComponent(root.subTree, target) ?? root
}

function findDeepestVueComponent(
  vnode: VueVNode | null | undefined,
  target: Element,
): VueComponentInstance | undefined {
  if (!vnode || !vnodeMayContainTarget(vnode, target)) return undefined

  const component = vnode.component
  const childMatch = component ? findDeepestVueComponent(component.subTree, target) : undefined
  if (childMatch) return childMatch

  for (const child of getVueVNodeChildren(vnode)) {
    const childMatch = findDeepestVueComponent(child, target)
    if (childMatch) return childMatch
  }

  if (vnode.ssContent) {
    const contentMatch = findDeepestVueComponent(vnode.ssContent, target)
    if (contentMatch) return contentMatch
  }
  if (vnode.ssFallback) {
    const fallbackMatch = findDeepestVueComponent(vnode.ssFallback, target)
    if (fallbackMatch) return fallbackMatch
  }

  return component ?? undefined
}

function vnodeMayContainTarget(vnode: VueVNode, target: Element): boolean {
  const el = vnode.el
  if (el instanceof Element) return el === target || el.contains(target)
  return true
}

function getVueVNodeChildren(vnode: VueVNode): VueVNode[] {
  return [...arrayOfVNodes(vnode.dynamicChildren), ...arrayOfVNodes(vnode.children)]
}

function arrayOfVNodes(value: unknown): VueVNode[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is VueVNode => Boolean(asRecord(item)))
}

function getVueComponentName(instance: VueComponentInstance): string | undefined {
  const type = asRecord(instance.type)
  const options = asRecord(instance.proxy?.$options)
  return (
    stringValue(type?.name) ??
    stringValue(type?.__name) ??
    stringValue(options?.name) ??
    stringValue(options?.__name)
  )
}

function getVueSource(
  instance: VueComponentInstance,
  componentName: string,
): TargetFrameworkSourceEvidence | undefined {
  const type = asRecord(instance.type)
  const options = asRecord(instance.proxy?.$options)
  const file = normalizeSourceFile(stringValue(type?.__file) ?? stringValue(options?.__file))
  if (!file) return undefined
  return { componentName, file }
}

function getVuePropKeys(instance: VueComponentInstance): string[] {
  const type = asRecord(instance.type)
  const options = asRecord(instance.proxy?.$options)
  return uniqueDefined([
    ...getPropDefinitionKeys(type?.props),
    ...getPropDefinitionKeys(options?.props),
    ...getObjectKeys(instance.props),
  ])
}

function getPropDefinitionKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return getObjectKeys(value)
}
