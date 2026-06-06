import { describe, expect, it, vi } from 'vitest'
import { createAnnotateSidebarDom } from '../src/features/annotate/sidebar/dom.js'
import { attachAnnotateSidebarEvents } from '../src/features/annotate/sidebar/events.js'
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

describe('attachAnnotateSidebarEvents', () => {
  it('routes primary action button clicks through the latest options', () => {
    const host = document.createElement('div')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const dom = createAnnotateSidebarDom(shadowRoot)
    const firstQuickAsk = vi.fn()
    const secondQuickAsk = vi.fn()
    let options = createOptions({ onQuickAsk: firstQuickAsk })

    attachAnnotateSidebarEvents({
      dom,
      getOptions: () => options,
      toggleLatestSessionTimeline: vi.fn(),
      handleInstructionInput: vi.fn(),
    })

    options = createOptions({ onQuickAsk: secondQuickAsk })
    dom.quickAskButton.click()

    expect(firstQuickAsk).not.toHaveBeenCalled()
    expect(secondQuickAsk).toHaveBeenCalledTimes(1)
  })

  it('uses the current mode when routing mode toggle clicks', () => {
    const host = document.createElement('div')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const dom = createAnnotateSidebarDom(shadowRoot)
    const onPauseCapture = vi.fn()
    const onResumeCapture = vi.fn()
    let options = createOptions({ mode: 'capture-enabled', onPauseCapture, onResumeCapture })

    attachAnnotateSidebarEvents({
      dom,
      getOptions: () => options,
      toggleLatestSessionTimeline: vi.fn(),
      handleInstructionInput: vi.fn(),
    })

    dom.modeButton.click()
    options = createOptions({ mode: 'capture-paused', onPauseCapture, onResumeCapture })
    dom.modeButton.click()

    expect(onPauseCapture).toHaveBeenCalledTimes(1)
    expect(onResumeCapture).toHaveBeenCalledTimes(1)
  })

  it('delegates instruction input and timeline toggle state back to the controller', () => {
    const host = document.createElement('div')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const dom = createAnnotateSidebarDom(shadowRoot)
    const toggleLatestSessionTimeline = vi.fn()
    const handleInstructionInput = vi.fn()

    attachAnnotateSidebarEvents({
      dom,
      getOptions: () => createOptions(),
      toggleLatestSessionTimeline,
      handleInstructionInput,
    })

    dom.latestSessionTimelineToggle.click()
    dom.instructionInput.dispatchEvent(new InputEvent('input', { bubbles: true }))

    expect(toggleLatestSessionTimeline).toHaveBeenCalledTimes(1)
    expect(handleInstructionInput).toHaveBeenCalledTimes(1)
  })
})
