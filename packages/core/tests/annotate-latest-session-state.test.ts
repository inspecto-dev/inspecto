import type { AnnotationWorkSession } from '@inspecto-dev/types'
import { describe, expect, it, vi } from 'vitest'
import { applyLatestAnnotationSession } from '../src/runtime/annotate-latest-session-state.js'

function createSession(status: AnnotationWorkSession['status']): AnnotationWorkSession {
  return {
    id: 'session-1',
    status,
    createdAt: 1,
    updatedAt: 2,
    records: [],
    events: [],
  }
}

function createContext() {
  return {
    annotateLatestSessionDetail: null,
    annotateLatestSessionSummary: null,
    annotateLatestSessionError: 'failed',
    stopLatestAnnotateSessionStream: vi.fn(),
    renderAnnotateSelectionOverlay: vi.fn(),
  }
}

describe('latest annotation session state', () => {
  it('stores session detail and derived summary while clearing previous errors', () => {
    const ctx = createContext()
    const session = createSession('running')

    applyLatestAnnotationSession(ctx, session)

    expect(ctx.annotateLatestSessionDetail).toBe(session)
    expect(ctx.annotateLatestSessionSummary).toEqual({
      id: 'session-1',
      status: 'running',
      createdAt: 1,
      updatedAt: 2,
    })
    expect(ctx.annotateLatestSessionError).toBe('')
    expect(ctx.stopLatestAnnotateSessionStream).not.toHaveBeenCalled()
    expect(ctx.renderAnnotateSelectionOverlay).toHaveBeenCalled()
  })

  it('stops live updates once the session is terminal', () => {
    const ctx = createContext()

    applyLatestAnnotationSession(ctx, createSession('resolved'))

    expect(ctx.stopLatestAnnotateSessionStream).toHaveBeenCalled()
  })
})
