import type { AnnotationSessionEvent, AnnotationWorkSession } from '@inspecto-dev/types'
import {
  fetchAnnotationSession,
  openAnnotationSessionEventStream,
} from '../transport/http-client.js'
import { asAnnotateContext } from './annotate-shared.js'
import { toAnnotateErrorMessage } from './annotate-errors.js'

function updateLatestSessionState(ctx: unknown, session: AnnotationWorkSession): void {
  const state = asAnnotateContext(ctx)
  state.annotateLatestSessionDetail = session
  state.annotateLatestSessionSummary = {
    id: session.id,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }
  state.annotateLatestSessionError = ''

  if (session.status === 'resolved' || session.status === 'dismissed') {
    state.stopLatestAnnotateSessionStream()
  }

  state.renderAnnotateSelectionOverlay()
}

export async function refreshLatestAnnotateSession(ctx: unknown): Promise<void> {
  const state = asAnnotateContext(ctx)
  const sessionId = state.annotateLatestSessionSummary?.id ?? state.annotateLatestSessionDetail?.id
  if (!sessionId || state.annotateLatestSessionLoading) return

  state.annotateLatestSessionLoading = true
  state.annotateLatestSessionError = ''
  state.updateAnnotateSidebar()

  try {
    const result = await fetchAnnotationSession(sessionId)
    if (!result.success || !result.session) {
      state.annotateLatestSessionError = toAnnotateErrorMessage(
        state,
        result.errorCode,
        result.error ?? 'Failed to refresh latest session.',
      )
      return
    }

    updateLatestSessionState(state, result.session)
  } finally {
    state.annotateLatestSessionLoading = false
    state.updateAnnotateSidebar()
  }
}

export function startLatestAnnotateSessionStream(ctx: unknown, sessionId: string): void {
  const state = asAnnotateContext(ctx)
  state.stopLatestAnnotateSessionStream()

  const connection = openAnnotationSessionEventStream(sessionId, {
    onEvent: (event: AnnotationSessionEvent) => {
      if (event.session.id !== sessionId) return
      updateLatestSessionState(state, event.session)
      state.updateAnnotateSidebar()
    },
    onError: () => {
      state.annotateLatestSessionError =
        'Live session updates disconnected. You can refresh to reconnect.'
      state.updateAnnotateSidebar()
    },
  })

  state.annotateLatestSessionStream = connection
}

export function stopLatestAnnotateSessionStream(ctx: unknown): void {
  const state = asAnnotateContext(ctx)
  state.annotateLatestSessionStream?.close()
  state.annotateLatestSessionStream = null
}
