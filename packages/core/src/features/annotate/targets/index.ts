import {
  createEmptySession,
  editRecord,
  saveCurrentRecord,
  setCurrentRecordTarget,
} from '../session/index.js'
import type { AnnotationTarget, FeedbackRecord, SourceLocation } from '@inspecto-dev/types'
import { asAnnotateContext } from '../context.js'
import {
  createAnnotationTarget as createAnnotationTargetFromElement,
  createSelector,
  describeElement as describeTargetElement,
  getAnnotationTargetKey as getTargetKey,
} from './identity.js'
import { findElementForLocation as findTargetElementForLocation } from './lookup.js'

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
  return getTargetKey(target)
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
  return findTargetElementForLocation(location, selector)
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
  return createAnnotationTargetFromElement(element, location)
}

export function describeElement(_ctx: unknown, element: Element): string {
  return describeTargetElement(element)
}

export { createSelector }
