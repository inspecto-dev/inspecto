import { describe, expect, it } from 'vitest'
import { renderAnnotateSidebarPrimaryActions } from '../src/features/annotate/sidebar/primary-actions.js'
import type { AnnotateSidebarViewState } from '../src/features/annotate/sidebar/view-state.js'
import type { AnnotateSidebarOptions } from '../src/features/annotate/sidebar/types.js'

function createDom(): {
  quickAskButton: HTMLButtonElement
  createTaskButton: HTMLButtonElement
  recommendedActionLabel: HTMLDivElement
} {
  return {
    quickAskButton: document.createElement('button'),
    createTaskButton: document.createElement('button'),
    recommendedActionLabel: document.createElement('div'),
  }
}

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
    onPauseCapture: () => undefined,
    onResumeCapture: () => undefined,
    onUpdateInstruction: () => undefined,
    onRemovePromptChip: () => undefined,
    onQuickAsk: () => undefined,
    onCreateTask: () => undefined,
    onExit: () => undefined,
    ...overrides,
  }
}

function createViewState(
  overrides: Partial<AnnotateSidebarViewState> = {},
): AnnotateSidebarViewState {
  return {
    hasSavedRecords: false,
    hasCurrentDraft: false,
    hasBatchContent: false,
    shouldShowBody: true,
    canSend: true,
    preferredAction: 'create-task',
    deliveryMode: 'mcp',
    showDebugHelperActions: false,
    allowQuickAsk: false,
    allowCreateTask: true,
    ...overrides,
  }
}

describe('annotate sidebar primary actions renderer', () => {
  it('renders create task as the enabled primary action in MCP mode', () => {
    const dom = createDom()

    renderAnnotateSidebarPrimaryActions(dom, createOptions(), createViewState())

    expect(dom.quickAskButton.style.display).toBe('none')
    expect(dom.createTaskButton.style.display).toBe('')
    expect(dom.quickAskButton.disabled).toBe(false)
    expect(dom.createTaskButton.disabled).toBe(false)
    expect(dom.quickAskButton.classList.contains('primary')).toBe(true)
    expect(dom.createTaskButton.classList.contains('primary')).toBe(true)
    expect(dom.quickAskButton.dataset.emphasis).toBe('primary')
    expect(dom.createTaskButton.dataset.emphasis).toBe('primary')
    expect(dom.quickAskButton.dataset.layoutRole).toBe('primary')
    expect(dom.createTaskButton.dataset.layoutRole).toBe('primary')
    expect(dom.quickAskButton.style.flex).toBe('1 1 0%')
    expect(dom.createTaskButton.style.flex).toBe('1 1 0%')
    expect(dom.quickAskButton.title).toBe('Ask AI')
    expect(dom.createTaskButton.title).toBe('Create Task')
    expect(dom.recommendedActionLabel.style.display).toBe('none')
    expect(dom.createTaskButton.textContent).toBe('Create Task')
  })

  it('renders quick ask sending and sent states in IDE mode', () => {
    const dom = createDom()
    const viewState = createViewState({
      preferredAction: 'quick-ask',
      deliveryMode: 'ide',
      allowQuickAsk: true,
      allowCreateTask: false,
      canSend: false,
    })

    renderAnnotateSidebarPrimaryActions(
      dom,
      createOptions({ isSending: true, sendingScope: 'quick-ask' }),
      viewState,
    )

    expect(dom.quickAskButton.style.display).toBe('')
    expect(dom.createTaskButton.style.display).toBe('none')
    expect(dom.quickAskButton.disabled).toBe(true)
    expect(dom.createTaskButton.disabled).toBe(true)
    expect(dom.quickAskButton.textContent).toBe('Sending...')

    renderAnnotateSidebarPrimaryActions(
      dom,
      createOptions({ isSending: false, successScope: 'quick-ask' }),
      createViewState({
        preferredAction: 'quick-ask',
        deliveryMode: 'ide',
        allowQuickAsk: true,
        allowCreateTask: false,
        canSend: true,
      }),
    )

    expect(dom.quickAskButton.disabled).toBe(false)
    expect(dom.quickAskButton.textContent).toBe('Sent')
  })
})
