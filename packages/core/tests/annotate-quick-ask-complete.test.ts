import type { AnnotationTarget, FeedbackRecord } from '@inspecto-dev/types'
import { describe, expect, it } from 'vitest'
import { createEmptySession } from '../src/features/annotate/session/index.js'
import { completeQuickAskAnnotationBatch } from '../src/runtime/annotate-quick-ask-complete.js'

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

describe('complete quick ask annotation batch', () => {
  it('clears draft, editing, session, and element state after quick ask sends', () => {
    const target = createTarget('current')
    const ctx = {
      annotateInstructionDraft: 'instruction',
      annotateDrafts: new Map([[target.id, { note: 'draft' }]]),
      annotateEditingRecord: createRecord('editing'),
      annotateSession: {
        ...createEmptySession(),
        current: {
          ...createEmptySession().current,
          id: 'current-record',
          target,
        },
        records: [createRecord('saved')],
      },
      annotateElements: new Map([[target.id, document.createElement('button')]]),
    }

    completeQuickAskAnnotationBatch(ctx)

    expect(ctx.annotateInstructionDraft).toBe('')
    expect(ctx.annotateDrafts.size).toBe(0)
    expect(ctx.annotateEditingRecord).toBeNull()
    expect(ctx.annotateSession.current.target).toBeNull()
    expect(ctx.annotateSession.current.note).toBe('')
    expect(ctx.annotateSession.records).toEqual([])
    expect(ctx.annotateElements.size).toBe(0)
  })
})
