import { getLiveStatusMessage, getPromptChipRecords, type PromptChipRecord } from './helpers.js'
import { createAnnotateSidebarDom } from './dom.js'
import { createAnnotateSidebarRenderers } from './renderers.js'
import { renderWorkflowRow } from './workflow-row.js'
import { renderLatestSession, type LatestSessionDom } from './latest-session-renderer.js'
import { attachAnnotateSidebarEvents } from './events.js'
import { getAnnotateSidebarViewState } from './view-state.js'
import { createInstructionChipController } from './instruction-chips.js'
import { renderAnnotateSidebarHeaderControls } from './header-controls.js'
import { renderAnnotateSidebarPrimaryActions } from './primary-actions.js'
import type { AnnotateSidebarOptions, SidebarController } from './types.js'
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

  const instructionChips = createInstructionChipController({
    input: instructionInput,
    getOptions: () => currentOptions,
    getPromptChipRecordById,
    createPromptChipElement: chip => renderers.createPromptChipElement(chip),
    onInstructionChange: instruction => currentOptions.onUpdateInstruction(instruction),
  })

  function patch(next: AnnotateSidebarOptions): void {
    const viewState = getAnnotateSidebarViewState(next)

    element.style.display = ''
    emptyState.style.display = viewState.shouldShowBody ? 'none' : ''
    draftSection.style.display = viewState.shouldShowBody ? '' : 'none'
    footer.style.display = viewState.shouldShowBody ? '' : 'none'

    renderAnnotateSidebarHeaderControls(
      {
        headerStatus,
        quickCaptureButton,
        cssContextButton,
        runtimeContextButton,
        runtimeContextBadge,
        modeButton,
      },
      next,
      viewState,
    )

    instructionChips.render(next.session)
    allPromptText.textContent = next.fullPrompt
    previewFloatContent.textContent = next.fullPrompt
    footerLeftActions.style.display =
      viewState.canSend && viewState.showDebugHelperActions ? 'flex' : 'none'
    previewButton.style.display =
      viewState.canSend && viewState.showDebugHelperActions ? '' : 'none'
    copyContextButton.style.display =
      viewState.canSend && viewState.showDebugHelperActions ? '' : 'none'
    if (!viewState.canSend) {
      setRawPromptPreviewVisible(false)
    }
    if (previewFloat.style.display === 'block') {
      updateRawPromptPreviewPosition()
    }

    includedSummary.textContent = `Element notes (${next.includedRecords.length})`
    renderers.renderIncludedRecords(next.includedRecords, recordsList)

    renderAnnotateSidebarPrimaryActions(
      { quickAskButton, createTaskButton, recommendedActionLabel },
      next,
      viewState,
    )

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
      if (!viewState.hasCurrentDraft && !viewState.hasSavedRecords) {
        latestSessionSection.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }

    statusMessage.textContent = getLiveStatusMessage(next)
    errorMessage.textContent = next.errorMessage ?? ''
    errorMessage.style.display = next.errorMessage ? 'block' : 'none'
  }

  attachAnnotateSidebarEvents({
    dom,
    getOptions: () => currentOptions,
    toggleLatestSessionTimeline,
    handleInstructionInput: instructionChips.handleInput,
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
