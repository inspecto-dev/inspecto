import {
  annotateQueueListClass,
  annotateSidebarClass,
  annotateSidebarEmptyClass,
  annotateSidebarInputClass,
  annotateSidebarQueueMetaClass,
  annotateSidebarSectionClass,
  annotateSidebarTextClass,
} from '../../../shared/styles/index.js'
import { t } from '../../../shared/i18n.js'
import { createAnnotateSidebarFooterDom } from './footer-dom.js'
import { createAnnotateSidebarHeaderDom } from './header-dom.js'
import { createAnnotateSidebarLatestSessionDom } from './latest-session-dom.js'
import { getRawPromptPreviewPosition } from './raw-preview-position.js'

export interface AnnotateSidebarDom {
  element: HTMLElement
  headerStatus: HTMLDivElement
  quickCaptureButton: HTMLButtonElement
  cssContextButton: HTMLButtonElement
  runtimeContextButton: HTMLButtonElement
  runtimeContextBadge: HTMLSpanElement
  modeButton: HTMLButtonElement
  exitButton: HTMLButtonElement
  emptyState: HTMLElement
  draftSection: HTMLElement
  workflowRow: HTMLDivElement
  instructionInput: HTMLDivElement
  includedSummary: HTMLElement
  recordsList: HTMLDivElement
  allPromptText: HTMLPreElement
  latestSessionSection: HTMLElement
  latestSessionTitle: HTMLDivElement
  latestSessionStatus: HTMLSpanElement
  latestSessionMeta: HTMLDivElement
  latestSessionMessage: HTMLDivElement
  latestSessionHint: HTMLDivElement
  latestSessionRefreshButton: HTMLButtonElement
  latestSessionTimelineToggle: HTMLButtonElement
  latestSessionTimelineTitle: HTMLDivElement
  latestSessionTimelineContainer: HTMLDivElement
  latestSessionError: HTMLDivElement
  footer: HTMLElement
  footerLeftActions: HTMLDivElement
  recommendedActionLabel: HTMLDivElement
  statusMessage: HTMLDivElement
  errorMessage: HTMLDivElement
  copyContextButton: HTMLButtonElement
  previewButton: HTMLButtonElement
  previewFloat: HTMLDivElement
  previewFloatContent: HTMLPreElement
  quickAskButton: HTMLButtonElement
  createTaskButton: HTMLButtonElement
  updateRawPromptPreviewPosition(): void
  setRawPromptPreviewVisible(isVisible: boolean): void
  showConfirmDialog(message: string, onConfirm: () => void): void
}

export function createAnnotateSidebarDom(shadowRoot: ShadowRoot): AnnotateSidebarDom {
  const element = document.createElement('aside')
  element.className = annotateSidebarClass

  const {
    header,
    headerStatus,
    quickCaptureButton,
    cssContextButton,
    runtimeContextButton,
    runtimeContextBadge,
    modeButton,
    exitButton,
    copyContextButton,
    previewButton,
  } = createAnnotateSidebarHeaderDom()

  const emptyState = document.createElement('section')
  emptyState.className = annotateSidebarSectionClass
  emptyState.dataset.variant = 'empty-state'
  emptyState.style.display = 'none'

  const emptyStateTitle = document.createElement('div')
  emptyStateTitle.setAttribute('data-inspecto-annotate-empty-title', 'true')
  emptyStateTitle.textContent = t('annotate.empty.title')

  const emptyStateBody = document.createElement('div')
  emptyStateBody.className = annotateSidebarEmptyClass
  emptyStateBody.setAttribute('data-inspecto-annotate-empty-body', 'true')
  emptyStateBody.textContent = t('annotate.empty.body')

  emptyState.append(emptyStateTitle, emptyStateBody)

  const draftSection = document.createElement('section')
  draftSection.className = annotateSidebarSectionClass
  draftSection.dataset.variant = 'draft'

  const promptContainer = document.createElement('div')
  promptContainer.style.display = 'flex'
  promptContainer.style.flexDirection = 'column'
  promptContainer.style.gap = '0'
  promptContainer.style.background = 'rgba(255, 255, 255, 0.045)'
  promptContainer.style.border = '1px solid rgba(255, 255, 255, 0.08)'
  promptContainer.style.borderRadius = 'var(--inspecto-radius-lg)'
  promptContainer.style.padding = '0'
  promptContainer.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.03)'
  promptContainer.style.transition =
    'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease'

  const instructionInput = document.createElement('div')
  instructionInput.contentEditable = 'true'
  instructionInput.style.border = 'none'
  instructionInput.style.background = 'transparent'
  instructionInput.style.minHeight = '60px'
  instructionInput.style.outline = 'none'
  instructionInput.style.boxShadow = 'none'
  instructionInput.className = annotateSidebarInputClass
  instructionInput.dataset.placeholder = t('annotate.instruction.placeholder')
  instructionInput.setAttribute('aria-label', t('annotate.instruction.ariaLabel'))

  const styleEl = document.createElement('style')
  styleEl.textContent = `
    .${annotateSidebarInputClass}[contenteditable]:empty::before {
      content: attr(data-placeholder);
      color: var(--inspecto-text-tertiary);
      pointer-events: none;
      display: block;
    }
  `
  shadowRoot.appendChild(styleEl)

  promptContainer.append(instructionInput)

  instructionInput.addEventListener('focus', () => {
    promptContainer.style.borderColor = 'rgba(93, 82, 243, 0.42)'
    promptContainer.style.background = 'rgba(255, 255, 255, 0.055)'
    promptContainer.style.boxShadow = '0 0 0 3px rgba(93, 82, 243, 0.16)'
  })
  instructionInput.addEventListener('blur', () => {
    promptContainer.style.borderColor = 'rgba(255, 255, 255, 0.08)'
    promptContainer.style.background = 'rgba(255, 255, 255, 0.045)'
    promptContainer.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.03)'
  })

  const includedSection = document.createElement('details')
  includedSection.style.display = 'none'
  includedSection.className = annotateSidebarSectionClass
  includedSection.dataset.variant = 'records'
  const includedSummary = document.createElement('summary')
  const recordsList = document.createElement('div')
  recordsList.className = annotateQueueListClass
  includedSection.append(includedSummary, recordsList)

  const fullPromptDetails = document.createElement('details')
  fullPromptDetails.style.display = 'none'
  fullPromptDetails.className = annotateSidebarSectionClass
  fullPromptDetails.dataset.variant = 'full-prompt'
  const fullPromptSummary = document.createElement('summary')
  fullPromptSummary.textContent = t('annotate.previewMessage')
  const allPromptLabel = document.createElement('div')
  allPromptLabel.className = annotateSidebarQueueMetaClass
  allPromptLabel.textContent = t('annotate.batchPayload')
  const allPromptText = document.createElement('pre')
  allPromptText.className = annotateSidebarTextClass
  allPromptText.dataset.variant = 'full-prompt'
  fullPromptDetails.append(fullPromptSummary, allPromptLabel, allPromptText)

  const {
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
  } = createAnnotateSidebarLatestSessionDom()

  draftSection.append(promptContainer, latestSessionSection, includedSection, fullPromptDetails)

  const {
    footer,
    workflowRow,
    footerLeftActions,
    recommendedActionLabel,
    statusMessage,
    errorMessage,
    previewFloat,
    previewFloatContent,
    quickAskButton,
    createTaskButton,
    confirmDialog,
    confirmContent,
    showConfirmDialog,
    hideConfirmDialog,
  } = createAnnotateSidebarFooterDom()

  function updateRawPromptPreviewPosition(): void {
    const footerRect = footer.getBoundingClientRect()
    const previewRect = previewFloat.getBoundingClientRect()
    const position = getRawPromptPreviewPosition({
      footerTop: footerRect.top,
      footerBottom: footerRect.bottom,
      previewHeight: previewRect.height,
      viewportHeight: window.innerHeight,
    })

    previewFloat.style.top = position.top
    previewFloat.style.bottom = position.bottom
    previewFloat.style.maxHeight = position.maxHeight
  }

  function setRawPromptPreviewVisible(isVisible: boolean): void {
    previewFloat.style.display = isVisible ? 'block' : 'none'
    if (isVisible) updateRawPromptPreviewPosition()
  }

  element.addEventListener('click', event => {
    const clickTarget = (event.target as Node | null | undefined) ?? null
    if (!previewFloat.contains(clickTarget) && !previewButton.contains(clickTarget)) {
      setRawPromptPreviewVisible(false)
    }
    if (!confirmContent.contains(clickTarget) && !workflowRow.contains(clickTarget)) {
      hideConfirmDialog()
    }
  })

  element.append(header, emptyState, draftSection, footer, confirmDialog)
  shadowRoot.appendChild(element)

  return {
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
    footer,
    footerLeftActions,
    recommendedActionLabel,
    statusMessage,
    errorMessage,
    copyContextButton,
    previewButton,
    previewFloat,
    previewFloatContent,
    quickAskButton,
    createTaskButton,
    updateRawPromptPreviewPosition,
    setRawPromptPreviewVisible,
    showConfirmDialog,
  }
}
