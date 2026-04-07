import {
  createEmptySession,
  editRecord,
  saveCurrentRecord,
  setCurrentRecordTarget,
} from './annotate-session.js'
import { ATTR_NAME } from './component-utils.js'
import type { AnnotationTarget, FeedbackRecord, SourceLocation } from '@inspecto-dev/types'
import { asAnnotateContext } from './component-annotate-shared.js'

export function addTargetToCurrentAnnotation(
  ctx: unknown,
  element: Element,
  location: SourceLocation,
): void {
  const state = asAnnotateContext(ctx)
  state.cleanupMenu?.()
  state.cleanupMenu = null

  const target = createAnnotationTarget(state, element, location)
  const nextDraftKey = getAnnotationTargetKey(state, target)
  const currentDraftKey = state.annotateSession.current.target
    ? getAnnotationTargetKey(state, state.annotateSession.current.target)
    : null

  if (currentDraftKey && currentDraftKey !== nextDraftKey) {
    persistCurrentDraft(state)
  }

  const existingRecord = state.annotateSession.records.find(
    record => getAnnotationTargetKey(state, record.target) === nextDraftKey,
  )
  if (existingRecord) {
    state.annotateDrafts.delete(nextDraftKey)
    state.annotateSession = setCurrentRecordTarget(state.annotateSession, target)
  } else {
    const cachedDraft = state.annotateDrafts.get(nextDraftKey)
    state.annotateSession = cachedDraft
      ? {
          ...state.annotateSession,
          current: {
            ...cachedDraft,
            target,
          },
        }
      : {
          ...state.annotateSession,
          current: {
            ...createEmptySession().current,
            target,
          },
        }
  }

  state.annotateElements.clear()
  state.annotateElements.set(state.annotateSession.current.id, element)
  state.syncModeUi()
}

export function markTargetInAnnotateSession(
  ctx: unknown,
  element: Element,
  location: SourceLocation,
): void {
  const state = asAnnotateContext(ctx)
  state.cleanupMenu?.()
  state.cleanupMenu = null

  const target = createAnnotationTarget(state, element, location)
  const nextDraftKey = getAnnotationTargetKey(state, target)
  const currentDraftKey = state.annotateSession.current.target
    ? getAnnotationTargetKey(state, state.annotateSession.current.target)
    : null
  const existingRecord = state.annotateSession.records.find(
    record => getAnnotationTargetKey(state, record.target) === nextDraftKey,
  )

  if (existingRecord) {
    state.annotateDrafts.delete(nextDraftKey)
    beginEditingRecord(state, existingRecord.id)
    return
  }

  if (
    state.annotateEditingRecord &&
    getAnnotationTargetKey(state, state.annotateEditingRecord.target) === nextDraftKey
  ) {
    rebindCurrentAnnotationElements(state)
    state.renderAnnotateSelectionOverlay()
    state.updateAnnotateSidebar()
    return
  }

  if (currentDraftKey && currentDraftKey !== nextDraftKey) {
    persistCurrentDraft(state)
    restoreEditingRecord(state)
  }

  state.annotateEditingRecord = null
  state.annotateSession = {
    ...state.annotateSession,
    current: {
      ...createEmptySession().current,
    },
  }
  state.annotateSession = setCurrentRecordTarget(state.annotateSession, target)
  state.annotateElements.clear()
  state.annotateElements.set(state.annotateSession.current.id, element)
  clearDraftForTarget(state, state.annotateSession.current.target)
  state.annotateSession = saveCurrentRecord(state.annotateSession)
  state.annotateElements.clear()
  state.renderAnnotateSelectionOverlay()
  state.updateAnnotateSidebar()
}

export function getAnnotationTargetKey(_ctx: unknown, target: AnnotationTarget): string {
  return `${target.location.file}:${target.location.line}:${target.location.column}::${target.selector ?? ''}`
}

export function persistCurrentDraft(ctx: unknown): void {
  const state = asAnnotateContext(ctx)
  const current = state.annotateSession.current
  if (!current.target) return

  const key = getAnnotationTargetKey(state, current.target)
  if (
    current.note.trim().length === 0 &&
    current.intent === 'review' &&
    !(current.cssContextEnabled ?? false)
  ) {
    state.annotateDrafts.delete(key)
    return
  }

  state.annotateDrafts.set(key, {
    ...current,
    target: current.target,
  })
}

export function clearDraftForTarget(
  ctx: unknown,
  target: AnnotationTarget | null | undefined,
): void {
  const state = asAnnotateContext(ctx)
  if (!target) return
  state.annotateDrafts.delete(getAnnotationTargetKey(state, target))
}

export function restoreEditingRecord(ctx: unknown): void {
  const state = asAnnotateContext(ctx)
  if (!state.annotateEditingRecord) return

  const current = state.annotateSession.current
  const restoredRecord: FeedbackRecord =
    current.target && current.id === state.annotateEditingRecord.id
      ? {
          id: current.id,
          displayOrder: current.displayOrder ?? state.annotateEditingRecord.displayOrder,
          target: current.target,
          note: current.note,
          intent: current.intent,
        }
      : state.annotateEditingRecord

  state.annotateSession = {
    ...state.annotateSession,
    records: [
      ...state.annotateSession.records.filter(record => record.id !== restoredRecord.id),
      restoredRecord,
    ].sort((a, b) => a.displayOrder - b.displayOrder),
  }
  state.annotateEditingRecord = null
}

export function beginEditingRecord(ctx: unknown, recordId: string): void {
  const state = asAnnotateContext(ctx)
  const record = state.annotateSession.records.find(entry => entry.id === recordId)
  if (!record) return

  const currentDraftKey = state.annotateSession.current.target
    ? getAnnotationTargetKey(state, state.annotateSession.current.target)
    : null
  const nextDraftKey = getAnnotationTargetKey(state, record.target)
  if (currentDraftKey && currentDraftKey !== nextDraftKey) {
    persistCurrentDraft(state)
    if (state.annotateQuickCaptureEnabled) {
      restoreEditingRecord(state)
    }
  }

  state.annotateEditingRecord = record
  state.annotateSession = editRecord(state.annotateSession, recordId)
  rebindCurrentAnnotationElements(state)
  state.renderAnnotateSelectionOverlay()
  state.updateAnnotateSidebar()
}

export function findElementForAnnotationTarget(
  ctx: unknown,
  target: AnnotationTarget,
): Element | null {
  return findElementForLocation(ctx, target.location, target.selector)
}

export function findElementForLocation(
  _ctx: unknown,
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

  return byLocation instanceof Element ? byLocation : null
}

export function rebindCurrentAnnotationElements(ctx: unknown): void {
  const state = asAnnotateContext(ctx)
  state.annotateElements.clear()

  if (!state.annotateSession.current.target) return

  const element = findElementForAnnotationTarget(state, state.annotateSession.current.target)
  if (element) {
    state.annotateElements.set(state.annotateSession.current.id, element)
  }
}

export function createAnnotationTarget(
  ctx: unknown,
  element: Element,
  location: SourceLocation,
): AnnotationTarget {
  const rect = element.getBoundingClientRect()

  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `target-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    location,
    label: describeElement(ctx, element),
    selector: createSelector(element),
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    },
  }
}

export function describeElement(_ctx: unknown, element: Element): string {
  const id = element.id ? `#${element.id}` : ''
  const className =
    typeof element.className === 'string'
      ? element.className
          .split(/\s+/)
          .filter(Boolean)
          .map(name => `.${name}`)
          .join('')
      : ''

  return `${element.tagName.toLowerCase()}${id}${className}` || element.tagName.toLowerCase()
}

export function createSelector(element: Element): string {
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
