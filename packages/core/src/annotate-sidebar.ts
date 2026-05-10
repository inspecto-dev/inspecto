import type {
  AnnotationThreadRole,
  AnnotationWorkSession,
  AnnotationWorkSessionSummary,
  FeedbackRecord,
  FeedbackRecordSession,
} from '@inspecto-dev/types'
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
  type AnnotateSendScope,
  type PromptChipRecord,
} from './annotate-sidebar-helpers.js'
import { createAnnotateSidebarDom } from './annotate-sidebar-dom.js'
import { createAnnotateSidebarRenderers } from './annotate-sidebar-renderers.js'
import { createSidebarButton } from './annotate-sidebar-helpers.js'
import { annotateSidebarButtonClass } from './styles.js'
import { t } from './i18n.js'
import { pauseIconSvg, playIconSvg } from './icons.js'
import { buildSessionTimelineItems } from './annotate-session-timeline.js'
import { renderSessionTimeline } from './annotate-session-timeline-dom.js'

type SidebarMode = 'capture-enabled' | 'capture-paused'
type SendScope = AnnotateSendScope
type SuccessScope = 'quick-ask' | 'create-task' | null
type PreferredAction = 'quick-ask' | 'create-task'
export type AnnotateDefaultChannel = 'ide' | 'mcp'
export type AnnotateWorkflowNotice = {
  kind: 'ide-dispatch'
  workflowId: string
  workflowLabel: string
}

export interface AnnotateSidebarOptions {
  mode: SidebarMode
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
  successScope: SuccessScope
  preferredAction?: PreferredAction
  annotateChannel?: AnnotateDefaultChannel
  latestSessionSummary?: AnnotationWorkSessionSummary | null
  latestSessionDetail?: AnnotationWorkSession | null
  latestSessionLoading?: boolean
  latestSessionError?: string
  workflowNotice?: AnnotateWorkflowNotice | null
  workflows?: import('@inspecto-dev/types').WorkflowSlotOption[]
  onWorkflow?: (workflowId: string) => void
  quickCaptureEnabled?: boolean
  errorMessage?: string
  onPauseCapture: () => void
  onResumeCapture: () => void
  onToggleQuickCapture?: () => void
  onToggleCssContext?: () => void
  onToggleRuntimeContext?: () => void
  onUpdateInstruction: (instruction: string) => void
  onRemovePromptChip: (recordId: string) => void
  onEditRecord?: (id: string) => void
  onRefreshLatestSession?: () => void
  onCopyContext?: () => Promise<void>
  onQuickAsk: () => void
  onCreateTask: () => void
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
    cssContextButton,
    runtimeContextButton,
    runtimeContextBadge,
    modeButton,
    exitButton,
    emptyState,
    draftSection,
    workflowRow,
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

  type LatestSessionMessageKind = 'agent' | 'system-info'

  function classifySessionMessage(input: {
    role: AnnotationThreadRole
    text: string
  }): LatestSessionMessageKind {
    if (input.role === 'agent') return 'agent'
    return 'system-info'
  }

  function getLatestSessionFallbackMessage(status: string, hasDetail: boolean): string {
    if (!hasDetail) {
      return t('annotate.latestSession.noDetail')
    }
    if (status === 'pending' || status === 'acknowledged') {
      return status === 'acknowledged'
        ? t('annotate.latestSession.acknowledged')
        : t('annotate.latestSession.pending')
    }
    if (status === 'in_progress') {
      return t('annotate.latestSession.inProgress')
    }
    if (status === 'resolved') {
      return t('annotate.latestSession.resolved')
    }
    if (status === 'dismissed') {
      return t('annotate.latestSession.dismissed')
    }
    return t('annotate.latestSession.noDetail')
  }

  function getLatestSessionStatusLabel(status: string): string {
    if (status === 'resolved') {
      return `✓ ${t('annotate.latestSession.status.resolved')}`
    }
    if (status === 'in_progress') {
      return `◔ ${t('annotate.latestSession.status.in_progress')}`
    }
    if (status === 'dismissed') {
      return `− ${t('annotate.latestSession.status.dismissed')}`
    }
    if (status === 'acknowledged') {
      return `◔ ${t('annotate.latestSession.status.acknowledged')}`
    }
    if (status === 'pending') {
      return `• ${t(`annotate.latestSession.status.${status}`)}`
    }
    return t(`annotate.latestSession.status.${status}`)
  }

  function getLatestSessionHint(status: string): string {
    if (status === 'pending' || status === 'acknowledged') {
      if (status === 'acknowledged') {
        return t('annotate.latestSession.hint.acknowledged')
      }
      return t('annotate.latestSession.hint.pending')
    }
    if (status === 'in_progress') {
      return t('annotate.latestSession.hint.in_progress')
    }
    if (status === 'resolved') {
      return t('annotate.latestSession.hint.resolved')
    }
    return ''
  }

  function getLatestSessionErrorMessage(error: string | undefined): string {
    if (!error) return ''
    if (error === 'Live session updates disconnected. You can refresh to reconnect.') {
      return t('annotate.latestSession.error.disconnected')
    }
    return error
  }

  function applyLatestSessionStatusStyles(status: string): void {
    latestSessionStatus.dataset.status = status
    if (status === 'resolved') {
      latestSessionStatus.style.background = 'rgba(18, 183, 106, 0.12)'
      latestSessionStatus.style.borderColor = 'rgba(18, 183, 106, 0.25)'
      latestSessionStatus.style.color = '#5ad496'
      return
    }
    if (status === 'in_progress') {
      latestSessionStatus.style.background = 'rgba(47, 128, 237, 0.12)'
      latestSessionStatus.style.borderColor = 'rgba(47, 128, 237, 0.25)'
      latestSessionStatus.style.color = '#73b2ff'
      return
    }
    if (status === 'dismissed') {
      latestSessionStatus.style.background = 'rgba(152, 162, 179, 0.12)'
      latestSessionStatus.style.borderColor = 'rgba(152, 162, 179, 0.25)'
      latestSessionStatus.style.color = '#b0b8c6'
      return
    }

    latestSessionStatus.style.background = 'rgba(255, 255, 255, 0.06)'
    latestSessionStatus.style.borderColor = 'rgba(255, 255, 255, 0.1)'
    latestSessionStatus.style.color = 'var(--inspecto-text-secondary)'
  }

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

  latestSessionRefreshButton.addEventListener('click', event => {
    event.preventDefault()
    currentOptions.onRefreshLatestSession?.()
  })
  latestSessionTimelineToggle.addEventListener('click', event => {
    event.preventDefault()
    isLatestSessionTimelineExpanded = !isLatestSessionTimelineExpanded
    patch(currentOptions)
  })
  previewButton.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    setRawPromptPreviewVisible(previewFloat.style.display !== 'block')
  })
  const originalCopyHtml = copyContextButton.innerHTML
  copyContextButton.addEventListener('click', event => {
    event.preventDefault()
    if (!currentOptions.onCopyContext) return
    const promise = currentOptions.onCopyContext()
    if (promise) {
      copyContextButton.innerHTML =
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      copyContextButton.title = t('annotate.copyContext.copied')
      promise
        .then(() => {
          setTimeout(() => {
            copyContextButton.innerHTML = originalCopyHtml
            copyContextButton.title = t('annotate.copyContext')
          }, 1500)
        })
        .catch(() => {
          copyContextButton.innerHTML = originalCopyHtml
          copyContextButton.title = t('annotate.copyContext')
        })
    }
  })

  quickAskButton.addEventListener('click', event => {
    event.preventDefault()
    currentOptions.onQuickAsk()
  })
  createTaskButton.addEventListener('click', event => {
    event.preventDefault()
    currentOptions.onCreateTask()
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
    const channelPreference = next.annotateChannel ?? 'mcp'
    const showDebugHelperActions = channelPreference !== 'mcp'

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

    const allowQuickAsk = channelPreference === 'ide'
    const allowCreateTask = channelPreference === 'mcp'

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

    // ===== Workflow Buttons =====
    const workflows = next.workflows || []
    workflowRow.style.display = workflows.length > 0 ? 'flex' : 'none'

    // Clear and rebuild workflow buttons
    workflowRow.innerHTML = ''

    for (const wf of workflows) {
      const btn = createSidebarButton(wf.label, annotateSidebarButtonClass)
      btn.dataset.workflowId = wf.id
      btn.style.flex = '1'
      btn.style.justifyContent = 'center'
      btn.style.whiteSpace = 'nowrap'

      const isSendingWorkflow = next.isSending && next.sendingScope === `workflow:${wf.id}`
      btn.disabled = next.isSending
      btn.textContent = isSendingWorkflow ? t('menu.sending') : wf.label

      btn.addEventListener('click', () => {
        if (wf.confirm) {
          dom.showConfirmDialog(t('workflow.confirm', { label: wf.label }), () => {
            next.onWorkflow?.(wf.id)
          })
          return
        }
        next.onWorkflow?.(wf.id)
      })

      workflowRow.appendChild(btn)
    }

    const latestSession = next.latestSessionDetail
    const latestSessionSummary = next.latestSessionSummary
    const workflowNotice = next.workflowNotice ?? null
    latestSessionSection.style.display =
      latestSession || latestSessionSummary || workflowNotice ? '' : 'none'
    latestSessionRefreshButton.disabled = Boolean(next.latestSessionLoading)
    latestSessionTitle.textContent = workflowNotice
      ? t('workflow.notice.title')
      : t('annotate.latestSession.title')

    if (workflowNotice && !latestSession && !latestSessionSummary) {
      latestSessionMeta.textContent = t('workflow.notice.meta.ide')
      latestSessionStatus.textContent = `• ${t('workflow.notice.status.ide')}`
      applyLatestSessionStatusStyles('pending')
      latestSessionMessage.style.display = 'block'
      latestSessionMessage.textContent = t('workflow.notice.message.ide')
      latestSessionMessage.dataset.variant = 'system-info'
      latestSessionMessage.style.color = '#9ed8ff'
      latestSessionHint.textContent = t('workflow.notice.hint.ide')
      latestSessionHint.style.display = 'block'
      latestSessionHint.style.color = 'var(--inspecto-text-secondary)'
      latestSessionError.textContent = ''
      latestSessionError.style.display = 'none'
      latestSessionRefreshButton.textContent = '↻'
      latestSessionRefreshButton.style.display = 'none'
      latestSessionRefreshButton.style.minWidth = ''
      latestSessionRefreshButton.style.padding = ''
      latestSessionRefreshButton.style.fontSize = '12px'
      latestSessionTimelineToggle.style.display = 'none'
      latestSessionTimelineTitle.style.display = 'none'
      latestSessionTimelineContainer.style.display = 'none'
      latestSessionTimelineContainer.replaceChildren()
    } else if (latestSession || latestSessionSummary) {
      const latestStatus = latestSession?.status ?? latestSessionSummary?.status ?? 'pending'
      const latestSessionId = latestSession?.id ?? latestSessionSummary?.id ?? ''
      const isNewLatestSession = Boolean(
        latestSessionId && latestSessionId !== lastRevealedSessionId,
      )
      if (isNewLatestSession) {
        isLatestSessionTimelineExpanded = false
      }
      latestSessionMeta.textContent = latestSession
        ? t('annotate.latestSession.meta.loaded', {
            id: latestSession.id.slice(0, 8),
            count: latestSession.annotations.length,
          })
        : latestSessionSummary
          ? t('annotate.latestSession.meta.summary', {
              id: latestSessionSummary.id.slice(0, 8),
            })
          : ''

      const lastAgentOrSystemMessageRecord =
        latestSession?.messages
          ?.filter(message => message.role === 'agent' || message.role === 'system')
          .slice(-1)[0] ?? null
      const lastAgentOrSystemMessage = lastAgentOrSystemMessageRecord?.text?.trim() ?? ''
      const latestMessageKind =
        lastAgentOrSystemMessageRecord && lastAgentOrSystemMessage
          ? classifySessionMessage({
              role: lastAgentOrSystemMessageRecord.role,
              text: lastAgentOrSystemMessage,
            })
          : null
      const latestVisualStatus = latestStatus
      const canShowTimeline = Boolean(latestSession)
      const shouldShowTimeline = canShowTimeline && isLatestSessionTimelineExpanded

      latestSessionStatus.textContent = getLatestSessionStatusLabel(latestVisualStatus)
      applyLatestSessionStatusStyles(latestVisualStatus)

      latestSessionMessage.style.display = 'none'
      latestSessionMessage.textContent = ''
      delete latestSessionMessage.dataset.inspectoLatestSessionPreview
      latestSessionMessage.style.overflow = ''
      latestSessionMessage.style.textOverflow = ''
      latestSessionMessage.style.maxHeight = ''
      latestSessionMessage.style.setProperty('-webkit-line-clamp', '')
      latestSessionMessage.style.setProperty('-webkit-box-orient', '')

      const fallbackMsg = getLatestSessionFallbackMessage(latestStatus, Boolean(latestSession))
      const hasMessage =
        next.latestSessionLoading ||
        (!shouldShowTimeline && (lastAgentOrSystemMessage || fallbackMsg))

      if (hasMessage) {
        latestSessionMessage.textContent = next.latestSessionLoading
          ? t('annotate.latestSession.loading')
          : lastAgentOrSystemMessage || fallbackMsg
        if (next.latestSessionLoading) {
          latestSessionMessage.style.display = 'block'
        } else {
          latestSessionMessage.dataset.inspectoLatestSessionPreview = 'true'
          latestSessionMessage.style.display = 'block'
          latestSessionMessage.style.overflow = 'hidden'
          latestSessionMessage.style.textOverflow = 'ellipsis'
          latestSessionMessage.style.maxHeight = '42px'
          latestSessionMessage.style.setProperty('-webkit-line-clamp', '2')
          latestSessionMessage.style.setProperty('-webkit-box-orient', 'vertical')
        }
      }
      const latestMessageVariant = latestMessageKind
      latestSessionMessage.dataset.variant = latestMessageVariant ?? 'default'
      if (latestMessageVariant === 'system-info') {
        latestSessionMessage.style.color = '#9ed8ff'
      } else {
        latestSessionMessage.style.color = 'var(--inspecto-text-secondary)'
      }
      const latestSessionHintText = next.latestSessionLoading
        ? ''
        : shouldShowTimeline && latestStatus !== 'resolved'
          ? ''
          : getLatestSessionHint(latestStatus)
      const latestSessionErrorText = getLatestSessionErrorMessage(next.latestSessionError)
      const showReconnectAction = Boolean(latestSessionErrorText)
      latestSessionHint.textContent = latestSessionHintText
      latestSessionHint.style.display =
        latestSessionHintText && !showReconnectAction ? 'block' : 'none'
      latestSessionHint.style.color =
        latestStatus === 'resolved' ? '#b7f5cd' : 'var(--inspecto-text-secondary)'
      latestSessionError.textContent = latestSessionErrorText
      latestSessionError.style.display = latestSessionErrorText ? 'block' : 'none'
      latestSessionRefreshButton.textContent = showReconnectAction
        ? t('annotate.latestSession.reconnect')
        : '↻'
      latestSessionRefreshButton.style.display =
        showReconnectAction || next.latestSessionLoading ? '' : 'none'
      latestSessionRefreshButton.style.minWidth = showReconnectAction ? 'auto' : ''
      latestSessionRefreshButton.style.padding = showReconnectAction ? '6px 10px' : ''
      latestSessionRefreshButton.style.fontSize = showReconnectAction ? '11px' : '12px'

      latestSessionTimelineToggle.style.display = canShowTimeline ? '' : 'none'
      latestSessionTimelineToggle.textContent = isLatestSessionTimelineExpanded
        ? t('annotate.latestSession.collapseTimeline')
        : t('annotate.latestSession.expandTimeline')
      latestSessionTimelineToggle.setAttribute(
        'aria-expanded',
        String(isLatestSessionTimelineExpanded),
      )

      latestSessionTimelineTitle.style.display = shouldShowTimeline ? 'block' : 'none'
      latestSessionTimelineContainer.style.display = shouldShowTimeline ? 'block' : 'none'
      if (latestSession && shouldShowTimeline) {
        renderSessionTimeline(
          latestSessionTimelineContainer,
          buildSessionTimelineItems(latestSession),
        )
      } else {
        latestSessionTimelineContainer.replaceChildren()
      }

      if (isNewLatestSession) {
        lastRevealedSessionId = latestSessionId
        // Avoid auto-scrolling to the latest session if we have unsaved local changes
        if (!hasCurrentDraft && !hasSavedRecords) {
          latestSessionSection.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
      }
    } else {
      latestSessionHint.textContent = ''
      latestSessionHint.style.display = 'none'
      latestSessionMessage.dataset.variant = 'default'
      latestSessionMessage.style.color = 'var(--inspecto-text-secondary)'
      latestSessionError.textContent = ''
      latestSessionError.style.display = 'none'
      latestSessionRefreshButton.textContent = '↻'
      latestSessionRefreshButton.style.display = 'none'
      latestSessionRefreshButton.style.minWidth = ''
      latestSessionRefreshButton.style.padding = ''
      latestSessionRefreshButton.style.fontSize = '12px'
      latestSessionTimelineToggle.style.display = 'none'
      latestSessionTimelineTitle.style.display = 'none'
      latestSessionTimelineContainer.style.display = 'none'
      latestSessionTimelineContainer.replaceChildren()
    }

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

  cssContextButton.addEventListener('click', () => currentOptions.onToggleCssContext?.())
  runtimeContextButton.addEventListener('click', () => currentOptions.onToggleRuntimeContext?.())
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
