import { describe, expect, it } from 'vitest'
import { getAnnotateSidebarViewState } from '../src/features/annotate/sidebar/view-state.js'
import type { AnnotateSidebarOptions } from '../src/features/annotate/sidebar/types.js'
import { renderAnnotateSidebarHeaderControls } from '../src/features/annotate/sidebar/header-controls.js'

function createOptions(overrides: Partial<AnnotateSidebarOptions> = {}): AnnotateSidebarOptions {
  return {
    mode: 'capture-enabled',
    session: {
      current: {
        id: 'draft-1',
        target: {
          id: 'target-1',
          label: 'Button',
          location: { file: '/repo/App.tsx', line: 1, column: 1 },
          rect: { x: 0, y: 0, width: 10, height: 10 },
        },
        note: 'Fix spacing.',
        intent: 'review',
      },
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

function createDom() {
  return {
    headerStatus: document.createElement('div'),
    quickCaptureButton: document.createElement('button'),
    cssContextButton: document.createElement('button'),
    runtimeContextButton: document.createElement('button'),
    runtimeContextBadge: document.createElement('span'),
    modeButton: document.createElement('button'),
  }
}

describe('annotate sidebar header controls renderer', () => {
  it('reflects active quick capture and attachable context controls', () => {
    const dom = createDom()
    const options = createOptions({
      quickCaptureEnabled: true,
      canAttachCssContext: true,
      cssContextEnabled: true,
      canAttachRuntimeContext: true,
      runtimeContextEnabled: true,
      runtimeContextSummary: '1 runtime issue captured',
      runtimeErrorCount: 3,
    })

    renderAnnotateSidebarHeaderControls(dom, options, getAnnotateSidebarViewState(options))

    expect(dom.quickCaptureButton.getAttribute('aria-pressed')).toBe('true')
    expect(dom.quickCaptureButton.dataset.active).toBe('true')
    expect(dom.quickCaptureButton.dataset.visualState).toBe('active')
    expect(dom.quickCaptureButton.title).toBe('Toggle quick capture on')
    expect(dom.cssContextButton.style.display).toBe('')
    expect(dom.cssContextButton.getAttribute('aria-pressed')).toBe('true')
    expect(dom.cssContextButton.dataset.visualState).toBe('active')
    expect(dom.runtimeContextButton.style.display).toBe('')
    expect(dom.runtimeContextButton.getAttribute('aria-pressed')).toBe('true')
    expect(dom.runtimeContextBadge.textContent).toBe('3')
    expect(dom.runtimeContextBadge.hidden).toBe(false)
    expect(dom.runtimeContextButton.title).toBe('Runtime context enabled • 3 errors')
    expect(dom.modeButton.getAttribute('aria-label')).toBe('Pause selection')
    expect(dom.modeButton.dataset.selected).toBe('true')
    expect(dom.modeButton.querySelector('svg')).not.toBeNull()
    expect(dom.headerStatus.textContent).toBe('Capturing clicks • Toggle quick capture on')
  })

  it('hides context controls without batch content and renders paused state', () => {
    const dom = createDom()
    const options = createOptions({
      mode: 'capture-paused',
      quickCaptureEnabled: false,
      canAttachCssContext: true,
      canAttachRuntimeContext: true,
      runtimeErrorCount: 0,
      session: {
        current: { id: 'draft-1', target: null, note: '', intent: 'review' },
        records: [],
      },
    })

    renderAnnotateSidebarHeaderControls(dom, options, getAnnotateSidebarViewState(options))

    expect(dom.quickCaptureButton.getAttribute('aria-pressed')).toBe('false')
    expect(dom.quickCaptureButton.dataset.visualState).toBe('inactive')
    expect(dom.quickCaptureButton.title).toBe('Toggle quick capture')
    expect(dom.cssContextButton.style.display).toBe('none')
    expect(dom.runtimeContextButton.style.display).toBe('none')
    expect(dom.runtimeContextBadge.hidden).toBe(true)
    expect(dom.modeButton.getAttribute('aria-label')).toBe('Resume selection')
    expect(dom.modeButton.dataset.selected).toBe('false')
    expect(dom.headerStatus.textContent).toBe('Selection paused')
  })
})
