import {
  annotateSidebarActionsClass,
  annotateSidebarButtonClass,
  annotateSidebarHeaderClass,
  annotateSidebarLabelClass,
  runtimeToggleBadgeClass,
  runtimeToggleClass,
  runtimeToggleIconClass,
} from '../../../shared/styles/index.js'
import { bugIconSvg, closeIconSvg, cssIconSvg, pureMarkIconSvg } from '../../../shared/icons.js'
import { t } from '../../../shared/i18n.js'
import { createSidebarButton } from './helpers.js'

export type AnnotateSidebarHeaderDom = {
  header: HTMLElement
  headerStatus: HTMLDivElement
  quickCaptureButton: HTMLButtonElement
  cssContextButton: HTMLButtonElement
  runtimeContextButton: HTMLButtonElement
  runtimeContextBadge: HTMLSpanElement
  modeButton: HTMLButtonElement
  exitButton: HTMLButtonElement
  copyContextButton: HTMLButtonElement
  previewButton: HTMLButtonElement
}

export function createAnnotateSidebarHeaderDom(): AnnotateSidebarHeaderDom {
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

  const headerActionsLeft = document.createElement('div')
  headerActionsLeft.className = annotateSidebarActionsClass
  headerActionsLeft.setAttribute('data-inspecto-annotate-header-actions-left', 'true')

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

  headerActionsLeft.append(previewButton, copyContextButton)

  const headerActionsRight = document.createElement('div')
  headerActionsRight.className = annotateSidebarActionsClass
  headerActionsRight.setAttribute('data-inspecto-annotate-header-actions-right', 'true')

  const headerActionsContainer = document.createElement('div')
  headerActionsContainer.style.display = 'flex'
  headerActionsContainer.style.gap = '8px'
  headerActionsContainer.style.alignItems = 'center'

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

  headerActionsRight.append(
    quickCaptureButton,
    cssContextButton,
    runtimeContextButton,
    modeButton,
    exitButton,
  )
  headerActionsContainer.append(headerActionsLeft, headerActionsRight)
  header.append(headerCopy, headerActionsContainer)

  return {
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
  }
}
