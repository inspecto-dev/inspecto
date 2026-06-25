import {
  clearCurrentRecord,
  createEmptySession,
  removeRecord,
} from '../features/annotate/session/index.js'
import type { AnnotationTarget, FeedbackRecord } from '@inspecto-dev/types'

type RemovePromptChipContext = {
  annotateSession: ReturnType<typeof createEmptySession>
  annotateEditingRecord: FeedbackRecord | null
  annotateElements: Map<string, Element>
}

export function removeAnnotatePromptChip(
  state: RemovePromptChipContext,
  recordId: string,
  clearDraftForTarget: (target: AnnotationTarget | null | undefined) => void,
): void {
  const currentTarget =
    state.annotateSession.current.id === recordId ? state.annotateSession.current.target : null
  const savedRecord = state.annotateSession.records.find(record => record.id === recordId) ?? null

  if (currentTarget) {
    clearDraftForTarget(currentTarget)
    state.annotateSession = clearCurrentRecord(state.annotateSession)
    state.annotateEditingRecord = null
    state.annotateElements.clear()
    return
  }

  if (savedRecord) {
    clearDraftForTarget(savedRecord.target)
    state.annotateSession = removeRecord(state.annotateSession, recordId)
  }
}
