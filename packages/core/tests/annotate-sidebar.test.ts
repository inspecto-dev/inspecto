import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptySession } from '../src/annotate-session.js'
import { createAnnotateSidebar } from '../src/annotate-sidebar.js'
import {
  annotateQueueListClass,
  annotateSidebarActionsClass,
  annotateSidebarClass,
  annotateSidebarFooterClass,
  annotateSidebarInputClass,
  annotateSidebarQueueItemClass,
  annotateSidebarSectionClass,
  annotateSidebarTextClass,
} from '../src/styles.js'
import type { FeedbackRecordSession } from '@inspecto-dev/types'

function createTarget(id: string, line: number, label: string) {
  return {
    id,
    location: { file: '/repo/App.tsx', line, column: 2 },
    label,
    rect: { x: 0, y: 0, width: 10, height: 10 },
  }
}

function createRecordSession() {
  return {
    current: {
      id: 'draft-1',
      target: createTarget('target-current', 10, 'Button.primary'),
      note: 'Tighten the button spacing.',
      intent: 'review' as const,
    },
    records: [
      {
        id: 'record-1',
        displayOrder: 1,
        target: createTarget('target-1', 10, 'Button.primary'),
        note: 'Tighten the button spacing.',
        intent: 'review' as const,
      },
      {
        id: 'record-2',
        displayOrder: 2,
        target: createTarget('target-2', 14, 'HelperText'),
        note: 'Lift the helper text closer to the field.',
        intent: 'review' as const,
      },
    ],
  }
}

function createSidebarOptions(
  session: FeedbackRecordSession = createRecordSession(),
  overrides: Partial<Parameters<typeof createAnnotateSidebar>[1]> = {},
): Parameters<typeof createAnnotateSidebar>[1] {
  return {
    mode: 'capture-enabled',
    session,
    instruction: 'Review these feedback records and group related issues.',
    includedRecords: session.records,
    fullPrompt:
      'Review these feedback records and group related issues.\n\nPage Feedback:\n\nRecords:',
    isSending: false,
    sendingScope: null,
    successScope: null,
    errorMessage: '',
    onPauseCapture: vi.fn(),
    onResumeCapture: vi.fn(),
    onUpdateInstruction: vi.fn(),
    onRemovePromptChip: vi.fn(),
    onSend: vi.fn(),
    onEditRecord: vi.fn(),
    onExit: vi.fn(),
    ...overrides,
  }
}

describe('annotate sidebar', () => {
  let host: HTMLElement
  let shadowRoot: ShadowRoot

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    shadowRoot = host.attachShadow({ mode: 'open' })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function clickButtonByText(text: string): void {
    const button = Array.from(shadowRoot.querySelectorAll('button')).find(
      candidate => candidate.textContent === text,
    )

    expect(button).not.toBeUndefined()
    ;(button as HTMLButtonElement).click()
  }

  function clickButtonByLabel(label: string): void {
    const button = Array.from(shadowRoot.querySelectorAll('button')).find(
      candidate => candidate.getAttribute('aria-label') === label,
    )

    expect(button).not.toBeUndefined()
    ;(button as HTMLButtonElement).click()
  }

  it('renders the ai draft UI and wires interactions', () => {
    const onPauseCapture = vi.fn()
    const onEditRecord = vi.fn()
    const onUpdateInstruction = vi.fn()
    const onSend = vi.fn()
    const onExit = vi.fn()

    const sidebar = createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        onPauseCapture,
        onEditRecord,
        onUpdateInstruction,
        onSend,
        onExit,
      }),
    )

    expect(sidebar.element.className).toBe(annotateSidebarClass)
    expect(shadowRoot.querySelector(`.${annotateSidebarSectionClass}`)).not.toBeNull()
    expect(shadowRoot.querySelector(`.${annotateQueueListClass}`)).not.toBeNull()
    expect(shadowRoot.querySelector(`.${annotateSidebarFooterClass}`)).not.toBeNull()
    expect(shadowRoot.querySelector(`.${annotateSidebarActionsClass}`)).not.toBeNull()

    const instructionField = shadowRoot.querySelector(
      `.${annotateSidebarInputClass}`,
    ) as HTMLDivElement

    instructionField.textContent = 'Turn these into a coherent plan.'
    instructionField.dispatchEvent(new Event('input', { bubbles: true }))
    expect(onUpdateInstruction).toHaveBeenCalledWith('Turn these into a coherent plan.')

    clickButtonByLabel('Pause selection')
    expect(onPauseCapture).toHaveBeenCalled()

    const recordItems = Array.from(
      shadowRoot.querySelectorAll(`.${annotateSidebarQueueItemClass}`),
    ) as HTMLElement[]
    recordItems[0]!.click()
    expect(onEditRecord).toHaveBeenCalledWith('record-1')

    clickButtonByText('Ask AI')
    expect(onSend).toHaveBeenCalled()

    clickButtonByLabel('Exit annotate mode')
    expect(onExit).toHaveBeenCalled()

    sidebar.update(
      createSidebarOptions(createEmptySession(), {
        mode: 'capture-paused',
        includedRecords: [],
        onPauseCapture,
        onResumeCapture: vi.fn(),
        onUpdateInstruction,
        onEditRecord,
        onSend,
        onExit,
      }),
    )

    expect(
      Array.from(shadowRoot.querySelectorAll('button')).some(
        button => button.getAttribute('aria-label') === 'Resume selection',
      ),
    ).toBe(true)
    sidebar.destroy()
    expect(shadowRoot.querySelector(`.${annotateSidebarClass}`)).toBeNull()
  })

  it('keeps the header visible so quick capture is reachable in a fresh session', () => {
    const sidebar = createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createEmptySession(), {
        includedRecords: [],
      }),
    )

    expect(sidebar.element.style.display).toBe('')
    expect(shadowRoot.querySelector('button[aria-label="Toggle quick capture"]')).not.toBeNull()
    expect(
      (shadowRoot.querySelector('[data-inspecto-annotate-header-status="true"]') as HTMLElement)
        .textContent,
    ).toBe('Capturing clicks')
    expect(shadowRoot.textContent).toContain('Start by clicking a component')
    expect(shadowRoot.textContent).toContain(
      'Each click opens one note. Save a few notes first, then add an overall goal and Ask AI once.',
    )
    const buttons = Array.from(shadowRoot.querySelectorAll('button'))
    expect(buttons.find(button => button.textContent === 'Ask AI')?.hasAttribute('disabled')).toBe(
      true,
    )
    expect(
      buttons.find(button => button.getAttribute('title') === 'View raw prompt payload')?.style
        .display,
    ).toBe('none')
  })

  it('shows the sidebar once saved records exist', () => {
    const sidebar = createAnnotateSidebar(shadowRoot, createSidebarOptions())

    expect(sidebar.element.style.display).toBe('')
  })

  it('shows the current draft chip and enables review-all before records are saved', () => {
    const session = createEmptySession()
    session.current = {
      id: 'draft-1',
      target: createTarget('target-current', 20, '<h1>'),
      note: 'Explain hierarchy with the nav item.',
      intent: 'review',
    }

    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(session, {
        includedRecords: [],
      }),
    )

    const sendAll = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Ask AI',
    ) as HTMLButtonElement

    expect(sendAll.disabled).toBe(false)
    expect(shadowRoot.textContent).toContain('<h1>')
    expect(
      (shadowRoot.querySelector('[data-variant="empty-state"]') as HTMLElement).style.display,
    ).toBe('none')
  })

  it('reveals chip context on hover without changing selection', () => {
    const onEditRecord = vi.fn()

    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        onEditRecord,
      }),
    )

    const chip = shadowRoot.querySelector('[data-annotate-chip-id="record-1"]') as HTMLElement
    expect(chip).not.toBeNull()

    chip.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

    expect(shadowRoot.textContent).toContain('Tighten the button spacing.')
    expect(onEditRecord).not.toHaveBeenCalled()
  })

  it('constrains long prompt chips so they can truncate inside the composer input', () => {
    const session = createEmptySession()
    session.current = {
      id: 'draft-1',
      target: createTarget(
        'target-current',
        20,
        'h1.document_docNavBar__L2vQJ.document_hasDoc__jpd6x.documentWithTOC',
      ),
      note: 'Explain hierarchy with the nav item.',
      intent: 'review',
    }

    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(session, {
        includedRecords: [],
      }),
    )

    const chip = shadowRoot.querySelector('[data-annotate-chip-id="draft-1"]') as HTMLElement
    const label = chip.querySelector('[data-annotate-chip-label="true"]') as HTMLElement

    expect(chip.style.boxSizing).toBe('border-box')
    expect(chip.style.maxWidth).toBe('calc(100% - 8px)')
    expect(chip.style.minWidth).toBe('0')
    expect(label.style.flex).toBe('1 1 auto')
    expect(label.style.minWidth).toBe('0')
    expect(label.style.overflow).toBe('hidden')
    expect(label.style.textOverflow).toBe('ellipsis')
    expect(label.style.whiteSpace).toBe('nowrap')
  })

  it('shows file metadata without exposing the data-inspecto attribute name', () => {
    createAnnotateSidebar(shadowRoot, createSidebarOptions(createRecordSession()))

    const chip = shadowRoot.querySelector('[data-annotate-chip-id="record-1"]') as HTMLElement
    expect(chip).not.toBeNull()

    chip.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

    expect(shadowRoot.textContent).toContain('FILE')
    expect(shadowRoot.textContent).toContain('/repo/App.tsx:10:2')
    expect(shadowRoot.textContent).not.toContain('ATTRIBUTES')
    expect(shadowRoot.textContent).not.toContain('data-inspecto:')
  })

  it('applies wrapping styles to long element labels in the hover preview', () => {
    const session = createRecordSession()
    session.records = [
      {
        ...session.records[0],
        target: createTarget(
          'target-1',
          10,
          'header.document_docNavBar__L2vQJ.document_hasDoc__jpd6x.documentWithTOC',
        ),
      },
    ]

    createAnnotateSidebar(shadowRoot, createSidebarOptions(session))

    const chip = shadowRoot.querySelector('[data-annotate-chip-id="record-1"]') as HTMLElement
    expect(chip).not.toBeNull()

    chip.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

    const preview = Array.from(shadowRoot.querySelectorAll('div')).find(
      node => node instanceof HTMLDivElement && node.style.position === 'fixed',
    ) as HTMLDivElement | undefined
    const elementValue = Array.from(preview?.querySelectorAll('div') ?? []).find(
      node =>
        node.textContent ===
        'header.document_docNavBar__L2vQJ.document_hasDoc__jpd6x.documentWithTOC',
    ) as HTMLDivElement | undefined

    expect(preview).toBeDefined()
    expect(elementValue).toBeDefined()
    expect(elementValue?.style.whiteSpace).toBe('normal')
    expect(elementValue?.style.overflowWrap).toBe('anywhere')
    expect(elementValue?.style.wordBreak).toBe('break-word')
    expect(elementValue?.style.minWidth).toBe('0')
  })

  it('shows a delete affordance on chip hover and removes the chip through the callback', () => {
    const onEditRecord = vi.fn()
    const onRemovePromptChip = vi.fn()

    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        onEditRecord,
        onRemovePromptChip,
      }),
    )

    const chip = shadowRoot.querySelector('[data-annotate-chip-id="record-1"]') as HTMLElement
    expect(chip).not.toBeNull()

    const inspectIcon = shadowRoot.querySelector(
      '[data-annotate-chip-inspect-icon="record-1"]',
    ) as HTMLElement | null
    expect(inspectIcon).not.toBeNull()
    expect(inspectIcon?.style.opacity).toBe('1')
    expect(inspectIcon?.innerHTML).toContain('mouse-select-filled')

    chip.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

    const deleteButton = shadowRoot.querySelector(
      '[data-annotate-chip-remove-id="record-1"]',
    ) as HTMLButtonElement | null

    expect(deleteButton).not.toBeNull()
    expect(deleteButton?.style.opacity).toBe('1')
    expect(inspectIcon?.style.opacity).toBe('0')

    deleteButton?.click()

    expect(onRemovePromptChip).toHaveBeenCalledWith('record-1')
    expect(onEditRecord).not.toHaveBeenCalled()
  })

  it('uses the latest note when hovering an existing chip after sidebar updates', () => {
    const session = createRecordSession()
    const sidebar = createAnnotateSidebar(shadowRoot, createSidebarOptions(session))

    const chip = shadowRoot.querySelector('[data-annotate-chip-id="record-1"]') as HTMLElement
    expect(chip).not.toBeNull()

    const updatedSession = createRecordSession()
    updatedSession.records = updatedSession.records.map(record =>
      record.id === 'record-1'
        ? {
            ...record,
            note: 'Updated saved note from latest session.',
          }
        : record,
    )

    sidebar.update(createSidebarOptions(updatedSession))

    chip.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

    expect(shadowRoot.textContent).toContain('Updated saved note from latest session.')
    expect(shadowRoot.textContent).not.toContain('Tighten the button spacing.')
  })

  it('renders the quick capture toggle and reflects enabled state', () => {
    const sidebar = createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        quickCaptureEnabled: false,
      }),
    )

    const pureMarkButton = shadowRoot.querySelector(
      'button[aria-label="Toggle quick capture"]',
    ) as HTMLButtonElement | null

    expect(pureMarkButton).not.toBeNull()
    expect(pureMarkButton?.getAttribute('aria-pressed')).toBe('false')
    expect(pureMarkButton?.dataset.active).toBe('false')
    expect(pureMarkButton?.dataset.visualState).toBe('inactive')

    sidebar.update(
      createSidebarOptions(createRecordSession(), {
        quickCaptureEnabled: true,
      }),
    )

    expect(pureMarkButton?.getAttribute('aria-pressed')).toBe('true')
    expect(pureMarkButton?.dataset.active).toBe('true')
    expect(pureMarkButton?.dataset.visualState).toBe('active')
    expect(
      (shadowRoot.querySelector('[data-inspecto-annotate-header-status="true"]') as HTMLElement)
        .textContent,
    ).toBe('Capturing clicks • Quick capture on')
  })

  it('calls onToggleQuickCapture once when the quick capture toggle is clicked', () => {
    const onToggleQuickCapture = vi.fn()

    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        onToggleQuickCapture,
      }),
    )

    clickButtonByLabel('Toggle quick capture')

    expect(onToggleQuickCapture).toHaveBeenCalledTimes(1)
  })

  it('uses one primary send action for the whole batch', () => {
    createAnnotateSidebar(shadowRoot, createSidebarOptions())

    const buttons = Array.from(shadowRoot.querySelectorAll('button'))
    expect(buttons.filter(button => button.textContent === 'Ask AI')).toHaveLength(1)
    expect(buttons.some(button => button.textContent === 'Treat selected as one issue')).toBe(false)
  })

  it('shows sending and success states through button labels and aria-live', () => {
    const sidebar = createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        isSending: true,
        sendingScope: 'batch',
      }),
    )

    expect(shadowRoot.textContent).toContain('Sending...')
    const liveRegion = shadowRoot.querySelector('[role="status"]') as HTMLElement | null
    expect(liveRegion?.textContent).toBe('Sending notes to AI.')

    sidebar.update(
      createSidebarOptions(createRecordSession(), {
        isSending: false,
        sendingScope: null,
        successScope: 'batch',
      }),
    )

    expect(shadowRoot.textContent).toContain('Sent')
    expect(liveRegion?.textContent).toBe('Notes sent to AI.')
  })

  it('opens raw prompt preview below the footer when there is not enough space above', () => {
    const originalInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 320,
    })

    createAnnotateSidebar(shadowRoot, createSidebarOptions())

    const footer = shadowRoot.querySelector(`.${annotateSidebarFooterClass}`) as HTMLElement
    const previewButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.getAttribute('title') === 'View raw prompt payload',
    ) as HTMLButtonElement | undefined
    const previewFloat = shadowRoot.querySelector(
      '[data-inspecto-annotate-raw-preview]',
    ) as HTMLElement | null

    expect(previewButton).not.toBeUndefined()
    expect(previewFloat).not.toBeNull()

    footer.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 120,
        left: 0,
        top: 120,
        width: 320,
        height: 44,
        right: 320,
        bottom: 164,
        toJSON: () => {},
      }) as DOMRect

    previewFloat!.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        width: 320,
        height: 220,
        right: 320,
        bottom: 220,
        toJSON: () => {},
      }) as DOMRect

    previewButton!.click()

    expect(previewFloat?.style.top).toBe('calc(100% + 8px)')
    expect(previewFloat?.style.bottom).toBe('auto')
    expect(previewFloat?.style.maxHeight).toBe('136px')

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    })
  })
})
