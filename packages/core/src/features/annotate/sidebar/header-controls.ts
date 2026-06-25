import { t } from '../../../shared/i18n.js'
import { pauseIconSvg, playIconSvg } from '../../../shared/icons.js'
import { formatRuntimeErrorCount } from './helpers.js'
import type { AnnotateSidebarOptions } from './types.js'
import type { AnnotateSidebarViewState } from './view-state.js'

export type AnnotateSidebarHeaderControlsDom = {
  headerStatus: HTMLElement
  quickCaptureButton: HTMLElement
  cssContextButton: HTMLElement
  runtimeContextButton: HTMLElement
  runtimeContextBadge: HTMLElement
  modeButton: HTMLElement
}

function renderQuickCaptureButton(button: HTMLElement, options: AnnotateSidebarOptions): void {
  const isEnabled = Boolean(options.quickCaptureEnabled)
  button.setAttribute('aria-pressed', String(isEnabled))
  button.dataset.active = String(isEnabled)
  button.dataset.visualState = isEnabled ? 'active' : 'inactive'
  button.title = isEnabled
    ? `${t('annotate.quickCapture.toggle')} on`
    : t('annotate.quickCapture.toggle')
}

function renderCssContextButton(
  button: HTMLElement,
  options: AnnotateSidebarOptions,
  viewState: AnnotateSidebarViewState,
): void {
  button.style.display = viewState.hasBatchContent && options.canAttachCssContext ? '' : 'none'
  button.setAttribute('aria-pressed', options.cssContextEnabled ? 'true' : 'false')
  button.dataset.visualState = options.cssContextEnabled ? 'active' : 'inactive'
  button.title = options.cssContextEnabled ? t('menu.cssEnabled') : t('menu.attachCss')
}

function renderRuntimeContextButton(
  button: HTMLElement,
  badge: HTMLElement,
  options: AnnotateSidebarOptions,
  viewState: AnnotateSidebarViewState,
): void {
  const runtimeErrorCount = options.runtimeErrorCount ?? 0
  const runtimeErrorLabel = t('annotate.runtimeErrors', {
    count: formatRuntimeErrorCount(runtimeErrorCount),
  })

  button.style.display = viewState.hasBatchContent && options.canAttachRuntimeContext ? '' : 'none'
  button.setAttribute('aria-pressed', options.runtimeContextEnabled ? 'true' : 'false')
  button.dataset.visualState = options.runtimeContextEnabled ? 'active' : 'inactive'
  badge.textContent = formatRuntimeErrorCount(runtimeErrorCount)
  badge.hidden = !options.runtimeContextEnabled || runtimeErrorCount <= 0
  button.title = options.runtimeContextEnabled
    ? runtimeErrorCount
      ? `${t('menu.runtimeEnabled')} • ${runtimeErrorLabel}`
      : options.runtimeContextSummary
        ? `${t('menu.runtimeEnabled')} • ${options.runtimeContextSummary}`
        : t('menu.runtimeEnabled')
    : runtimeErrorCount
      ? `${t('menu.attachRuntime')} • ${runtimeErrorLabel}`
      : t('menu.attachRuntime')
}

function renderModeButton(button: HTMLElement, options: AnnotateSidebarOptions): void {
  const isCapturing = options.mode === 'capture-enabled'
  button.innerHTML = isCapturing ? pauseIconSvg : playIconSvg
  const toggleSvgElement = button.querySelector('svg')
  if (toggleSvgElement) {
    toggleSvgElement.style.width = '14px'
    toggleSvgElement.style.height = '14px'
    toggleSvgElement.style.display = 'block'
  }
  button.setAttribute(
    'aria-label',
    isCapturing ? t('launcher.action.pause.title') : t('launcher.action.resume.title'),
  )
  button.title = isCapturing ? t('launcher.action.pause.title') : t('launcher.action.resume.title')
  button.dataset.selected = String(isCapturing)
}

function renderHeaderStatus(element: HTMLElement, options: AnnotateSidebarOptions): void {
  const quickCaptureSuffix = options.quickCaptureEnabled
    ? ` • ${t('annotate.header.quickCaptureOn', { label: t('annotate.quickCapture.toggle') })}`
    : ''
  element.textContent =
    options.mode === 'capture-enabled'
      ? `${t('annotate.header.capturing')}${quickCaptureSuffix}`
      : `${t('launcher.state.paused')}${quickCaptureSuffix}`
}

export function renderAnnotateSidebarHeaderControls(
  dom: AnnotateSidebarHeaderControlsDom,
  options: AnnotateSidebarOptions,
  viewState: AnnotateSidebarViewState,
): void {
  renderQuickCaptureButton(dom.quickCaptureButton, options)
  renderCssContextButton(dom.cssContextButton, options, viewState)
  renderRuntimeContextButton(dom.runtimeContextButton, dom.runtimeContextBadge, options, viewState)
  renderModeButton(dom.modeButton, options)
  renderHeaderStatus(dom.headerStatus, options)
}
