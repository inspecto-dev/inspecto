import type { FeedbackRecordSession } from '@inspecto-dev/types'
import { describe, expect, it, vi } from 'vitest'
import { createInstructionChipController } from '../src/features/annotate/sidebar/instruction-chips.js'
import type { AnnotateSidebarOptions } from '../src/features/annotate/sidebar/types.js'

function createSession(): FeedbackRecordSession {
  return {
    current: { id: 'draft-1', target: null, note: '', intent: 'review' },
    records: [
      {
        id: 'record-1',
        displayOrder: 1,
        target: {
          id: 'target-1',
          label: 'Button.primary',
          location: { file: '/repo/App.tsx', line: 1, column: 1 },
          rect: { x: 0, y: 0, width: 10, height: 10 },
        },
        note: 'Fix spacing',
        intent: 'review',
      },
    ],
  }
}

function createOptions(overrides: Partial<AnnotateSidebarOptions> = {}): AnnotateSidebarOptions {
  return {
    mode: 'capture-enabled',
    session: createSession(),
    instruction: 'Review ',
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

describe('createInstructionChipController', () => {
  it('renders missing prompt chips into the instruction input', () => {
    const input = document.createElement('div')
    const options = createOptions()

    const controller = createInstructionChipController({
      input,
      getOptions: () => options,
      getPromptChipRecordById: id => ({
        id,
        label: 'Button.primary',
        locationLabel: '/repo/App.tsx:1:1',
        note: 'Fix spacing',
        state: 'saved',
      }),
      createPromptChipElement: chip => {
        const element = document.createElement('span')
        element.dataset.inspectoAnnotateSidebarChip = chip.id
        element.textContent = chip.label
        return element
      },
      onInstructionChange: vi.fn(),
    })

    controller.render(options.session)

    expect(input.textContent).toContain('Review')
    expect(input.textContent).toContain('Button.primary')
    expect(input.querySelector('[data-inspecto-annotate-sidebar-chip="record-1"]')).not.toBeNull()
  })

  it('serializes chip labels when handling user input', () => {
    const input = document.createElement('div')
    const onInstructionChange = vi.fn()
    const options = createOptions()
    input.append('Explain ')
    const chip = document.createElement('span')
    chip.dataset.inspectoAnnotateSidebarChip = 'record-1'
    chip.textContent = 'Button.primary'
    input.append(chip, ' please')

    const controller = createInstructionChipController({
      input,
      getOptions: () => options,
      getPromptChipRecordById: id => ({
        id,
        label: 'Button.primary',
        locationLabel: '/repo/App.tsx:1:1',
        note: 'Fix spacing',
        state: 'saved',
      }),
      createPromptChipElement: () => document.createElement('span'),
      onInstructionChange,
    })

    controller.handleInput()

    expect(onInstructionChange).toHaveBeenCalledWith('Explain Button.primary please')
  })

  it('ignores input events triggered while rendering controlled chip DOM', () => {
    const input = document.createElement('div')
    const onInstructionChange = vi.fn()
    const options = createOptions()

    const controller = createInstructionChipController({
      input,
      getOptions: () => options,
      getPromptChipRecordById: id => ({
        id,
        label: 'Button.primary',
        locationLabel: '/repo/App.tsx:1:1',
        note: 'Fix spacing',
        state: 'saved',
      }),
      createPromptChipElement: chip => {
        const element = document.createElement('span')
        element.dataset.inspectoAnnotateSidebarChip = chip.id
        element.textContent = chip.label
        controller.handleInput()
        return element
      },
      onInstructionChange,
    })

    controller.render(options.session)

    expect(onInstructionChange).not.toHaveBeenCalled()
  })
})
