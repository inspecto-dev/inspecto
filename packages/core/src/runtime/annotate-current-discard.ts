import { clearCurrentRecord } from '../features/annotate/session/index.js'
import type { AnnotationTarget, FeedbackRecord } from '@inspecto-dev/types'
import type { createEmptySession } from '../features/annotate/session/index.js'

type AnnotateCurrentDiscardContext = {
  annotateSession: ReturnType<typeof createEmptySession>
  annotateEditingRecord: FeedbackRecord | null
  annotateElements: Map<string, Element>
}

function clearCurrentAnnotationDraft(
  state: AnnotateCurrentDiscardContext,
  clearDraftForTarget: (target: AnnotationTarget | null | undefined) => void,
): void {
  clearDraftForTarget(state.annotateSession.current.target)
  state.annotateSession = clearCurrentRecord(state.annotateSession)
  state.annotateElements.clear()
}

export function cancelCurrentAnnotationRecord(
  state: AnnotateCurrentDiscardContext,
  clearDraftForTarget: (target: AnnotationTarget | null | undefined) => void,
  restoreEditingRecord: () => void,
): void {
  clearCurrentAnnotationDraft(state, clearDraftForTarget)
  restoreEditingRecord()
}

export function deleteEditingAnnotationRecord(
  state: AnnotateCurrentDiscardContext,
  clearDraftForTarget: (target: AnnotationTarget | null | undefined) => void,
  _restoreEditingRecord?: () => void,
): void {
  state.annotateEditingRecord = null
  clearCurrentAnnotationDraft(state, clearDraftForTarget)
}
