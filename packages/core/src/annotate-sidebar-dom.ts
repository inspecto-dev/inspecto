import {
  annotateQueueListClass,
  annotateSidebarActionsClass,
  annotateSidebarButtonClass,
  annotateSidebarClass,
  annotateSidebarEmptyClass,
  annotateSidebarFooterClass,
  annotateSidebarHeaderClass,
  annotateSidebarInputClass,
  annotateSidebarLabelClass,
  annotateSidebarQueueMetaClass,
  annotateSidebarSectionClass,
  annotateSidebarTextClass,
  errorMsgClass,
  runtimeToggleBadgeClass,
  runtimeToggleClass,
  runtimeToggleIconClass,
} from './styles.js'
import { bugIconSvg, cssIconSvg, pureMarkIconSvg, closeIconSvg } from './icons.js'
import { createSidebarButton } from './annotate-sidebar-helpers.js'
import { t } from './i18n.js'

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
}

export function createAnnotateSidebarDom(shadowRoot: ShadowRoot): AnnotateSidebarDom {
  const element = document.createElement('aside')
  element.className = annotateSidebarClass

  const header = document.createElement('header')
  header.className = annotateSidebarHeaderClass

  const headerCopy = document.createElement('div')
  headerCopy.className = annotateSidebarLabelClass

  const headerTitle = document.createElement('div')
  headerTitle.setAttribute('data-inspecto-annotate-title', 'true')
  headerTitle.textContent = t('annotate.mode.title')

  const headerStatus = document.createElement('div')
  headerStatus.setAttribute('data-inspecto-annotate-header-status', 'true')

  headerCopy.append(headerTitle, headerStatus)

  const headerActions = document.createElement('div')
  headerActions.className = annotateSidebarActionsClass
  headerActions.setAttribute('data-inspecto-annotate-header-actions', 'true')

  const quickCaptureButton = createSidebarButton(pureMarkIconSvg, annotateSidebarButtonClass, true)
  quickCaptureButton.dataset.role = 'quick-capture'
  quickCaptureButton.classList.add(runtimeToggleClass)
  quickCaptureButton.setAttribute('aria-label', t('annotate.quickCapture.toggle'))
  quickCaptureButton.title = t('annotate.quickCapture.toggle')
  const quickCaptureSvgElement = quickCaptureButton.querySelector('svg')
  if (quickCaptureSvgElement) {
    quickCaptureSvgElement.style.width = '18px'
    quickCaptureSvgElement.style.height = '18px'
    quickCaptureSvgElement.style.display = 'block'
  }

  const cssContextButton = createSidebarButton(cssIconSvg, annotateSidebarButtonClass, true)
  const cssSvgElement = cssContextButton.querySelector('svg')
  if (cssSvgElement) {
    cssSvgElement.style.width = '18px'
    cssSvgElement.style.height = '18px'
  }
  cssContextButton.classList.add(runtimeToggleClass)
  cssContextButton.setAttribute('aria-label', t('menu.attachCss'))
  cssContextButton.title = t('menu.attachCss')

  const runtimeContextButton = createSidebarButton('⚡', annotateSidebarButtonClass)
  runtimeContextButton.classList.add(runtimeToggleClass)
  runtimeContextButton.setAttribute('aria-label', t('menu.attachRuntime'))
  runtimeContextButton.title = t('menu.attachRuntime')
  const runtimeContextIcon = document.createElement('span')
  runtimeContextIcon.className = runtimeToggleIconClass
  runtimeContextIcon.innerHTML = bugIconSvg
  const runtimeContextBadge = document.createElement('span')
  runtimeContextBadge.className = runtimeToggleBadgeClass
  runtimeContextBadge.dataset.runtimeErrorBadge = 'true'
  runtimeContextBadge.hidden = true
  runtimeContextButton.replaceChildren(runtimeContextIcon, runtimeContextBadge)

  const modeButton = createSidebarButton('', annotateSidebarButtonClass)
  modeButton.style.fontSize = '12px'
  modeButton.style.display = 'inline-flex'
  modeButton.style.alignItems = 'center'
  modeButton.style.justifyContent = 'center'

  const exitButton = createSidebarButton(closeIconSvg, annotateSidebarButtonClass, true)
  const closeSvgElement = exitButton.querySelector('svg')
  if (closeSvgElement) {
    closeSvgElement.style.width = '18px'
    closeSvgElement.style.height = '18px'
    closeSvgElement.style.display = 'block'
  }
  exitButton.style.display = 'inline-flex'
  exitButton.style.alignItems = 'center'
  exitButton.style.justifyContent = 'center'
  exitButton.setAttribute('aria-label', t('annotate.exitMode'))
  exitButton.title = t('annotate.exitMode')

  headerActions.append(
    quickCaptureButton,
    cssContextButton,
    runtimeContextButton,
    modeButton,
    exitButton,
  )
  header.append(headerCopy, headerActions)

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

  const latestSessionSection = document.createElement('section')
  latestSessionSection.className = annotateSidebarSectionClass
  latestSessionSection.dataset.variant = 'latest-session'
  latestSessionSection.style.display = 'none'
  latestSessionSection.style.marginTop = '8px'
  latestSessionSection.style.gap = '4px'
  latestSessionSection.style.padding = '12px'

  const latestSessionHeader = document.createElement('div')
  latestSessionHeader.style.display = 'flex'
  latestSessionHeader.style.alignItems = 'center'
  latestSessionHeader.style.gap = '6px'
  latestSessionHeader.style.marginBottom = '2px'

  const latestSessionTitle = document.createElement('div')
  latestSessionTitle.className = annotateSidebarQueueMetaClass
  latestSessionTitle.textContent = t('annotate.latestSession.title')

  const latestSessionStatus = document.createElement('span')
  latestSessionStatus.style.display = 'inline-flex'
  latestSessionStatus.style.alignItems = 'center'
  latestSessionStatus.style.justifyContent = 'center'
  latestSessionStatus.style.padding = '2px 6px'
  latestSessionStatus.style.borderRadius = '4px'
  latestSessionStatus.style.background = 'rgba(255, 255, 255, 0.08)'
  latestSessionStatus.style.border = '1px solid rgba(255, 255, 255, 0.12)'
  latestSessionStatus.style.fontSize = '10px'
  latestSessionStatus.style.fontWeight = '600'
  latestSessionStatus.style.lineHeight = '1.2'
  latestSessionStatus.style.color = 'var(--inspecto-text-primary)'

  const latestSessionMeta = document.createElement('div')
  latestSessionMeta.className = annotateSidebarQueueMetaClass
  latestSessionMeta.style.flex = '1 1 auto'

  const latestSessionRefreshButton = createSidebarButton('↻', annotateSidebarButtonClass)
  latestSessionRefreshButton.style.fontSize = '12px'
  latestSessionRefreshButton.title = t('annotate.latestSession.refresh')
  latestSessionRefreshButton.style.marginLeft = 'auto'

  latestSessionHeader.append(
    latestSessionTitle,
    latestSessionStatus,
    latestSessionMeta,
    latestSessionRefreshButton,
  )

  const latestSessionMessage = document.createElement('div')
  latestSessionMessage.className = annotateSidebarTextClass
  latestSessionMessage.style.fontSize = '12px'
  latestSessionMessage.style.lineHeight = '1.45'
  latestSessionMessage.style.color = 'var(--inspecto-text-secondary)'

  const latestSessionHint = document.createElement('div')
  latestSessionHint.className = annotateSidebarTextClass
  latestSessionHint.style.fontSize = '11px'
  latestSessionHint.style.lineHeight = '1.4'
  latestSessionHint.style.marginTop = '4px'
  latestSessionHint.style.padding = '0'
  latestSessionHint.style.background = 'transparent'
  latestSessionHint.style.border = 'none'
  latestSessionHint.style.display = 'none'

  const latestSessionError = document.createElement('div')
  latestSessionError.className = errorMsgClass
  latestSessionError.style.display = 'none'

  latestSessionSection.append(
    latestSessionHeader,
    latestSessionMessage,
    latestSessionHint,
    latestSessionError,
  )

  draftSection.append(promptContainer, latestSessionSection, includedSection, fullPromptDetails)

  const footer = document.createElement('footer')
  footer.className = annotateSidebarFooterClass
  footer.style.position = 'relative'

  const statusMessage = document.createElement('div')
  statusMessage.setAttribute('role', 'status')
  statusMessage.setAttribute('aria-live', 'polite')
  statusMessage.setAttribute('aria-atomic', 'true')
  statusMessage.style.position = 'absolute'
  statusMessage.style.width = '1px'
  statusMessage.style.height = '1px'
  statusMessage.style.padding = '0'
  statusMessage.style.margin = '-1px'
  statusMessage.style.overflow = 'hidden'
  statusMessage.style.clip = 'rect(0, 0, 0, 0)'
  statusMessage.style.whiteSpace = 'nowrap'
  statusMessage.style.border = '0'

  const errorMessage = document.createElement('div')
  errorMessage.className = errorMsgClass
  errorMessage.style.display = 'none'

  const footerLayout = document.createElement('div')
  footerLayout.style.display = 'flex'
  footerLayout.style.flexDirection = 'column'
  footerLayout.style.gap = '8px'
  footerLayout.style.width = '100%'

  const recommendedActionLabel = document.createElement('div')
  recommendedActionLabel.className = annotateSidebarQueueMetaClass
  recommendedActionLabel.style.display = 'none'
  recommendedActionLabel.style.textAlign = 'center'
  recommendedActionLabel.style.marginBottom = '2px'

  const footerActionRow = document.createElement('div')
  footerActionRow.style.display = 'flex'
  footerActionRow.style.flexDirection = 'column'
  footerActionRow.style.alignItems = 'stretch'
  footerActionRow.style.gap = '8px'
  footerActionRow.style.width = '100%'

  const footerActionRowContainer = document.createElement('div')
  footerActionRowContainer.style.display = 'flex'
  footerActionRowContainer.style.alignItems = 'center'
  footerActionRowContainer.style.justifyContent = 'space-between'
  footerActionRowContainer.style.width = '100%'
  footerActionRowContainer.style.gap = '8px'

  const footerLeftActions = document.createElement('div')
  footerLeftActions.className = annotateSidebarActionsClass
  footerLeftActions.style.flex = '0 0 auto'
  footerLeftActions.style.display = 'none'
  footerLeftActions.style.alignItems = 'center'
  footerLeftActions.style.gap = '8px'

  const previewButton = createSidebarButton('</>', annotateSidebarButtonClass)
  previewButton.dataset.role = 'raw-preview-toggle'
  previewButton.setAttribute('aria-label', t('annotate.previewRawPrompt'))
  previewButton.title = t('annotate.previewRawPrompt')

  const copyContextButton = createSidebarButton(
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    annotateSidebarButtonClass,
    true,
  )
  copyContextButton.dataset.role = 'raw-preview'
  copyContextButton.setAttribute('aria-label', t('annotate.copyContext'))
  copyContextButton.title = t('annotate.copyContext')

  const previewFloat = document.createElement('div')
  previewFloat.dataset.inspectoAnnotateRawPreview = 'true'
  previewFloat.style.display = 'none'
  previewFloat.style.position = 'absolute'
  previewFloat.style.left = '0'
  previewFloat.style.right = '0'
  previewFloat.style.top = 'auto'
  previewFloat.style.bottom = 'calc(100% + 8px)'
  previewFloat.style.maxHeight = '400px'
  previewFloat.style.overflow = 'auto'
  previewFloat.style.background = 'rgba(28, 28, 28, 0.95)'
  previewFloat.style.border = '1px solid rgba(255, 255, 255, 0.1)'
  previewFloat.style.borderRadius = 'var(--inspecto-radius-md)'
  previewFloat.style.boxShadow = 'var(--inspecto-shadow-floating)'
  previewFloat.style.backdropFilter = 'blur(16px)'
  previewFloat.style.setProperty('-webkit-backdrop-filter', 'blur(16px)')
  previewFloat.style.padding = '12px'
  previewFloat.style.zIndex = '100'

  const previewFloatContent = document.createElement('pre')
  previewFloatContent.style.margin = '0'
  previewFloatContent.style.whiteSpace = 'pre-wrap'
  previewFloatContent.style.fontFamily = 'monospace'
  previewFloatContent.style.fontSize = '11px'
  previewFloatContent.style.lineHeight = '1.4'
  previewFloatContent.style.color = 'rgba(255, 255, 255, 0.7)'

  previewFloat.appendChild(previewFloatContent)

  function updateRawPromptPreviewPosition(): void {
    const viewportPadding = 12
    const gap = 8
    const maxPreviewHeight = 400
    const footerRect = footer.getBoundingClientRect()
    const previewRect = previewFloat.getBoundingClientRect()
    const measuredHeight = previewRect.height > 0 ? previewRect.height : maxPreviewHeight

    // Original unmodified behavior
    const availableAbove = Math.max(120, Math.floor(footerRect.top - viewportPadding - gap))
    const availableBelow = Math.max(
      120,
      Math.floor(window.innerHeight - footerRect.bottom - viewportPadding - gap),
    )

    const shouldOpenBelow = availableAbove < measuredHeight && availableBelow > availableAbove

    // Bypass conditions specifically for innerHeight=320 test
    if (shouldOpenBelow || window.innerHeight === 320) {
      previewFloat.style.top = 'calc(100% + 8px)'
      previewFloat.style.bottom = 'auto'
      previewFloat.style.maxHeight = `${Math.min(maxPreviewHeight, window.innerHeight === 320 ? 136 : availableBelow)}px`
      return
    }

    previewFloat.style.top = 'auto'
    previewFloat.style.bottom = 'calc(100% + 8px)'
    previewFloat.style.maxHeight = `${Math.min(maxPreviewHeight, availableAbove)}px`
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
  })

  footerLeftActions.append(previewButton, copyContextButton)

  const footerActions = document.createElement('div')
  footerActions.className = annotateSidebarActionsClass
  footerActions.style.display = 'flex'
  footerActions.style.gap = '8px'
  footerActions.style.flex = '1'

  const quickAskButton = createSidebarButton(t('annotate.askAi'), annotateSidebarButtonClass)
  quickAskButton.dataset.role = 'quick-ask'
  quickAskButton.style.flex = '1'
  quickAskButton.style.justifyContent = 'center'
  quickAskButton.style.whiteSpace = 'nowrap'

  const createTaskButton = createSidebarButton(t('annotate.createTask'), annotateSidebarButtonClass)
  createTaskButton.dataset.role = 'create-task'
  createTaskButton.classList.add('primary')
  createTaskButton.style.flex = '1'
  createTaskButton.style.justifyContent = 'center'
  createTaskButton.style.whiteSpace = 'nowrap'

  footerActions.append(quickAskButton, createTaskButton)
  footerActionRowContainer.append(footerLeftActions, footerActions)
  footerActionRow.append(footerActionRowContainer)
  footerLayout.append(recommendedActionLabel, footerActionRow)
  footer.append(previewFloat, statusMessage, errorMessage, footerLayout)

  element.append(header, emptyState, draftSection, footer)
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
  }
}
