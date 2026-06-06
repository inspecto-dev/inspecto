import type { AnnotationTarget, FeedbackRecord } from '@inspecto-dev/types'
import { describe, expect, it, vi } from 'vitest'
import { createEmptySession } from '../src/features/annotate/session/index.js'
import { saveCurrentAnnotationRecord } from '../src/runtime/annotate-current-save.js'

function createTarget(id: string): AnnotationTarget {
  return {
    id,
    label: id,
    selector: `#${id}`,
    location: { file: '/repo/App.tsx', line: 10, column: 2 },
    rect: { x: 0, y: 0, width: 120, height: 32 },
  }
}

function createRecord(id: string): FeedbackRecord {
  return {
    id,
    target: createTarget(id),
    note: `note-${id}`,
    intent: 'review',
    order: 1,
    displayOrder: 1,
    createdAt: 1,
  }
}

function createContext(overrides: Record<string, unknown> = {}) {
  const target = createTarget('current')
  return {
    annotateSession: {
      ...createEmptySession(),
      current: {
        id: 'current-record',
        target,
        note: 'draft',
        intent: 'review' as const,
        displayOrder: 2,
      },
      records: [createRecord('saved')],
    },
    annotateLatestSessionSummary: null,
    annotateLatestSessionDetail: null,
    annotateInstructionDraft: 'instruction',
    annotateDrafts: new Map([[target.id, { note: 'draft' }]]),
    annotateEditingRecord: createRecord('editing'),
    annotateElements: new Map([[target.id, document.createElement('button')]]),
    stopLatestAnnotateSessionStream: vi.fn(),
    ...overrides,
  }
}

describe('save current annotation record', () => {
  it('does nothing when there is no current target', () => {
    const ctx = createContext({
      annotateSession: {
        ...createEmptySession(),
        current: {
          ...createEmptySession().current,
          id: 'current-record',
          target: null,
        },
      },
    })
    const clearDraftForTarget = vi.fn()

    saveCurrentAnnotationRecord(ctx, clearDraftForTarget)

    expect(clearDraftForTarget).not.toHaveBeenCalled()
    expect(ctx.annotateSession.records).toEqual([])
  })

  it('saves the current draft as a record and clears transient editing state', () => {
    const ctx = createContext()
    const target = ctx.annotateSession.current.target
    const clearDraftForTarget = vi.fn()

    saveCurrentAnnotationRecord(ctx, clearDraftForTarget)

    expect(clearDraftForTarget).toHaveBeenCalledWith(target)
    expect(ctx.annotateSession.current.target).toBeNull()
    expect(ctx.annotateSession.records.map(record => record.id)).toEqual([
      'saved',
      'current-record',
    ])
    expect(ctx.annotateEditingRecord).toBeNull()
    expect(ctx.annotateElements.size).toBe(0)
  })

  it('resets stale resolved session state before saving into a fresh batch', () => {
    const ctx = createContext({
      annotateLatestSessionSummary: { id: 's1', status: 'resolved' },
      annotateLatestSessionDetail: { id: 's1', status: 'running' },
    })

    saveCurrentAnnotationRecord(ctx, vi.fn())

    expect(ctx.stopLatestAnnotateSessionStream).toHaveBeenCalled()
    expect(ctx.annotateLatestSessionSummary).toBeNull()
    expect(ctx.annotateLatestSessionDetail).toBeNull()
    expect(ctx.annotateInstructionDraft).toBe('')
    expect(ctx.annotateDrafts.size).toBe(0)
    expect(ctx.annotateSession.records.map(record => record.id)).toEqual(['current-record'])
  })
})
