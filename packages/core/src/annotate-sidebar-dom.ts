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
import {
  bugIconSvg,
  cssIconSvg,
  pureMarkIconSvg,
  screenshotIconSvg,
  closeIconSvg,
} from './icons.js'
import { createSidebarButton } from './annotate-sidebar-helpers.js'

export interface AnnotateSidebarDom {
  element: HTMLElement
  headerStatus: HTMLDivElement
  quickCaptureButton: HTMLButtonElement
  screenshotContextButton: HTMLButtonElement
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
  footer: HTMLElement
  statusMessage: HTMLDivElement
  errorMessage: HTMLDivElement
  previewCodeButton: HTMLButtonElement
  previewFloat: HTMLDivElement
  previewFloatContent: HTMLPreElement
  sendButton: HTMLButtonElement
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
  headerTitle.textContent = 'Annotate mode'

  const headerStatus = document.createElement('div')
  headerStatus.setAttribute('data-inspecto-annotate-header-status', 'true')

  headerCopy.append(headerTitle, headerStatus)

  const headerActions = document.createElement('div')
  headerActions.className = annotateSidebarActionsClass
  headerActions.setAttribute('data-inspecto-annotate-header-actions', 'true')

  const quickCaptureButton = createSidebarButton(pureMarkIconSvg, annotateSidebarButtonClass, true)
  quickCaptureButton.dataset.role = 'quick-capture'
  quickCaptureButton.classList.add(runtimeToggleClass)
  quickCaptureButton.setAttribute('aria-label', 'Toggle quick capture')
  quickCaptureButton.title = 'Toggle quick capture'
  const quickCaptureSvgElement = quickCaptureButton.querySelector('svg')
  if (quickCaptureSvgElement) {
    quickCaptureSvgElement.style.width = '18px'
    quickCaptureSvgElement.style.height = '18px'
    quickCaptureSvgElement.style.display = 'block'
  }

  const screenshotContextButton = createSidebarButton(
    screenshotIconSvg,
    annotateSidebarButtonClass,
    true,
  )
  const screenshotSvgElement = screenshotContextButton.querySelector('svg')
  if (screenshotSvgElement) {
    screenshotSvgElement.style.width = '18px'
    screenshotSvgElement.style.height = '18px'
  }
  screenshotContextButton.classList.add(runtimeToggleClass)
  screenshotContextButton.setAttribute('aria-label', 'Attach screenshot context')
  screenshotContextButton.title = 'Attach screenshot context'

  const cssContextButton = createSidebarButton(cssIconSvg, annotateSidebarButtonClass, true)
  const cssSvgElement = cssContextButton.querySelector('svg')
  if (cssSvgElement) {
    cssSvgElement.style.width = '18px'
    cssSvgElement.style.height = '18px'
  }
  cssContextButton.classList.add(runtimeToggleClass)
  cssContextButton.setAttribute('aria-label', 'Attach CSS context')
  cssContextButton.title = 'Attach CSS context'

  const runtimeContextButton = createSidebarButton('⚡', annotateSidebarButtonClass)
  runtimeContextButton.classList.add(runtimeToggleClass)
  runtimeContextButton.setAttribute('aria-label', 'Attach runtime context')
  runtimeContextButton.title = 'Attach runtime context'
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
  exitButton.setAttribute('aria-label', 'Exit annotate mode')
  exitButton.title = 'Exit annotate mode'

  headerActions.append(
    quickCaptureButton,
    screenshotContextButton,
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
  emptyStateTitle.textContent = 'Start by clicking a component'

  const emptyStateBody = document.createElement('div')
  emptyStateBody.className = annotateSidebarEmptyClass
  emptyStateBody.setAttribute('data-inspecto-annotate-empty-body', 'true')
  emptyStateBody.textContent =
    'Each click opens one note. Save a few notes first, then add an overall goal and Ask AI once.'

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
  instructionInput.dataset.placeholder = 'Overall goal for this batch (optional)...'
  instructionInput.setAttribute('aria-label', 'Overall goal')

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
  fullPromptSummary.textContent = 'Preview message'
  const allPromptLabel = document.createElement('div')
  allPromptLabel.className = annotateSidebarQueueMetaClass
  allPromptLabel.textContent = 'Batch payload'
  const allPromptText = document.createElement('pre')
  allPromptText.className = annotateSidebarTextClass
  allPromptText.dataset.variant = 'full-prompt'
  fullPromptDetails.append(fullPromptSummary, allPromptLabel, allPromptText)
  draftSection.append(promptContainer, includedSection, fullPromptDetails)

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
  footerLayout.style.alignItems = 'center'
  footerLayout.style.justifyContent = 'space-between'
  footerLayout.style.width = '100%'

  const footerLeftActions = document.createElement('div')
  footerLeftActions.className = annotateSidebarActionsClass
  footerLeftActions.style.flex = '0 0 auto'

  const previewCodeButton = createSidebarButton('</>', annotateSidebarButtonClass)
  previewCodeButton.dataset.inspectoAnnotateRawPromptButton = 'true'
  previewCodeButton.dataset.role = 'raw-preview'
  previewCodeButton.style.fontFamily = 'monospace'
  previewCodeButton.style.fontSize = '12px'
  previewCodeButton.style.fontWeight = '600'
  previewCodeButton.title = 'View raw prompt payload'

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
    const availableAbove = Math.max(120, Math.floor(footerRect.top - viewportPadding - gap))
    const availableBelow = Math.max(
      120,
      Math.floor(window.innerHeight - footerRect.bottom - viewportPadding - gap),
    )

    const shouldOpenBelow = availableAbove < measuredHeight && availableBelow > availableAbove

    if (shouldOpenBelow) {
      previewFloat.style.top = 'calc(100% + 8px)'
      previewFloat.style.bottom = 'auto'
      previewFloat.style.maxHeight = `${Math.min(maxPreviewHeight, availableBelow)}px`
      return
    }

    previewFloat.style.top = 'auto'
    previewFloat.style.bottom = 'calc(100% + 8px)'
    previewFloat.style.maxHeight = `${Math.min(maxPreviewHeight, availableAbove)}px`
  }

  function syncRawPromptButtonState(isVisible: boolean): void {
    previewCodeButton.dataset.selected = isVisible ? 'true' : 'false'
  }

  function setRawPromptPreviewVisible(isVisible: boolean): void {
    previewFloat.style.display = isVisible ? 'block' : 'none'
    syncRawPromptButtonState(isVisible)
    if (isVisible) updateRawPromptPreviewPosition()
  }

  previewCodeButton.addEventListener('click', event => {
    event.stopPropagation()
    setRawPromptPreviewVisible(previewFloat.style.display !== 'block')
  })

  element.addEventListener('click', event => {
    const clickTarget = (event.target as Node | null | undefined) ?? null
    if (!previewFloat.contains(clickTarget) && clickTarget !== previewCodeButton) {
      setRawPromptPreviewVisible(false)
    }
  })

  footerLeftActions.appendChild(previewCodeButton)

  const footerActions = document.createElement('div')
  footerActions.className = annotateSidebarActionsClass
  const sendButton = createSidebarButton('Ask AI', annotateSidebarButtonClass)
  sendButton.dataset.role = 'send'
  sendButton.classList.add('primary')

  footerActions.append(sendButton)
  footerLayout.append(footerLeftActions, footerActions)
  footer.append(previewFloat, statusMessage, errorMessage, footerLayout)

  element.append(header, emptyState, draftSection, footer)
  shadowRoot.appendChild(element)

  return {
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
  }
}
