import {
  attachRuntimeContextCapture,
  createRuntimeContextCollector,
  createRuntimeContextEnvelope,
  selectRuntimeEvidence,
} from './runtime-context.js'
import { captureElementScreenshot } from './screenshot-context.js'
import { buildCssContextPrompt, captureCssContextEntry } from './css-context.js'
import type {
  AnnotationTarget,
  AnnotationTransport,
  ScreenshotContext,
  SourceLocation,
} from '@inspecto-dev/types'

type EvidenceContext = {
  options: {
    runtimeContext?: {
      enabled?: boolean
      maxRuntimeErrors?: number
      maxFailedRequests?: number
    }
    screenshotContext?: { enabled?: boolean }
  }
  mode: 'inspect' | 'annotate'
  disabled: boolean
  cleanupRuntimeContextCapture: (() => void) | null
  runtimeContextCollector: ReturnType<typeof createRuntimeContextCollector>
  annotateRuntimeContextEnabled: boolean
  annotateScreenshotContextEnabled: boolean
  annotateCssContextEnabled: boolean
  annotateSession: {
    current: {
      id: string
      target: AnnotationTarget | null
      cssContextEnabled?: boolean
    }
    records: Array<{
      target: AnnotationTarget
      cssContextEnabled?: boolean
    }>
  }
  annotateElements: Map<string, Element>
  createAnnotationTarget(element: Element, location: SourceLocation): AnnotationTarget
  getAnnotationTargetKey(target: AnnotationTarget): string
  findElementForLocation(location: SourceLocation, selector?: string): Element | null
  findElementForAnnotationTarget(target: AnnotationTarget): Element | null
  canAttachRuntimeContext(): boolean
  canAttachScreenshotContext(): boolean
  canAttachCssContext(): boolean
  getRuntimeContextLimits(): {
    maxRuntimeErrors?: number
    maxFailedRequests?: number
  }
  isCssContextEnabledForTransportTarget(target: AnnotationTransport['targets'][number]): boolean
}

function asEvidenceContext(ctx: unknown): EvidenceContext {
  return ctx as EvidenceContext
}

export function syncRuntimeContextCapture(ctx: unknown): void {
  const state = asEvidenceContext(ctx)
  const runtimeContextEnabled =
    state.options.runtimeContext?.enabled === true &&
    (state.mode === 'inspect' || (state.mode === 'annotate' && !state.disabled))

  if (runtimeContextEnabled) {
    if (!state.cleanupRuntimeContextCapture) {
      state.cleanupRuntimeContextCapture = attachRuntimeContextCapture(
        state.runtimeContextCollector,
      )
    }
    return
  }

  state.cleanupRuntimeContextCapture?.()
  state.cleanupRuntimeContextCapture = null
  state.runtimeContextCollector.clear()
}

export function canAttachRuntimeContext(ctx: unknown): boolean {
  return asEvidenceContext(ctx).options.runtimeContext?.enabled === true
}

export function canAttachScreenshotContext(ctx: unknown): boolean {
  return asEvidenceContext(ctx).options.screenshotContext?.enabled === true
}

export function canAttachCssContext(): boolean {
  return typeof window !== 'undefined' && typeof window.getComputedStyle === 'function'
}

export function captureCssContextPromptForElement(
  ctx: unknown,
  element: Element,
  location: SourceLocation,
): string | null {
  const state = asEvidenceContext(ctx)
  const target = state.createAnnotationTarget(element, location)
  const entry = captureCssContextEntry({
    element,
    location,
    ...(target.label ? { label: target.label } : {}),
    ...(target.selector ? { selector: target.selector } : {}),
  })
  return entry ? buildCssContextPrompt([entry]) : null
}

export function isCssContextEnabledForTarget(ctx: unknown, target: AnnotationTarget): boolean {
  const state = asEvidenceContext(ctx)
  if (state.annotateCssContextEnabled) return true

  const targetKey = state.getAnnotationTargetKey(target)
  if (
    state.annotateSession.current.target &&
    state.getAnnotationTargetKey(state.annotateSession.current.target) === targetKey
  ) {
    return state.annotateSession.current.cssContextEnabled ?? false
  }

  const savedRecord = state.annotateSession.records.find(
    record => state.getAnnotationTargetKey(record.target) === targetKey,
  )
  return savedRecord?.cssContextEnabled ?? false
}

export function isCssContextEnabledForTransportTarget(
  ctx: unknown,
  target: AnnotationTransport['targets'][number],
): boolean {
  const state = asEvidenceContext(ctx)
  if (state.annotateCssContextEnabled) return true

  const targetKey = `${target.location.file}:${target.location.line}:${target.location.column}::${target.selector ?? ''}`
  if (
    state.annotateSession.current.target &&
    state.getAnnotationTargetKey(state.annotateSession.current.target) === targetKey
  ) {
    return state.annotateSession.current.cssContextEnabled ?? false
  }

  const savedRecord = state.annotateSession.records.find(
    record => state.getAnnotationTargetKey(record.target) === targetKey,
  )
  return savedRecord?.cssContextEnabled ?? false
}

export function getAnnotateCssContextPrompt(
  ctx: unknown,
  annotations: AnnotationTransport[],
  includeWhenDisabled = false,
): string | null {
  const state = asEvidenceContext(ctx)
  if (
    (!includeWhenDisabled &&
      !state.annotateCssContextEnabled &&
      !annotations.some(annotation =>
        annotation.targets.some(target => state.isCssContextEnabledForTransportTarget(target)),
      )) ||
    !state.canAttachCssContext()
  ) {
    return null
  }

  const entries = annotations.flatMap(annotation =>
    annotation.targets.flatMap(target => {
      if (!includeWhenDisabled && !state.isCssContextEnabledForTransportTarget(target)) {
        return []
      }
      const element = state.findElementForLocation(target.location, target.selector)
      if (!element) return []
      const entry = captureCssContextEntry({
        element,
        location: target.location,
        ...(target.label ? { label: target.label } : {}),
        ...(target.selector ? { selector: target.selector } : {}),
      })
      return entry ? [entry] : []
    }),
  )

  return buildCssContextPrompt(entries)
}

export function getRuntimeContextLimits(ctx: unknown): {
  maxRuntimeErrors?: number
  maxFailedRequests?: number
} {
  const state = asEvidenceContext(ctx)
  return {
    ...(state.options.runtimeContext?.maxRuntimeErrors !== undefined
      ? { maxRuntimeErrors: state.options.runtimeContext.maxRuntimeErrors }
      : {}),
    ...(state.options.runtimeContext?.maxFailedRequests !== undefined
      ? { maxFailedRequests: state.options.runtimeContext.maxFailedRequests }
      : {}),
  }
}

export function getAnnotateRuntimeContext(
  ctx: unknown,
  annotations: AnnotationTransport[],
  includeWhenDisabled = false,
): ReturnType<typeof createRuntimeContextEnvelope> | null {
  const state = asEvidenceContext(ctx)
  if (
    (!includeWhenDisabled && !state.annotateRuntimeContextEnabled) ||
    !state.canAttachRuntimeContext() ||
    annotations.length === 0
  ) {
    return null
  }

  const locations = annotations.flatMap(annotation =>
    annotation.targets.map(target => target.location),
  )
  if (locations.length === 0) return null

  const selected = selectRuntimeEvidence(
    state.runtimeContextCollector.snapshot().records,
    locations,
    state.getRuntimeContextLimits(),
  )

  return selected.length > 0 ? createRuntimeContextEnvelope(selected) : null
}

export function formatRuntimeContextSummary(
  runtimeContext: ReturnType<typeof createRuntimeContextEnvelope> | null,
): string {
  if (!runtimeContext) return ''

  const parts: string[] = []
  if (runtimeContext.summary.runtimeErrorCount > 0) {
    parts.push(
      `${runtimeContext.summary.runtimeErrorCount} ${runtimeContext.summary.runtimeErrorCount === 1 ? 'runtime error' : 'runtime errors'}`,
    )
  }
  if (runtimeContext.summary.failedRequestCount > 0) {
    parts.push(
      `${runtimeContext.summary.failedRequestCount} ${runtimeContext.summary.failedRequestCount === 1 ? 'failed request' : 'failed requests'}`,
    )
  }
  return parts.join(' • ')
}

export function getCollectedRuntimeErrorCount(ctx: unknown): number {
  const state = asEvidenceContext(ctx)
  return state.runtimeContextCollector
    .snapshot()
    .records.filter(record => record.kind !== 'failed-request').length
}

export function resolveAnnotateScreenshotElement(
  ctx: unknown,
  annotations: AnnotationTransport[],
  scope: 'current' | 'batch',
): Element | null {
  const state = asEvidenceContext(ctx)
  const currentElement = state.annotateSession.current.target
    ? (state.annotateElements.get(state.annotateSession.current.id) ??
      state.findElementForAnnotationTarget(state.annotateSession.current.target))
    : null

  if (scope === 'current') return currentElement

  for (const annotation of annotations) {
    for (const target of annotation.targets) {
      const element = state.findElementForLocation(target.location, target.selector)
      if (element) return element
    }
  }

  return currentElement
}

export async function captureAnnotateScreenshotContext(
  ctx: unknown,
  annotations: AnnotationTransport[],
  scope: 'current' | 'batch',
): Promise<ScreenshotContext | null> {
  const state = asEvidenceContext(ctx)
  if (!state.canAttachScreenshotContext() || !state.annotateScreenshotContextEnabled) {
    return null
  }

  const element = resolveAnnotateScreenshotElement(state, annotations, scope)
  return element ? captureElementScreenshot(element) : null
}
