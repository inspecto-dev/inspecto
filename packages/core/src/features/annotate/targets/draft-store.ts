import type { AnnotationTarget, FeedbackRecord } from '@inspecto-dev/types'
import { asAnnotateContext } from '../context.js'
import { getAnnotationTargetKey } from './identity.js'

export function persistCurrentDraft(ctx: unknown): void {
  const state = asAnnotateContext(ctx)
  const current = state.annotateSession.current
  if (!current.target) return

  const key = getAnnotationTargetKey(current.target)
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
  state.annotateDrafts.delete(getAnnotationTargetKey(target))
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
