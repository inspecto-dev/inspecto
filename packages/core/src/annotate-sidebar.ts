import type { FeedbackRecord, FeedbackRecordSession } from '@inspecto-dev/types'
import {
  captureInstructionSegmentsFromDom,
  formatRuntimeErrorCount,
  getChipSignature,
  getInstructionChipIdSignature,
  getLiveStatusMessage,
  getPromptChipRecords,
  normalizeInstructionSegments,
  serializeInstructionSegments,
  type InstructionSegment,
  type PromptChipRecord,
} from './annotate-sidebar-helpers.js'
import { createAnnotateSidebarDom } from './annotate-sidebar-dom.js'
import { createAnnotateSidebarRenderers } from './annotate-sidebar-renderers.js'
import { pauseIconSvg, playIconSvg } from './icons.js'

type SidebarMode = 'capture-enabled' | 'capture-paused'
type SendScope = 'batch' | null

export interface AnnotateSidebarOptions {
  mode: SidebarMode
  canAttachScreenshotContext?: boolean
  screenshotContextEnabled?: boolean
  canAttachCssContext?: boolean
  cssContextEnabled?: boolean
  canAttachRuntimeContext?: boolean
  runtimeContextEnabled?: boolean
  runtimeContextSummary?: string
  runtimeErrorCount?: number
  session: FeedbackRecordSession
  instruction: string
  includedRecords: FeedbackRecord[]
  fullPrompt: string
  isSending: boolean
  sendingScope: SendScope
  successScope: SendScope
  quickCaptureEnabled?: boolean
  errorMessage?: string
  onPauseCapture: () => void
  onResumeCapture: () => void
  onToggleQuickCapture?: () => void
  onToggleScreenshotContext?: () => void
  onToggleCssContext?: () => void
  onToggleRuntimeContext?: () => void
  onUpdateInstruction: (instruction: string) => void
  onRemovePromptChip: (recordId: string) => void
  onEditRecord?: (id: string) => void
  onSend: () => void
  onExit: () => void
}

type SidebarController = {
  element: HTMLElement
  update(next: AnnotateSidebarOptions): void
  destroy(): void
}

export function createAnnotateSidebar(
  shadowRoot: ShadowRoot,
  options: AnnotateSidebarOptions,
): SidebarController {
  const dom = createAnnotateSidebarDom(shadowRoot)
  const {
    element,
    headerStatus,
    quickCaptureButton,
    screenshotContextButton,
    cssContextButton,
    runtimeContextButton,
    runtimeContextBadge,
    modeButton,
    exitButton,
    emptyState,
    draftSection,
    instructionInput,
    includedSummary,
    recordsList,
    allPromptText,
    footer,
    statusMessage,
    errorMessage,
    previewCodeButton,
    previewFloat,
    previewFloatContent,
    sendButton,
    updateRawPromptPreviewPosition,
    setRawPromptPreviewVisible,
  } = dom

  let currentOptions = options
  let instructionSegments: InstructionSegment[] = []
  let isSyncingInstructionDom = false
  let renderedChipSignature = ''

  function getPromptChipRecordById(id: string): PromptChipRecord | null {
    return getPromptChipRecords(currentOptions.session).find(chip => chip.id === id) ?? null
  }

  const renderers = createAnnotateSidebarRenderers({
    shadowRoot,
    sidebarElement: element,
    getOptions: () => currentOptions,
    getPromptChipRecordById,
  })

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
      fragment.appendChild(renderers.createPromptChipElement(chip))
    }

    instructionInput.replaceChildren(fragment)
    isSyncingInstructionDom = false
  }

  function syncInstructionSegmentsWithChips(session: FeedbackRecordSession): void {
    const chips = getPromptChipRecords(session)
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

  function renderPromptChips(session: FeedbackRecordSession): void {
    const previousChipIds = getInstructionChipIdSignature(instructionSegments)
    syncInstructionSegmentsWithChips(session)
    const nextChipIds = getInstructionChipIdSignature(instructionSegments)
    const nextChipSignature = getChipSignature(session)
    const shouldRerender =
      previousChipIds !== nextChipIds || renderedChipSignature !== nextChipSignature

    if (!shouldRerender) return

    renderedChipSignature = nextChipSignature
    renderInstructionSegments(instructionSegments)
  }

  function patch(next: AnnotateSidebarOptions): void {
    const hasSavedRecords = next.session.records.length > 0
    const hasCurrentDraft = Boolean(next.session.current.target)
    const hasBatchContent = hasSavedRecords || hasCurrentDraft
    const shouldShowBody =
      hasSavedRecords ||
      hasCurrentDraft ||
      next.isSending ||
      next.successScope !== null ||
      Boolean(next.errorMessage)
    const canSend = next.isSending ? false : next.includedRecords.length > 0 || hasCurrentDraft

    element.style.display = ''
    emptyState.style.display = shouldShowBody ? 'none' : ''
    draftSection.style.display = shouldShowBody ? '' : 'none'
    footer.style.display = shouldShowBody ? '' : 'none'

    quickCaptureButton.setAttribute('aria-pressed', String(Boolean(next.quickCaptureEnabled)))
    quickCaptureButton.dataset.active = String(Boolean(next.quickCaptureEnabled))
    quickCaptureButton.dataset.visualState = next.quickCaptureEnabled ? 'active' : 'inactive'
    quickCaptureButton.title = next.quickCaptureEnabled
      ? 'Quick capture on'
      : 'Toggle quick capture'

    screenshotContextButton.style.display =
      hasBatchContent && next.canAttachScreenshotContext ? '' : 'none'
    screenshotContextButton.setAttribute(
      'aria-pressed',
      next.screenshotContextEnabled ? 'true' : 'false',
    )
    screenshotContextButton.dataset.visualState = next.screenshotContextEnabled
      ? 'active'
      : 'inactive'
    screenshotContextButton.title = next.screenshotContextEnabled
      ? 'Screenshot context enabled'
      : 'Attach screenshot context'

    cssContextButton.style.display = hasBatchContent && next.canAttachCssContext ? '' : 'none'
    cssContextButton.setAttribute('aria-pressed', next.cssContextEnabled ? 'true' : 'false')
    cssContextButton.dataset.visualState = next.cssContextEnabled ? 'active' : 'inactive'
    cssContextButton.title = next.cssContextEnabled ? 'CSS context enabled' : 'Attach CSS context'

    runtimeContextButton.style.display =
      hasBatchContent && next.canAttachRuntimeContext ? '' : 'none'
    runtimeContextButton.setAttribute('aria-pressed', next.runtimeContextEnabled ? 'true' : 'false')
    runtimeContextButton.dataset.visualState = next.runtimeContextEnabled ? 'active' : 'inactive'
    runtimeContextBadge.textContent = formatRuntimeErrorCount(next.runtimeErrorCount ?? 0)
    runtimeContextBadge.hidden = !next.runtimeContextEnabled || (next.runtimeErrorCount ?? 0) <= 0
    runtimeContextButton.title = next.runtimeContextEnabled
      ? next.runtimeErrorCount
        ? `Runtime context enabled • ${formatRuntimeErrorCount(next.runtimeErrorCount)} errors`
        : next.runtimeContextSummary
          ? `Runtime context enabled • ${next.runtimeContextSummary}`
          : 'Runtime context enabled'
      : next.runtimeErrorCount
        ? `Attach runtime context • ${formatRuntimeErrorCount(next.runtimeErrorCount)} errors`
        : 'Attach runtime context'

    modeButton.innerHTML = next.mode === 'capture-enabled' ? pauseIconSvg : playIconSvg
    const toggleSvgElement = modeButton.querySelector('svg')
    if (toggleSvgElement) {
      toggleSvgElement.style.width = '14px'
      toggleSvgElement.style.height = '14px'
      toggleSvgElement.style.display = 'block'
    }
    modeButton.setAttribute(
      'aria-label',
      next.mode === 'capture-enabled' ? 'Pause selection' : 'Resume selection',
    )
    modeButton.title = next.mode === 'capture-enabled' ? 'Pause selection' : 'Resume selection'
    modeButton.dataset.selected = String(next.mode === 'capture-enabled')

    headerStatus.textContent =
      next.mode === 'capture-enabled'
        ? next.quickCaptureEnabled
          ? 'Capturing clicks • Quick capture on'
          : 'Capturing clicks'
        : next.quickCaptureEnabled
          ? 'Selection paused • Quick capture on'
          : 'Selection paused'

    renderPromptChips(next.session)
    allPromptText.textContent = next.fullPrompt
    previewFloatContent.textContent = next.fullPrompt
    previewCodeButton.style.display = canSend ? '' : 'none'
    if (!canSend) {
      setRawPromptPreviewVisible(false)
    }
    if (previewFloat.style.display === 'block') {
      updateRawPromptPreviewPosition()
    }

    includedSummary.textContent = `Element notes (${next.includedRecords.length})`
    renderers.renderIncludedRecords(next.includedRecords, recordsList)

    sendButton.disabled = !canSend
    sendButton.textContent =
      next.isSending && next.sendingScope === 'batch'
        ? 'Sending...'
        : !next.isSending && next.successScope === 'batch'
          ? 'Sent'
          : 'Ask AI'

    statusMessage.textContent = getLiveStatusMessage(next)
    errorMessage.textContent = next.errorMessage ?? ''
    errorMessage.style.display = next.errorMessage ? 'block' : 'none'
  }

  instructionSegments = normalizeInstructionSegments([
    { type: 'text', text: currentOptions.instruction },
  ])

  instructionInput.addEventListener('input', () => {
    if (isSyncingInstructionDom) return
    instructionSegments = captureInstructionSegmentsFromDom(
      instructionInput,
      'inspecto-annotate-sidebar-chip',
    )
    currentOptions.onUpdateInstruction(
      serializeInstructionSegments(
        instructionSegments,
        id => getPromptChipRecordById(id)?.label ?? null,
      ),
    )
  })

  screenshotContextButton.addEventListener('click', () =>
    currentOptions.onToggleScreenshotContext?.(),
  )
  cssContextButton.addEventListener('click', () => currentOptions.onToggleCssContext?.())
  runtimeContextButton.addEventListener('click', () => currentOptions.onToggleRuntimeContext?.())
  sendButton.addEventListener('click', () => currentOptions.onSend())
  exitButton.addEventListener('click', () => currentOptions.onExit())
  quickCaptureButton.addEventListener('click', () => currentOptions.onToggleQuickCapture?.())
  modeButton.addEventListener('click', () => {
    if (currentOptions.mode === 'capture-enabled') {
      currentOptions.onPauseCapture()
    } else {
      currentOptions.onResumeCapture()
    }
  })

  patch(currentOptions)

  return {
    element,
    update(next: AnnotateSidebarOptions) {
      currentOptions = next
      patch(currentOptions)
    },
    destroy() {
      renderers.destroy()
      element.remove()
    },
  }
}
