import {
  buildCssContextPrompt,
  captureCssContextEntry,
} from '../features/evidence/css-context/index.js'
import {
  createAnnotationTarget,
  findElementForLocation,
  getAnnotationTargetKey,
} from '../features/annotate/targets/index.js'
import type { AnnotationTarget, AnnotationTransport, SourceLocation } from '@inspecto-dev/types'
import { isCssContextEnabledForTargetKey, type CssContextState } from './css-context-state.js'

type CssContextRuntimeState = {
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

export function canAttachCssContext(): boolean {
  return typeof window !== 'undefined' && typeof window.getComputedStyle === 'function'
}

export function captureCssContextPromptForElement(
  _ctx: unknown,
  element: Element,
  location: SourceLocation,
): string | null {
  const target = createAnnotationTarget(null, element, location)
  const entry = captureCssContextEntry({
    element,
    location,
    ...(target.label ? { label: target.label } : {}),
    ...(target.selector ? { selector: target.selector } : {}),
  })
  return entry ? buildCssContextPrompt([entry]) : null
}

function getCssContextState(state: CssContextRuntimeState): CssContextState {
  return {
    annotateCssContextEnabled: state.annotateCssContextEnabled,
    currentTargetKey: state.annotateSession.current.target
      ? getAnnotationTargetKey(state, state.annotateSession.current.target)
      : null,
    ...(state.annotateSession.current.cssContextEnabled !== undefined
      ? { currentCssContextEnabled: state.annotateSession.current.cssContextEnabled }
      : {}),
    savedRecords: state.annotateSession.records.map(record => ({
      targetKey: getAnnotationTargetKey(state, record.target),
      ...(record.cssContextEnabled !== undefined
        ? { cssContextEnabled: record.cssContextEnabled }
        : {}),
    })),
  }
}

export function isCssContextEnabledForTarget(
  ctx: CssContextRuntimeState,
  target: AnnotationTarget,
): boolean {
  const targetKey = getAnnotationTargetKey(ctx, target)
  return isCssContextEnabledForTargetKey(getCssContextState(ctx), targetKey)
}

export function isCssContextEnabledForTransportTarget(
  ctx: CssContextRuntimeState,
  target: AnnotationTransport['targets'][number],
): boolean {
  const targetKey = `${target.location.file}:${target.location.line}:${target.location.column}::${target.selector ?? ''}`
  return isCssContextEnabledForTargetKey(getCssContextState(ctx), targetKey)
}

export function getAnnotateCssContextPrompt(
  ctx: CssContextRuntimeState,
  annotations: AnnotationTransport[],
  includeWhenDisabled = false,
): string | null {
  if (
    (!includeWhenDisabled &&
      !ctx.annotateCssContextEnabled &&
      !annotations.some(annotation =>
        annotation.targets.some(target => ctx.isCssContextEnabledForTransportTarget(target)),
      )) ||
    !canAttachCssContext()
  ) {
    return null
  }

  const entries = annotations.flatMap(annotation =>
    annotation.targets.flatMap(target => {
      if (!includeWhenDisabled && !ctx.isCssContextEnabledForTransportTarget(target)) {
        return []
      }
      const element = findElementForLocation(ctx, target.location, target.selector)
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
