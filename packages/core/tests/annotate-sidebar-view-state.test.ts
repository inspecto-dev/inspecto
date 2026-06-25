import { describe, expect, it, vi } from 'vitest'
import { getAnnotateSidebarViewState } from '../src/features/annotate/sidebar/view-state.js'
import type { AnnotateSidebarOptions } from '../src/features/annotate/sidebar/types.js'

function createOptions(overrides: Partial<AnnotateSidebarOptions> = {}): AnnotateSidebarOptions {
  return {
    mode: 'capture-enabled',
    session: {
      current: { id: 'draft-1', target: null, note: '', intent: 'review' },
      records: [],
    },
    instruction: '',
    includedRecords: [],
    fullPrompt: '',
    isSending: false,
    sendingScope: null,
    successScope: null,
    onPauseCapture: vi.fn(),
    onResumeCapture: vi.fn(),
    onUpdateInstruction: vi.fn(),
    onRemovePromptChip: vi.fn(),
    onQuickAsk: vi.fn(),
    onCreateTask: vi.fn(),
    onExit: vi.fn(),
    ...overrides,
  }
}

describe('getAnnotateSidebarViewState', () => {
  it('keeps an empty sidebar body hidden by default', () => {
    expect(getAnnotateSidebarViewState(createOptions())).toMatchObject({
      hasSavedRecords: false,
      hasCurrentDraft: false,
      hasBatchContent: false,
      shouldShowBody: false,
      canSend: false,
      preferredAction: 'create-task',
      deliveryMode: 'mcp',
      showDebugHelperActions: false,
      allowQuickAsk: false,
      allowCreateTask: true,
    })
  })

  it('allows sending when a current draft exists and the sidebar is not sending', () => {
    expect(
      getAnnotateSidebarViewState(
        createOptions({
          session: {
            current: {
              id: 'draft-1',
              target: {
                id: 'target-1',
                label: 'Button',
                location: { file: '/repo/App.tsx', line: 1, column: 1 },
                rect: { x: 0, y: 0, width: 10, height: 10 },
              },
              note: 'Fix spacing',
              intent: 'review',
            },
            records: [],
          },
        }),
      ),
    ).toMatchObject({
      hasCurrentDraft: true,
      hasBatchContent: true,
      shouldShowBody: true,
      canSend: true,
    })
  })

  it('disables sending while a request is in flight but keeps progress visible', () => {
    expect(
      getAnnotateSidebarViewState(
        createOptions({
          isSending: true,
          includedRecords: [
            {
              id: 'record-1',
              displayOrder: 1,
              target: {
                id: 'target-1',
                label: 'Button',
                location: { file: '/repo/App.tsx', line: 1, column: 1 },
                rect: { x: 0, y: 0, width: 10, height: 10 },
              },
              note: 'Fix spacing',
              intent: 'review',
            },
          ],
        }),
      ),
    ).toMatchObject({
      shouldShowBody: true,
      canSend: false,
    })
  })

  it('exposes IDE-only helper actions and quick ask primary action in IDE mode', () => {
    expect(
      getAnnotateSidebarViewState(
        createOptions({
          deliveryMode: 'ide',
          preferredAction: 'quick-ask',
        }),
      ),
    ).toMatchObject({
      preferredAction: 'quick-ask',
      deliveryMode: 'ide',
      showDebugHelperActions: true,
      allowQuickAsk: true,
      allowCreateTask: false,
    })
  })
})
