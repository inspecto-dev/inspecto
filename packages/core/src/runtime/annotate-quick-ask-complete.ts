import { createEmptySession } from '../features/annotate/session/index.js'
import type { FeedbackRecord } from '@inspecto-dev/types'

type QuickAskCompletionContext = {
  annotateInstructionDraft: string
  annotateDrafts: Map<string, unknown>
  annotateEditingRecord: FeedbackRecord | null
  annotateSession: ReturnType<typeof createEmptySession>
  annotateElements: Map<string, Element>
}

export function completeQuickAskAnnotationBatch(state: QuickAskCompletionContext): void {
  state.annotateInstructionDraft = ''
  state.annotateDrafts.clear()
  state.annotateEditingRecord = null
  state.annotateSession = createEmptySession()
  state.annotateElements.clear()
}
