import type { FeedbackRecordSession } from '@inspecto-dev/types'
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
} from './helpers.js'
import { createAnnotateSidebarDom } from './dom.js'
import { createAnnotateSidebarRenderers } from './renderers.js'
import { t } from '../../../shared/i18n.js'
import { pauseIconSvg, playIconSvg } from '../../../shared/icons.js'
import { renderWorkflowRow } from './workflow-row.js'
import { renderLatestSession, type LatestSessionDom } from './latest-session-renderer.js'
import { attachAnnotateSidebarEvents } from './events.js'
import type { AnnotateSidebarOptions, PreferredAction, SidebarController } from './types.js'
export type {
  AnnotateSidebarOptions,
  AnnotateWorkflowNotice,
  DeliveryMode,
  SidebarController,
} from './types.js'

export function createAnnotateSidebar(
  shadowRoot: ShadowRoot,
  options: AnnotateSidebarOptions,
): SidebarController {
  const dom = createAnnotateSidebarDom(shadowRoot)
  const {
    element,
    headerStatus,
    quickCaptureButton,
    cssContextButton,
    runtimeContextButton,
    runtimeContextBadge,
    modeButton,
    emptyState,
    draftSection,
    instructionInput,
    includedSummary,
    recordsList,
    allPromptText,
    footer,
    footerLeftActions,
    statusMessage,
    errorMessage,
    copyContextButton,
    previewButton,
    previewFloat,
    previewFloatContent,
    quickAskButton,
    createTaskButton,
    latestSessionSection,
    latestSessionTitle,
    latestSessionStatus,
    latestSessionMeta,
    latestSessionMessage,
    latestSessionHint,
    latestSessionRefreshButton,
    latestSessionTimelineToggle,
    latestSessionTimelineTitle,
    latestSessionTimelineContainer,
    latestSessionError,
    recommendedActionLabel,
    updateRawPromptPreviewPosition,
    setRawPromptPreviewVisible,
  } = dom

  let currentOptions = options
  let instructionSegments: InstructionSegment[] = []
  let isSyncingInstructionDom = false
  let renderedChipSignature = ''
  let lastRevealedSessionId = ''
  let isLatestSessionTimelineExpanded = false

  function getPromptChipRecordById(id: string): PromptChipRecord | null {
    return (
      getPromptChipRecords(
        currentOptions.session,
        currentOptions.latestSessionSummary?.status === 'resolved' ||
          currentOptions.latestSessionDetail?.status === 'resolved',
      ).find(chip => chip.id === id) ?? null
    )
  }

  const renderers = createAnnotateSidebarRenderers({
    shadowRoot,
    sidebarElement: element,
    getOptions: () => currentOptions,
    getPromptChipRecordById,
  })
  const latestSessionDom: LatestSessionDom = {
    latestSessionSection,
    latestSessionTitle,
    latestSessionMeta,
    latestSessionStatus,
    latestSessionMessage,
    latestSessionHint,
    latestSessionRefreshButton,
    latestSessionTimelineToggle,
    latestSessionTimelineTitle,
    latestSessionTimelineContainer,
    latestSessionError,
  }

  function toggleLatestSessionTimeline(): void {
    isLatestSessionTimelineExpanded = !isLatestSessionTimelineExpanded
    patch(currentOptions)
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
      fragment.appendChild(renderers.createPromptChipElement(chip))
    }

    instructionInput.replaceChildren(fragment)
    isSyncingInstructionDom = false
  }

  function syncInstructionSegmentsWithChips(session: FeedbackRecordSession): void {
    const chips = getPromptChipRecords(
      session,
      currentOptions.latestSessionSummary?.status === 'resolved' ||
        currentOptions.latestSessionDetail?.status === 'resolved',
    )
    const validChipIds = new Set(chips.map(chip => chip.id))
    const nextSegments: InstructionSegment[] = []
    const existingChipIds = new Set<string>()

    for (const segment of instructionSegments) {
      if (segment.type === 'chip') {
        if (!validChipIds.has(segment.id) || existingChipIds.has(segment.id)) continue
        existingChipIds.add(segment.id)
      }
      // Keep both 'chip' and 'text' segments to preserve user's instruction draft
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
    const nextChipSignature = getChipSignature(
      session,
      currentOptions.latestSessionSummary?.status === 'resolved' ||
        currentOptions.latestSessionDetail?.status === 'resolved',
    )
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
    const hasLatestSession = Boolean(next.latestSessionDetail || next.latestSessionSummary)
    const hasWorkflowNotice = Boolean(next.workflowNotice)
    const shouldShowBody =
      hasSavedRecords ||
      hasCurrentDraft ||
      hasLatestSession ||
      hasWorkflowNotice ||
      next.isSending ||
      next.successScope === 'quick-ask' ||
      Boolean(next.errorMessage)
    const canSend = next.isSending ? false : next.includedRecords.length > 0 || hasCurrentDraft
    const preferredAction: PreferredAction = next.preferredAction ?? 'create-task'
    const deliveryMode = next.deliveryMode ?? 'mcp'
    const showDebugHelperActions = deliveryMode !== 'mcp'

    element.style.display = ''
    emptyState.style.display = shouldShowBody ? 'none' : ''
    draftSection.style.display = shouldShowBody ? '' : 'none'
    footer.style.display = shouldShowBody ? '' : 'none'

    quickCaptureButton.setAttribute('aria-pressed', String(Boolean(next.quickCaptureEnabled)))
    quickCaptureButton.dataset.active = String(Boolean(next.quickCaptureEnabled))
    quickCaptureButton.dataset.visualState = next.quickCaptureEnabled ? 'active' : 'inactive'
    quickCaptureButton.title = next.quickCaptureEnabled
      ? `${t('annotate.quickCapture.toggle')} on`
      : t('annotate.quickCapture.toggle')

    cssContextButton.style.display = hasBatchContent && next.canAttachCssContext ? '' : 'none'
    cssContextButton.setAttribute('aria-pressed', next.cssContextEnabled ? 'true' : 'false')
    cssContextButton.dataset.visualState = next.cssContextEnabled ? 'active' : 'inactive'
    cssContextButton.title = next.cssContextEnabled ? t('menu.cssEnabled') : t('menu.attachCss')

    runtimeContextButton.style.display =
      hasBatchContent && next.canAttachRuntimeContext ? '' : 'none'
    runtimeContextButton.setAttribute('aria-pressed', next.runtimeContextEnabled ? 'true' : 'false')
    runtimeContextButton.dataset.visualState = next.runtimeContextEnabled ? 'active' : 'inactive'
    runtimeContextBadge.textContent = formatRuntimeErrorCount(next.runtimeErrorCount ?? 0)
    runtimeContextBadge.hidden = !next.runtimeContextEnabled || (next.runtimeErrorCount ?? 0) <= 0
    runtimeContextButton.title = next.runtimeContextEnabled
      ? next.runtimeErrorCount
        ? `${t('menu.runtimeEnabled')} • ${t('annotate.runtimeErrors', { count: formatRuntimeErrorCount(next.runtimeErrorCount) })}`
        : next.runtimeContextSummary
          ? `${t('menu.runtimeEnabled')} • ${next.runtimeContextSummary}`
          : t('menu.runtimeEnabled')
      : next.runtimeErrorCount
        ? `${t('menu.attachRuntime')} • ${t('annotate.runtimeErrors', { count: formatRuntimeErrorCount(next.runtimeErrorCount) })}`
        : t('menu.attachRuntime')

    modeButton.innerHTML = next.mode === 'capture-enabled' ? pauseIconSvg : playIconSvg
    const toggleSvgElement = modeButton.querySelector('svg')
    if (toggleSvgElement) {
      toggleSvgElement.style.width = '14px'
      toggleSvgElement.style.height = '14px'
      toggleSvgElement.style.display = 'block'
    }
    modeButton.setAttribute(
      'aria-label',
      next.mode === 'capture-enabled'
        ? t('launcher.action.pause.title')
        : t('launcher.action.resume.title'),
    )
    modeButton.title =
      next.mode === 'capture-enabled'
        ? t('launcher.action.pause.title')
        : t('launcher.action.resume.title')
    modeButton.dataset.selected = String(next.mode === 'capture-enabled')

    headerStatus.textContent =
      next.mode === 'capture-enabled'
        ? next.quickCaptureEnabled
          ? `${t('annotate.header.capturing')} • ${t('annotate.header.quickCaptureOn', { label: t('annotate.quickCapture.toggle') })}`
          : t('annotate.header.capturing')
        : next.quickCaptureEnabled
          ? `${t('launcher.state.paused')} • ${t('annotate.header.quickCaptureOn', { label: t('annotate.quickCapture.toggle') })}`
          : t('launcher.state.paused')

    renderPromptChips(next.session)
    allPromptText.textContent = next.fullPrompt
    previewFloatContent.textContent = next.fullPrompt
    footerLeftActions.style.display = canSend && showDebugHelperActions ? 'flex' : 'none'
    previewButton.style.display = canSend && showDebugHelperActions ? '' : 'none'
    copyContextButton.style.display = canSend && showDebugHelperActions ? '' : 'none'
    if (!canSend) {
      setRawPromptPreviewVisible(false)
    }
    if (previewFloat.style.display === 'block') {
      updateRawPromptPreviewPosition()
    }

    includedSummary.textContent = `Element notes (${next.includedRecords.length})`
    renderers.renderIncludedRecords(next.includedRecords, recordsList)

    const allowQuickAsk = deliveryMode === 'ide'
    const allowCreateTask = deliveryMode === 'mcp'

    quickAskButton.style.display = allowQuickAsk ? '' : 'none'
    createTaskButton.style.display = allowCreateTask ? '' : 'none'

    quickAskButton.disabled = !canSend
    createTaskButton.disabled = !canSend

    quickAskButton.classList.toggle('primary', true)
    createTaskButton.classList.toggle('primary', true)
    quickAskButton.dataset.emphasis = 'primary'
    createTaskButton.dataset.emphasis = 'primary'
    quickAskButton.style.flex = '1'
    createTaskButton.style.flex = '1'
    quickAskButton.dataset.layoutRole = 'primary'
    createTaskButton.dataset.layoutRole = 'primary'

    quickAskButton.title = t('annotate.askAiHint')
    createTaskButton.title = t('annotate.createTaskHint')
    recommendedActionLabel.style.display = 'none'
    recommendedActionLabel.textContent =
      preferredAction === 'quick-ask'
        ? t('annotate.recommendedAction.askHint', {
            action: t('annotate.askAi'),
          })
        : t('annotate.recommendedAction.agentHint', {
            action: t('annotate.createTask'),
          })
    quickAskButton.textContent =
      next.isSending && next.sendingScope === 'quick-ask'
        ? t('menu.sending')
        : !next.isSending && next.successScope === 'quick-ask'
          ? t('annotate.sent')
          : t('annotate.askAi')
    createTaskButton.textContent =
      next.isSending && next.sendingScope === 'create-task'
        ? t('menu.sending')
        : t('annotate.createTask')

    renderWorkflowRow(dom, next)

    const latestSessionRenderResult = renderLatestSession(latestSessionDom, {
      latestSession: next.latestSessionDetail ?? null,
      latestSessionSummary: next.latestSessionSummary ?? null,
      workflowNotice: next.workflowNotice ?? null,
      isTimelineExpanded: isLatestSessionTimelineExpanded,
      lastRevealedSessionId,
      isLoading: Boolean(next.latestSessionLoading),
      error: next.latestSessionError,
    })
    isLatestSessionTimelineExpanded = latestSessionRenderResult.isTimelineExpanded
    if (latestSessionRenderResult.isNewLatestSession) {
      lastRevealedSessionId = latestSessionRenderResult.latestSessionId
      // Avoid auto-scrolling to the latest session if we have unsaved local changes
      if (!hasCurrentDraft && !hasSavedRecords) {
        latestSessionSection.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }

    statusMessage.textContent = getLiveStatusMessage(next)
    errorMessage.textContent = next.errorMessage ?? ''
    errorMessage.style.display = next.errorMessage ? 'block' : 'none'
  }

  instructionSegments = normalizeInstructionSegments([
    { type: 'text', text: currentOptions.instruction },
  ])

  function handleInstructionInput(): void {
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
  }

  attachAnnotateSidebarEvents({
    dom,
    getOptions: () => currentOptions,
    toggleLatestSessionTimeline,
    handleInstructionInput,
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
