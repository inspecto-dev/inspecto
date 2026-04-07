import type { FeedbackRecord, FeedbackRecordSession } from '@inspecto-dev/types'

export type PromptChipRecord = {
  id: string
  label: string
  locationLabel: string
  selector?: string | undefined
  note: string
  state: 'draft' | 'saved'
}

export type InstructionSegment =
  | {
      type: 'text'
      text: string
    }
  | {
      type: 'chip'
      id: string
    }

export function createSidebarButton(
  label: string,
  className: string,
  isHTML = false,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = className
  if (isHTML) {
    button.innerHTML = label
  } else {
    button.textContent = label
  }
  return button
}

export function getLiveStatusMessage(input: {
  isSending: boolean
  sendingScope: 'batch' | null
  successScope: 'batch' | null
}): string {
  if (input.isSending && input.sendingScope === 'batch') {
    return 'Sending notes to AI.'
  }
  if (!input.isSending && input.successScope === 'batch') {
    return 'Notes sent to AI.'
  }
  return ''
}

export function formatRuntimeErrorCount(count: number): string {
  if (count > 99) return '99+'
  return String(count)
}

export function toLocationLabel(record: FeedbackRecord | FeedbackRecordSession['current']): string {
  const target = record.target
  if (!target) return 'Unknown source'
  return `${target.location.file}:${target.location.line}:${target.location.column}`
}

export function getPromptChipRecords(session: FeedbackRecordSession): PromptChipRecord[] {
  const chips: PromptChipRecord[] = session.records.map(record => ({
    id: record.id,
    label: record.target.label || 'Unknown target',
    locationLabel: toLocationLabel(record),
    ...(record.target.selector ? { selector: record.target.selector } : {}),
    note: record.note,
    state: 'saved',
  }))

  if (session.current.target) {
    chips.push({
      id: session.current.id,
      label: session.current.target.label || 'Unknown target',
      locationLabel: toLocationLabel(session.current),
      ...(session.current.target.selector ? { selector: session.current.target.selector } : {}),
      note: session.current.note,
      state: 'draft',
    })
  }

  return chips
}

export function normalizeInstructionSegments(segments: InstructionSegment[]): InstructionSegment[] {
  const normalized: InstructionSegment[] = []

  for (const segment of segments) {
    if (segment.type === 'text') {
      if (segment.text.length === 0) continue
      const previous = normalized[normalized.length - 1]
      if (previous?.type === 'text') {
        previous.text += segment.text
      } else {
        normalized.push({ type: 'text', text: segment.text })
      }
      continue
    }

    normalized.push(segment)
  }

  return normalized
}

export function serializeInstructionSegments(
  segments: InstructionSegment[],
  resolveChipLabel: (id: string) => string | null,
): string {
  return normalizeInstructionSegments(segments)
    .map(segment => {
      if (segment.type === 'text') {
        return segment.text
      }

      return resolveChipLabel(segment.id) ?? ''
    })
    .join('')
    .replace(/\u00A0/g, ' ')
}

export function captureInstructionSegmentsFromDom(
  instructionInput: HTMLElement,
  annotateSidebarChipClass: string,
): InstructionSegment[] {
  const segments: InstructionSegment[] = []

  for (const node of instructionInput.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      segments.push({ type: 'text', text: node.textContent ?? '' })
      continue
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue
    const el = node as HTMLElement

    if (el.classList.contains(annotateSidebarChipClass) && el.dataset.annotateChipId) {
      segments.push({ type: 'chip', id: el.dataset.annotateChipId })
      continue
    }

    if (el.tagName === 'BR') {
      segments.push({ type: 'text', text: '\n' })
      continue
    }

    if (el.tagName === 'DIV') {
      segments.push({ type: 'text', text: `${el.textContent ?? ''}\n` })
      continue
    }

    segments.push({ type: 'text', text: el.textContent ?? '' })
  }

  return normalizeInstructionSegments(segments)
}

export function getInstructionChipIdSignature(segments: InstructionSegment[]): string {
  return segments
    .filter(
      (segment): segment is Extract<InstructionSegment, { type: 'chip' }> =>
        segment.type === 'chip',
    )
    .map(segment => segment.id)
    .join('|')
}

export function getChipSignature(session: FeedbackRecordSession): string {
  return getPromptChipRecords(session)
    .map(chip => `${chip.id}:${chip.state}:${chip.label}`)
    .join('|')
}
