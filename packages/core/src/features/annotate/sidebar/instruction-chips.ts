import type { FeedbackRecordSession } from '@inspecto-dev/types'
import {
  captureInstructionSegmentsFromDom,
  getChipSignature,
  getInstructionChipIdSignature,
  getPromptChipRecords,
  normalizeInstructionSegments,
  serializeInstructionSegments,
  type InstructionSegment,
  type PromptChipRecord,
} from './helpers.js'
import type { AnnotateSidebarOptions } from './types.js'

export type InstructionChipControllerOptions = {
  input: HTMLDivElement
  getOptions(): AnnotateSidebarOptions
  getPromptChipRecordById(id: string): PromptChipRecord | null
  createPromptChipElement(chip: PromptChipRecord): HTMLElement
  onInstructionChange(instruction: string): void
}

export type InstructionChipController = {
  render(session: FeedbackRecordSession): void
  handleInput(): void
}

const promptChipIdAttribute = 'inspecto-annotate-sidebar-chip'

export function createInstructionChipController({
  input,
  getOptions,
  getPromptChipRecordById,
  createPromptChipElement,
  onInstructionChange,
}: InstructionChipControllerOptions): InstructionChipController {
  let instructionSegments = normalizeInstructionSegments([
    { type: 'text', text: getOptions().instruction },
  ])
  let isSyncingInstructionDom = false
  let renderedChipSignature = ''

  function isResolvedSessionIncluded(): boolean {
    const options = getOptions()
    return (
      options.latestSessionSummary?.status === 'resolved' ||
      options.latestSessionDetail?.status === 'resolved'
    )
  }

  function renderInstructionSegments(segments: InstructionSegment[]): void {
    isSyncingInstructionDom = true

    const fragment = document.createDocumentFragment()
    for (const segment of normalizeInstructionSegments(segments)) {
      if (segment.type === 'text') {
        fragment.appendChild(document.createTextNode(segment.text))
        continue
      }

      const chip = getPromptChipRecordById(segment.id)
      if (!chip) continue
      fragment.appendChild(createPromptChipElement(chip))
    }

    input.replaceChildren(fragment)
    isSyncingInstructionDom = false
  }

  function syncInstructionSegmentsWithChips(session: FeedbackRecordSession): void {
    const chips = getPromptChipRecords(session, isResolvedSessionIncluded())
    const validChipIds = new Set(chips.map(chip => chip.id))
    const nextSegments: InstructionSegment[] = []
    const existingChipIds = new Set<string>()

    for (const segment of instructionSegments) {
      if (segment.type === 'chip') {
        if (!validChipIds.has(segment.id) || existingChipIds.has(segment.id)) continue
        existingChipIds.add(segment.id)
      }
      nextSegments.push(segment)
    }

    for (const chip of chips) {
      if (existingChipIds.has(chip.id)) continue
      nextSegments.push({ type: 'chip', id: chip.id }, { type: 'text', text: '\u00A0' })
    }

    instructionSegments = normalizeInstructionSegments(nextSegments)
  }

  function render(session: FeedbackRecordSession): void {
    const previousChipIds = getInstructionChipIdSignature(instructionSegments)
    syncInstructionSegmentsWithChips(session)
    const nextChipIds = getInstructionChipIdSignature(instructionSegments)
    const nextChipSignature = getChipSignature(session, isResolvedSessionIncluded())
    const shouldRerender =
      previousChipIds !== nextChipIds || renderedChipSignature !== nextChipSignature

    if (!shouldRerender) return

    renderedChipSignature = nextChipSignature
    renderInstructionSegments(instructionSegments)
  }

  function handleInput(): void {
    if (isSyncingInstructionDom) return

    instructionSegments = captureInstructionSegmentsFromDom(input, promptChipIdAttribute)
    onInstructionChange(
      serializeInstructionSegments(
        instructionSegments,
        id => getPromptChipRecordById(id)?.label ?? null,
      ),
    )
  }

  return {
    render,
    handleInput,
  }
}
