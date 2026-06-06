import { saveCurrentRecord } from '../features/annotate/session/index.js'
import type { AnnotationTarget, FeedbackRecord } from '@inspecto-dev/types'
import type { createEmptySession } from '../features/annotate/session/index.js'

type AnnotateCurrentSaveContext = {
  annotateSession: ReturnType<typeof createEmptySession>
  annotateLatestSessionSummary: { status?: string } | null
  annotateLatestSessionDetail: { status?: string } | null
  annotateInstructionDraft: string
  annotateDrafts: Map<string, unknown>
  annotateEditingRecord: FeedbackRecord | null
  annotateElements: Map<string, Element>
  stopLatestAnnotateSessionStream(): void
}

function hasResolvedSession(state: AnnotateCurrentSaveContext): boolean {
  return (
    state.annotateLatestSessionSummary?.status === 'resolved' ||
    state.annotateLatestSessionDetail?.status === 'resolved'
  )
}

function resetResolvedSessionForFreshBatch(state: AnnotateCurrentSaveContext): void {
  const currentDraft = state.annotateSession.current
  state.annotateLatestSessionSummary = null
  state.annotateLatestSessionDetail = null
  state.stopLatestAnnotateSessionStream()
  state.annotateInstructionDraft = ''
  state.annotateDrafts.clear()
  state.annotateEditingRecord = null
  state.annotateSession = {
    current: currentDraft,
    records: [],
  }
}

export function saveCurrentAnnotationRecord(
  state: AnnotateCurrentSaveContext,
  clearDraftForTarget: (target: AnnotationTarget | null | undefined) => void,
): void {
  if (!state.annotateSession.current.target) return

  if (hasResolvedSession(state)) {
    resetResolvedSessionForFreshBatch(state)
  }

  clearDraftForTarget(state.annotateSession.current.target)
  state.annotateSession = saveCurrentRecord(state.annotateSession)
  state.annotateEditingRecord = null
  state.annotateElements.clear()
}
