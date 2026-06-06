import type { AnnotationTarget, FeedbackRecord, FeedbackRecordDraft } from '@inspecto-dev/types'
import { describe, expect, it } from 'vitest'
import {
  clearDraftForTarget,
  persistCurrentDraft,
  restoreEditingRecord,
} from '../src/features/annotate/targets/draft-store.js'

function createTarget(id: string, line = 10): AnnotationTarget {
  return {
    id,
    label: `Button ${id}`,
    selector: `#${id}`,
    location: { file: '/repo/App.tsx', line, column: 2 },
    rect: { x: 0, y: 0, width: 100, height: 32 },
  }
}

function createRecord(id: string, displayOrder: number, target = createTarget(id)): FeedbackRecord {
  return {
    id,
    displayOrder,
    target,
    note: `Note ${id}`,
    intent: 'review',
  }
}

function createContext(
  overrides: {
    current?: Partial<FeedbackRecordDraft>
    records?: FeedbackRecord[]
    editingRecord?: FeedbackRecord | null
  } = {},
) {
  return {
    annotateSession: {
      current: {
        id: 'draft-1',
        target: createTarget('target-1'),
        note: 'Draft note',
        intent: 'review' as const,
        ...overrides.current,
      },
      records: overrides.records ?? [],
    },
    annotateDrafts: new Map<string, FeedbackRecordDraft>(),
    annotateEditingRecord: overrides.editingRecord ?? null,
  }
}

describe('annotate target draft store', () => {
  it('removes empty review drafts without CSS context', () => {
    const target = createTarget('target-1')
    const ctx = createContext({
      current: {
        target,
        note: '   ',
        intent: 'review',
        cssContextEnabled: false,
      },
    })
    ctx.annotateDrafts.set('/repo/App.tsx:10:2::#target-1', {
      id: 'draft-1',
      target,
      note: 'Old note',
      intent: 'review',
    })

    persistCurrentDraft(ctx)

    expect(ctx.annotateDrafts.has('/repo/App.tsx:10:2::#target-1')).toBe(false)
  })

  it('persists meaningful current drafts and clears drafts by target', () => {
    const target = createTarget('target-1')
    const ctx = createContext({
      current: {
        target,
        note: 'Keep this note',
      },
    })

    persistCurrentDraft(ctx)

    expect(ctx.annotateDrafts.get('/repo/App.tsx:10:2::#target-1')).toMatchObject({
      id: 'draft-1',
      target,
      note: 'Keep this note',
    })

    clearDraftForTarget(ctx, target)

    expect(ctx.annotateDrafts.size).toBe(0)
  })

  it('restores the editing record in display order and clears editing state', () => {
    const editingTarget = createTarget('target-2', 20)
    const editingRecord = createRecord('record-2', 2, editingTarget)
    const ctx = createContext({
      current: {
        id: 'record-2',
        displayOrder: 2,
        target: editingTarget,
        note: 'Updated note',
      },
      records: [createRecord('record-3', 3), createRecord('record-1', 1)],
      editingRecord,
    })

    restoreEditingRecord(ctx)

    expect(ctx.annotateEditingRecord).toBeNull()
    expect(ctx.annotateSession.records.map(record => record.id)).toEqual([
      'record-1',
      'record-2',
      'record-3',
    ])
    expect(ctx.annotateSession.records[1]).toMatchObject({
      id: 'record-2',
      displayOrder: 2,
      target: editingTarget,
      note: 'Updated note',
      intent: 'review',
    })
  })
})
