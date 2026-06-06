import type { AnnotationTarget, FeedbackRecord } from '@inspecto-dev/types'
import { describe, expect, it, vi } from 'vitest'
import { createEmptySession } from '../src/features/annotate/session/index.js'
import {
  cancelCurrentAnnotationRecord,
  deleteEditingAnnotationRecord,
} from '../src/runtime/annotate-current-discard.js'

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

function createContext() {
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
    annotateEditingRecord: createRecord('editing'),
    annotateElements: new Map([[target.id, document.createElement('button')]]),
  }
}

describe('discard current annotation record', () => {
  it('cancels the current draft and restores any editing record', () => {
    const ctx = createContext()
    const target = ctx.annotateSession.current.target
    const clearDraftForTarget = vi.fn()
    const restoreEditingRecord = vi.fn()

    cancelCurrentAnnotationRecord(ctx, clearDraftForTarget, restoreEditingRecord)

    expect(clearDraftForTarget).toHaveBeenCalledWith(target)
    expect(restoreEditingRecord).toHaveBeenCalled()
    expect(ctx.annotateSession.current.target).toBeNull()
    expect(ctx.annotateEditingRecord?.id).toBe('editing')
    expect(ctx.annotateElements.size).toBe(0)
  })

  it('deletes the editing draft without restoring it', () => {
    const ctx = createContext()
    const clearDraftForTarget = vi.fn()
    const restoreEditingRecord = vi.fn()

    deleteEditingAnnotationRecord(ctx, clearDraftForTarget, restoreEditingRecord)

    expect(clearDraftForTarget).toHaveBeenCalledWith(createTarget('current'))
    expect(restoreEditingRecord).not.toHaveBeenCalled()
    expect(ctx.annotateSession.current.target).toBeNull()
    expect(ctx.annotateEditingRecord).toBeNull()
    expect(ctx.annotateElements.size).toBe(0)
  })
})
