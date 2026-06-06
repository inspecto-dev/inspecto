import { applyLatestSessionStatusStyles } from './latest-session.js'
import { t } from '../../../shared/i18n.js'

export type LatestSessionDom = {
  latestSessionMeta: HTMLElement
  latestSessionStatus: HTMLElement
  latestSessionMessage: HTMLElement
  latestSessionHint: HTMLElement
  latestSessionRefreshButton: HTMLElement
  latestSessionTimelineToggle: HTMLElement
  latestSessionTimelineTitle: HTMLElement
  latestSessionTimelineContainer: HTMLElement
  latestSessionError: HTMLElement
}

function resetRefreshButton(button: HTMLElement): void {
  button.textContent = '↻'
  button.style.display = 'none'
  button.style.minWidth = ''
  button.style.padding = ''
  button.style.fontSize = '12px'
}

function hideTimeline(dom: LatestSessionDom): void {
  dom.latestSessionTimelineToggle.style.display = 'none'
  dom.latestSessionTimelineTitle.style.display = 'none'
  dom.latestSessionTimelineContainer.style.display = 'none'
  dom.latestSessionTimelineContainer.replaceChildren()
}

export function renderWorkflowNotice(dom: LatestSessionDom): void {
  dom.latestSessionMeta.textContent = t('workflow.notice.meta.ide')
  dom.latestSessionStatus.textContent = `• ${t('workflow.notice.status.ide')}`
  applyLatestSessionStatusStyles(dom.latestSessionStatus, 'pending')
  dom.latestSessionMessage.style.display = 'block'
  dom.latestSessionMessage.textContent = t('workflow.notice.message.ide')
  dom.latestSessionMessage.dataset.variant = 'system-info'
  dom.latestSessionMessage.style.color = '#9ed8ff'
  dom.latestSessionHint.textContent = t('workflow.notice.hint.ide')
  dom.latestSessionHint.style.display = 'block'
  dom.latestSessionHint.style.color = 'var(--inspecto-text-secondary)'
  dom.latestSessionError.textContent = ''
  dom.latestSessionError.style.display = 'none'
  resetRefreshButton(dom.latestSessionRefreshButton)
  hideTimeline(dom)
}

export function renderEmptyLatestSession(dom: LatestSessionDom): void {
  dom.latestSessionHint.textContent = ''
  dom.latestSessionHint.style.display = 'none'
  dom.latestSessionMessage.dataset.variant = 'default'
  dom.latestSessionMessage.style.color = 'var(--inspecto-text-secondary)'
  dom.latestSessionError.textContent = ''
  dom.latestSessionError.style.display = 'none'
  resetRefreshButton(dom.latestSessionRefreshButton)
  hideTimeline(dom)
}
