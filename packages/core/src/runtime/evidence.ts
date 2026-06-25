import {
  attachRuntimeContextCapture,
  createRuntimeContextCollector,
  createRuntimeContextEnvelope,
  selectRuntimeEvidence,
} from '../features/evidence/runtime-context/index.js'
import type { AnnotationTarget, AnnotationTransport, SourceLocation } from '@inspecto-dev/types'
import {
  formatRuntimeContextSummary as formatRuntimeContextSummaryValue,
  getCollectedRuntimeErrorCount as getCollectedRuntimeErrorCountValue,
  getRuntimeContextLimits as getRuntimeContextLimitValues,
} from './evidence-summary.js'
import {
  canAttachCssContext as canAttachCssContextValue,
  captureCssContextPromptForElement as captureCssContextPromptForElementValue,
  getAnnotateCssContextPrompt as getAnnotateCssContextPromptValue,
  isCssContextEnabledForTarget as isCssContextEnabledForTargetValue,
  isCssContextEnabledForTransportTarget as isCssContextEnabledForTransportTargetValue,
} from './css-context.js'

type EvidenceContext = {
  options: {
    runtimeContext?: {
      enabled?: boolean
      maxRuntimeErrors?: number
      maxFailedRequests?: number
    }
  }
  mode: 'inspect' | 'annotate'
  disabled: boolean
  cleanupRuntimeContextCapture: (() => void) | null
  runtimeContextCollector: ReturnType<typeof createRuntimeContextCollector>
  annotateRuntimeContextEnabled: boolean
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

export function canAttachCssContext(): boolean {
  return canAttachCssContextValue()
}

export function captureCssContextPromptForElement(
  ctx: unknown,
  element: Element,
  location: SourceLocation | null,
): string | null {
  if (!location) return null
  return captureCssContextPromptForElementValue(ctx, element, location)
}

export function isCssContextEnabledForTarget(ctx: unknown, target: AnnotationTarget): boolean {
  return isCssContextEnabledForTargetValue(asEvidenceContext(ctx), target)
}

export function isCssContextEnabledForTransportTarget(
  ctx: unknown,
  target: AnnotationTransport['targets'][number],
): boolean {
  return isCssContextEnabledForTransportTargetValue(asEvidenceContext(ctx), target)
}

export function getAnnotateCssContextPrompt(
  ctx: unknown,
  annotations: AnnotationTransport[],
  includeWhenDisabled = false,
): string | null {
  return getAnnotateCssContextPromptValue(asEvidenceContext(ctx), annotations, includeWhenDisabled)
}

export function getRuntimeContextLimits(ctx: unknown): {
  maxRuntimeErrors?: number
  maxFailedRequests?: number
} {
  return getRuntimeContextLimitValues(asEvidenceContext(ctx))
}

export function getAnnotateRuntimeContext(
  ctx: unknown,
  annotations: AnnotationTransport[],
  includeWhenDisabled = false,
): ReturnType<typeof createRuntimeContextEnvelope> | null {
  const state = asEvidenceContext(ctx)
  if (
    (!includeWhenDisabled && !state.annotateRuntimeContextEnabled) ||
    !canAttachRuntimeContext(state) ||
    annotations.length === 0
  ) {
    return null
  }

  const locations = annotations.flatMap(annotation =>
    annotation.targets.flatMap(target => (target.location ? [target.location] : [])),
  )
  if (locations.length === 0) return null

  const selected = selectRuntimeEvidence(
    state.runtimeContextCollector.snapshot().records,
    locations,
    getRuntimeContextLimits(state),
  )

  return selected.length > 0 ? createRuntimeContextEnvelope(selected) : null
}

export function formatRuntimeContextSummary(
  runtimeContext: ReturnType<typeof createRuntimeContextEnvelope> | null,
): string {
  return formatRuntimeContextSummaryValue(runtimeContext)
}

export function getCollectedRuntimeErrorCount(ctx: unknown): number {
  return getCollectedRuntimeErrorCountValue(asEvidenceContext(ctx))
}
