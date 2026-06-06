import type { AnnotationWorkSession } from '@inspecto-dev/types'

type LatestAnnotationSessionStateContext = {
  annotateLatestSessionDetail: AnnotationWorkSession | null
  annotateLatestSessionSummary: {
    id: string
    status: AnnotationWorkSession['status']
    createdAt: AnnotationWorkSession['createdAt']
    updatedAt: AnnotationWorkSession['updatedAt']
  } | null
  annotateLatestSessionError: string
  stopLatestAnnotateSessionStream(): void
  renderAnnotateSelectionOverlay(): void
}

export function applyLatestAnnotationSession(
  state: LatestAnnotationSessionStateContext,
  session: AnnotationWorkSession,
): void {
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
