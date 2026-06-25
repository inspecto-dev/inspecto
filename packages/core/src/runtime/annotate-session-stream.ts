import type { AnnotationSessionEvent } from '@inspecto-dev/types'
import {
  fetchAnnotationSession,
  openAnnotationSessionEventStream,
} from '../transport/http-client.js'
import { asAnnotateContext } from './annotate-shared.js'
import { toAnnotateErrorMessage } from './annotate-errors.js'
import { applyLatestAnnotationSession } from './annotate-latest-session-state.js'

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

    applyLatestAnnotationSession(state, result.session)
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
      applyLatestAnnotationSession(state, event.session)
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
