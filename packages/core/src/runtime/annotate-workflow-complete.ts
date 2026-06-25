import { createEmptySession } from '../features/annotate/session/index.js'
import type { FeedbackRecord } from '@inspecto-dev/types'
import type { AnnotateWorkflowNotice } from '../features/annotate/sidebar/types.js'

type WorkflowCompletionContext = {
  annotateInstructionDraft: string
  annotateSession: ReturnType<typeof createEmptySession>
  annotateEditingRecord: FeedbackRecord | null
  annotateElements: Map<string, Element>
  annotateLatestSessionSummary: unknown | null
  annotateLatestSessionDetail: unknown | null
  annotateLatestSessionError: string
  annotateWorkflowNotice: AnnotateWorkflowNotice | null
  stopLatestAnnotateSessionStream(): void
}

function clearWorkflowAnnotationState(state: WorkflowCompletionContext): void {
  state.annotateInstructionDraft = ''
  state.annotateSession = createEmptySession()
  state.annotateEditingRecord = null
  state.annotateElements.clear()
}

export function completeIdeWorkflowDispatch(
  state: WorkflowCompletionContext,
  input: { workflowId: string; workflowLabel: string },
): void {
  clearWorkflowAnnotationState(state)
  state.annotateLatestSessionSummary = null
  state.annotateLatestSessionDetail = null
  state.stopLatestAnnotateSessionStream()
  state.annotateLatestSessionError = ''
  state.annotateWorkflowNotice = {
    kind: 'ide-dispatch',
    workflowId: input.workflowId,
    workflowLabel: input.workflowLabel,
  }
}

export function completeMcpWorkflowDispatch(state: WorkflowCompletionContext): void {
  clearWorkflowAnnotationState(state)
}
