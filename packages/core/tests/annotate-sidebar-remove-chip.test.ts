import type { AnnotationTarget, FeedbackRecord } from '@inspecto-dev/types'
import { describe, expect, it, vi } from 'vitest'
import { createEmptySession } from '../src/features/annotate/session/index.js'
import { removeAnnotatePromptChip } from '../src/runtime/annotate-sidebar-remove-chip.js'

function createTarget(id: string): AnnotationTarget {
  return {
    id,
    label: id,
    selector: `#${id}`,
    location: { file: '/repo/App.tsx', line: id === 'current' ? 10 : 20, column: 2 },
    rect: { x: 0, y: 0, width: 120, height: 32 },
  }
}

function createRecord(id: string, target = createTarget(id)): FeedbackRecord {
  return {
    id,
    target,
    note: `note-${id}`,
    intent: 'review',
    order: 1,
    createdAt: 1,
  }
}

function createContext() {
  const currentTarget = createTarget('current')
  const savedRecord = createRecord('saved')
  return {
    annotateSession: {
      ...createEmptySession(),
      current: {
        id: 'current-record',
        target: currentTarget,
        note: 'draft',
        intent: 'review' as const,
        order: 1,
      },
      records: [savedRecord],
    },
    annotateEditingRecord: savedRecord,
    annotateElements: new Map([
      ['current', document.createElement('button')],
      ['saved', document.createElement('button')],
    ]),
  }
}

describe('annotate sidebar remove chip', () => {
  it('clears the current draft chip and resets transient annotation elements', () => {
    const ctx = createContext()
    const currentTarget = ctx.annotateSession.current.target
    const clearDraftForTarget = vi.fn()

    removeAnnotatePromptChip(ctx, 'current-record', clearDraftForTarget)

    expect(clearDraftForTarget).toHaveBeenCalledWith(currentTarget)
    expect(ctx.annotateSession.current.target).toBeNull()
    expect(ctx.annotateEditingRecord).toBeNull()
    expect(ctx.annotateElements.size).toBe(0)
  })

  it('removes a saved record chip without clearing unrelated element bindings', () => {
    const ctx = createContext()
    const clearDraftForTarget = vi.fn()

    removeAnnotatePromptChip(ctx, 'saved', clearDraftForTarget)

    expect(clearDraftForTarget).toHaveBeenCalledWith(createTarget('saved'))
    expect(ctx.annotateSession.records).toEqual([])
    expect(ctx.annotateSession.current.target?.id).toBe('current')
    expect(ctx.annotateElements.size).toBe(2)
  })

  it('leaves session state unchanged when the record id does not exist', () => {
    const ctx = createContext()
    const session = ctx.annotateSession
    const clearDraftForTarget = vi.fn()

    removeAnnotatePromptChip(ctx, 'missing', clearDraftForTarget)

    expect(ctx.annotateSession).toBe(session)
    expect(clearDraftForTarget).not.toHaveBeenCalled()
  })
})
