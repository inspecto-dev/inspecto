import type { AnnotationTarget, FeedbackRecord } from '@inspecto-dev/types'
import { describe, expect, it, vi } from 'vitest'
import { createEmptySession } from '../src/features/annotate/session/index.js'
import {
  completeIdeWorkflowDispatch,
  completeMcpWorkflowDispatch,
} from '../src/runtime/annotate-workflow-complete.js'

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
    annotateInstructionDraft: 'instruction',
    annotateSession: {
      ...createEmptySession(),
      current: {
        ...createEmptySession().current,
        id: 'current-record',
        target,
      },
      records: [createRecord('saved')],
    },
    annotateEditingRecord: createRecord('editing'),
    annotateElements: new Map([[target.id, document.createElement('button')]]),
    annotateLatestSessionSummary: { id: 's1', status: 'running' },
    annotateLatestSessionDetail: { id: 's1', status: 'running' },
    annotateLatestSessionError: 'failed',
    annotateWorkflowNotice: null,
    stopLatestAnnotateSessionStream: vi.fn(),
  }
}

describe('workflow completion helpers', () => {
  it('clears annotation state and records an IDE workflow dispatch notice', () => {
    const ctx = createContext()

    completeIdeWorkflowDispatch(ctx, { workflowId: 'wf-1', workflowLabel: 'Review' })

    expect(ctx.annotateInstructionDraft).toBe('')
    expect(ctx.annotateSession.current.target).toBeNull()
    expect(ctx.annotateSession.records).toEqual([])
    expect(ctx.annotateEditingRecord).toBeNull()
    expect(ctx.annotateElements.size).toBe(0)
    expect(ctx.annotateLatestSessionSummary).toBeNull()
    expect(ctx.annotateLatestSessionDetail).toBeNull()
    expect(ctx.annotateLatestSessionError).toBe('')
    expect(ctx.stopLatestAnnotateSessionStream).toHaveBeenCalled()
    expect(ctx.annotateWorkflowNotice).toEqual({
      kind: 'ide-dispatch',
      workflowId: 'wf-1',
      workflowLabel: 'Review',
    })
  })

  it('clears annotation state for MCP workflow dispatch without creating an IDE notice', () => {
    const ctx = createContext()

    completeMcpWorkflowDispatch(ctx)

    expect(ctx.annotateInstructionDraft).toBe('')
    expect(ctx.annotateSession.current.target).toBeNull()
    expect(ctx.annotateSession.records).toEqual([])
    expect(ctx.annotateEditingRecord).toBeNull()
    expect(ctx.annotateElements.size).toBe(0)
    expect(ctx.annotateWorkflowNotice).toBeNull()
  })
})
