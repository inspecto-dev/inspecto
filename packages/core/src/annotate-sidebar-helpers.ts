import type { FeedbackRecord, FeedbackRecordSession } from '@inspecto-dev/types'
import { t } from './i18n.js'

export type PromptChipRecord = {
  id: string
  label: string
  locationLabel: string
  selector?: string | undefined
  note: string
  state: 'draft' | 'saved' | 'completed'
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

export type AnnotateSendScope = 'quick-ask' | 'create-task' | `workflow:${string}` | null

export function isStandardAnnotateSendScope(
  scope: AnnotateSendScope,
): scope is 'quick-ask' | 'create-task' {
  return scope === 'quick-ask' || scope === 'create-task'
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
  sendingScope: AnnotateSendScope
  successScope: 'quick-ask' | 'create-task' | null
}): string {
  if (input.isSending && input.sendingScope === 'quick-ask') {
    return t('annotate.liveStatus.quickAskSending')
  }
  if (input.isSending && input.sendingScope === 'create-task') {
    return t('annotate.liveStatus.createTaskSending')
  }
  if (input.isSending && input.sendingScope?.startsWith('workflow:')) {
    return t('annotate.liveStatus.createTaskSending')
  }
  if (!input.isSending && input.successScope === 'quick-ask') {
    return t('annotate.liveStatus.quickAskSent')
  }
  if (!input.isSending && input.successScope === 'create-task') {
    return t('annotate.liveStatus.taskCreated')
  }
  return ''
}

export function formatRuntimeErrorCount(count: number): string {
  if (count > 99) return '99+'
  return String(count)
}

export function toLocationLabel(record: FeedbackRecord | FeedbackRecordSession['current']): string {
  const target = record.target
  if (!target) return t('annotate.source.unknown')
  return `${target.location.file}:${target.location.line}:${target.location.column}`
}

export function getPromptChipRecords(
  session: FeedbackRecordSession,
  isLatestSessionResolved?: boolean,
): PromptChipRecord[] {
  const savedState: PromptChipRecord['state'] = isLatestSessionResolved ? 'completed' : 'saved'
  const chips: PromptChipRecord[] = session.records.map(record => ({
    id: record.id,
    label: record.target.label || t('annotate.target.unknown'),
    locationLabel: toLocationLabel(record),
    ...(record.target.selector ? { selector: record.target.selector } : {}),
    note: record.note,
    state: savedState,
  }))

  if (session.current.target) {
    chips.push({
      id: session.current.id,
      label: session.current.target.label || t('annotate.target.unknown'),
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

export function getChipSignature(
  session: FeedbackRecordSession,
  isLatestSessionResolved?: boolean,
): string {
  return getPromptChipRecords(session, isLatestSessionResolved)
    .map(chip => `${chip.id}:${chip.state}:${chip.label}`)
    .join('|')
}
