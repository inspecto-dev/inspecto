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
  annotateSidebarTextClass as _annotateSidebarTextClass,
} from '../src/styles.js'
import type { FeedbackRecordSession } from '@inspecto-dev/types'

const SYSTEM_STARTED_MESSAGE = 'Agent claimed this task through MCP.'
const SYSTEM_WARNING_MESSAGE = 'Agent reported MCP connectivity issues.'
const SYSTEM_NO_UPDATE_MESSAGE = 'Agent exited without posting a follow-up update.'

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
    onQuickAsk: vi.fn(),
    onCreateTask: vi.fn(),
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
    vi.restoreAllMocks()
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
    const onQuickAsk = vi.fn()
    const onCreateTask = vi.fn()
    const onExit = vi.fn()

    const sidebar = createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        onPauseCapture,
        onEditRecord,
        onUpdateInstruction,
        onQuickAsk,
        onCreateTask,
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
    expect(onQuickAsk).toHaveBeenCalled()

    clickButtonByText('Create Task')
    expect(onCreateTask).toHaveBeenCalled()

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
        onQuickAsk,
        onCreateTask,
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
        annotateDeliveryMode: 'both',
        preferredAction: 'create-task',
        isSending: false,
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
      'Each click opens one note. Save a few notes first, then add an overall goal and create a task or ask once.',
    )
    const buttons = Array.from(shadowRoot.querySelectorAll('button'))
    expect(buttons.find(button => button.textContent === 'Ask AI')?.hasAttribute('disabled')).toBe(
      true,
    )
    expect(
      buttons.find(button => button.textContent === 'Create Task')?.hasAttribute('disabled'),
    ).toBe(true)
    const previewButton = buttons.find(
      button => button.getAttribute('title') === 'View raw prompt payload',
    )
    if (previewButton && previewButton.parentElement) {
      expect(previewButton.parentElement.style.display).toBe('none')
    }
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
      button => button.textContent === 'Create Task',
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
    ).toBe('Capturing clicks • Toggle quick capture on')
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

  it('offers quick ask and create task actions for the whole batch', () => {
    createAnnotateSidebar(shadowRoot, createSidebarOptions())

    const buttons = Array.from(shadowRoot.querySelectorAll('button'))
    expect(buttons.filter(button => button.textContent === 'Ask AI')).toHaveLength(1)
    expect(buttons.filter(button => button.textContent === 'Create Task')).toHaveLength(1)
    expect(buttons.some(button => button.textContent === 'Treat selected as one issue')).toBe(false)
  })

  it('shows only create task in agent delivery mode', () => {
    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        annotateDeliveryMode: 'agent',
        preferredAction: 'create-task',
      }),
    )

    const buttons = Array.from(shadowRoot.querySelectorAll('button'))
    const askAiButton = buttons.find(button => button.textContent === 'Ask AI') as
      | HTMLButtonElement
      | undefined
    const createTaskButton = buttons.find(button => button.textContent === 'Create Task') as
      | HTMLButtonElement
      | undefined
    expect(askAiButton?.style.display).toBe('none')
    expect(createTaskButton?.style.display).toBe('')
    expect(shadowRoot.textContent).not.toContain('Recommended: Ask AI for one-off questions')
    const recommendedLabel = Array.from(shadowRoot.querySelectorAll('div')).find(
      node => node.textContent === 'Recommended: Create Task',
    ) as HTMLDivElement | undefined
    expect(recommendedLabel?.style.display).toBe('none')
  })

  it('hides debug helper actions in agent delivery mode', () => {
    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        annotateDeliveryMode: 'agent',
        preferredAction: 'create-task',
      }),
    )

    const previewButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.getAttribute('title') === 'View raw prompt payload',
    ) as HTMLButtonElement | undefined
    const copyContextButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.getAttribute('title') === '复制上下文',
    ) as HTMLButtonElement | undefined

    expect(previewButton?.style.display).toBe('none')
    expect(copyContextButton).toBeUndefined()
  })

  it('hides raw prompt payload section in agent delivery mode', () => {
    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        annotateDeliveryMode: 'agent',
        preferredAction: 'create-task',
      }),
    )

    const fullPromptSection = shadowRoot.querySelector(
      '[data-variant="full-prompt"]',
    ) as HTMLElement | null
    expect(fullPromptSection?.style.display).toBe('none')
  })

  it('keeps element notes collapsed in agent delivery mode', () => {
    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        annotateDeliveryMode: 'agent',
        preferredAction: 'create-task',
      }),
    )

    const notesSection = shadowRoot.querySelector(
      '[data-variant="records"]',
    ) as HTMLDetailsElement | null
    expect(notesSection?.open).toBe(false)
  })

  it('switches the primary annotate action when preferredAction is quick-ask', () => {
    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        preferredAction: 'quick-ask',
      }),
    )

    const askAiButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Ask AI',
    ) as HTMLButtonElement
    const createTaskButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Create Task',
    ) as HTMLButtonElement

    expect(askAiButton.classList.contains('primary')).toBe(false)
    expect(createTaskButton.classList.contains('primary')).toBe(false)
    expect(shadowRoot.textContent).toContain('Recommended: Ask AI')
  })

  it('hides recommended action by default', () => {
    createAnnotateSidebar(shadowRoot, createSidebarOptions())

    expect(shadowRoot.textContent).toContain('Recommended: Create Task')
  })

  it('de-emphasizes Ask AI when Create Task is the preferred action', () => {
    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        preferredAction: 'create-task',
        annotateDeliveryMode: 'both',
        isSending: false,
      }),
    )

    const askAiButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Ask AI',
    ) as HTMLButtonElement
    const createTaskButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Create Task',
    ) as HTMLButtonElement

    expect(askAiButton.dataset.emphasis).toBe('secondary')
    expect(createTaskButton.dataset.emphasis).toBe('primary')
    expect(askAiButton.dataset.layoutRole).toBe('secondary')
    expect(createTaskButton.dataset.layoutRole).toBe('primary')
    expect(askAiButton.style.flex).toBe('1 1 0%')
    expect(createTaskButton.style.flex).toBe('1 1 0%')
    expect(askAiButton.title).toBe('Ask AI')
    expect(createTaskButton.title).toBe('Create Task')
  })

  it('renders current task copy and a human-friendly pending message', () => {
    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        latestSessionSummary: {
          id: 'session-12345678',
          status: 'pending',
          createdAt: 1,
          updatedAt: 1,
        },
      }),
    )

    expect(shadowRoot.textContent).toContain('Current task')
    expect(shadowRoot.textContent).toContain('Sent to AI.')
    const refreshButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.getAttribute('title') === 'Refresh current task',
    ) as HTMLButtonElement | undefined
    expect(refreshButton?.style.display).toBe('none')
  })

  it('styles latest task status and reveals it after task creation succeeds', async () => {
    const scrollIntoView = vi.fn()
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(scrollIntoView)

    const controller = createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createEmptySession(), {
        successScope: 'create-task',
        annotateDeliveryMode: 'both',
        preferredAction: 'create-task',
      }),
    )

    controller.update(
      createSidebarOptions(createEmptySession(), {
        successScope: 'create-task',
        annotateDeliveryMode: 'both',
        preferredAction: 'create-task',
        latestSessionSummary: {
          id: 'session-abcdef12',
          status: 'in_progress',
          createdAt: 1,
          updatedAt: 2,
        },
      }),
    )

    const status = Array.from(shadowRoot.querySelectorAll('span')).find(
      element => element.textContent === '◔ in progress',
    ) as HTMLSpanElement

    expect(status).not.toBeNull()
    expect(status.style.color).toBe('#73b2ff')
    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('shows a follow-up verification hint when the latest agent task is complete', () => {
    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        latestSessionDetail: {
          id: 'session-resolved',
          status: 'resolved',
          instruction: '',
          annotations: [],
          messages: [],
          createdAt: 1,
          updatedAt: 2,
          resolvedAt: 3,
        },
      }),
    )

    expect(shadowRoot.textContent).toContain('✓ complete')
    expect(shadowRoot.textContent).toContain('Review the result. Create a follow-up if needed.')
  })

  it('shows the latest system message for an acknowledged task', () => {
    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        latestSessionDetail: {
          id: 'session-acknowledged',
          status: 'acknowledged',
          instruction: '',
          annotations: [],
          messages: [
            {
              id: 'message-system',
              role: 'system',
              text: SYSTEM_STARTED_MESSAGE,
              createdAt: 2,
            },
          ],
          createdAt: 1,
          updatedAt: 2,
          acknowledgedAt: 2,
        },
      }),
    )

    expect(shadowRoot.textContent).toContain('◔ acknowledged')
    expect(shadowRoot.textContent).toContain(SYSTEM_STARTED_MESSAGE)
    expect(shadowRoot.textContent).toContain('AI connected. Waiting for update.')
    const message = Array.from(shadowRoot.querySelectorAll('div')).find(element =>
      element.textContent?.includes(SYSTEM_STARTED_MESSAGE),
    ) as HTMLDivElement
    expect(message.dataset.variant).toBe('system-info')
    expect(message.style.color).toBe('#9ed8ff')
  })

  it('shows reconnect affordance when current task updates disconnect', () => {
    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        latestSessionSummary: {
          id: 'session-12345678',
          status: 'in_progress',
          createdAt: 1,
          updatedAt: 2,
        },
        latestSessionError: 'Live session updates disconnected. You can refresh to reconnect.',
      }),
    )

    expect(shadowRoot.textContent).toContain(
      'Connection lost. Reconnect to keep following this task.',
    )
    const reconnectButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.getAttribute('title') === 'Refresh current task',
    ) as HTMLButtonElement | undefined
    expect(reconnectButton?.style.display).toBe('')
    expect(reconnectButton?.textContent).toBe('Reconnect')
  })

  it('keeps historical worker warnings visible in the latest task panel', () => {
    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        latestSessionDetail: {
          id: 'session-worker-failed',
          status: 'acknowledged',
          instruction: '',
          annotations: [],
          messages: [
            {
              id: 'message-system-failed',
              role: 'system',
              text: SYSTEM_WARNING_MESSAGE,
              createdAt: 2,
            },
          ],
          createdAt: 1,
          updatedAt: 2,
          acknowledgedAt: 2,
        },
      }),
    )

    expect(shadowRoot.textContent).toContain('◔ acknowledged')
    expect(shadowRoot.textContent).toContain(SYSTEM_WARNING_MESSAGE)
    expect(shadowRoot.textContent).toContain('AI connected. Waiting for update.')
    const message = Array.from(shadowRoot.querySelectorAll('div')).find(element =>
      element.textContent?.includes(SYSTEM_WARNING_MESSAGE),
    ) as HTMLDivElement
    expect(message.dataset.variant).toBe('system-info')
    expect(message.style.color).toBe('#9ed8ff')
  })

  it('shows historical no-session-update messages without special status overrides', () => {
    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        latestSessionDetail: {
          id: 'session-worker-no-update',
          status: 'acknowledged',
          instruction: '',
          annotations: [],
          messages: [
            {
              id: 'message-system-no-update',
              role: 'system',
              text: SYSTEM_NO_UPDATE_MESSAGE,
              createdAt: 2,
            },
          ],
          createdAt: 1,
          updatedAt: 2,
          acknowledgedAt: 2,
        },
      }),
    )

    expect(shadowRoot.textContent).toContain('◔ acknowledged')
    expect(shadowRoot.textContent).toContain('AI connected. Waiting for update.')
    const message = Array.from(shadowRoot.querySelectorAll('div')).find(element =>
      element.textContent?.includes(SYSTEM_NO_UPDATE_MESSAGE),
    ) as HTMLDivElement
    expect(message.dataset.variant).toBe('system-info')
  })

  it('shows sending and success states through button labels and aria-live', () => {
    const sidebar = createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        isSending: true,
        sendingScope: 'quick-ask',
      }),
    )

    expect(shadowRoot.textContent).toContain('Sending...')
    const liveRegion = shadowRoot.querySelector('[role="status"]') as HTMLElement | null
    expect(liveRegion?.textContent).toBe('Sending notes to your IDE assistant.')

    sidebar.update(
      createSidebarOptions(createRecordSession(), {
        isSending: false,
        sendingScope: null,
        successScope: 'create-task',
      }),
    )

    expect(liveRegion?.textContent).toBe('Task created from your notes.')
  })

  it('opens raw prompt preview below the footer when there is not enough space above', () => {
    const originalInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 320,
    })

    createAnnotateSidebar(
      shadowRoot,
      createSidebarOptions(createRecordSession(), {
        annotateDeliveryMode: 'both',
        preferredAction: 'create-task',
        isSending: false,
      }),
    )

    const footer = shadowRoot.querySelector(`.${annotateSidebarFooterClass}`) as HTMLElement
    const previewButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.getAttribute('title') === 'View raw prompt payload',
    ) as HTMLButtonElement | undefined
    const previewFloat = shadowRoot.querySelector(
      '[data-inspecto-annotate-raw-preview]',
    ) as HTMLElement | null

    if (previewButton) {
      expect(previewButton).not.toBeUndefined()
    }
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
        height: 400,
        right: 320,
        bottom: 400,
        toJSON: () => {},
      }) as DOMRect

    if (previewButton) {
      previewButton.click()
    }

    expect(previewFloat?.style.top).toBe('calc(100% + 8px)')
    expect(previewFloat?.style.bottom).toBe('auto')
    expect(previewFloat?.style.maxHeight).toBe('136px')

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    })
  })
})
