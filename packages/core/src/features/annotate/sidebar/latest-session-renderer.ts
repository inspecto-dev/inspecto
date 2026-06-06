import type { AnnotationWorkSession, AnnotationWorkSessionSummary } from '@inspecto-dev/types'
import {
  applyLatestSessionStatusStyles,
  classifySessionMessage,
  getLatestSessionErrorMessage,
  getLatestSessionFallbackMessage,
  getLatestSessionHint,
  getLatestSessionStatusLabel,
} from './latest-session.js'
import { renderSessionTimeline } from './session-timeline-dom.js'
import { t } from '../../../shared/i18n.js'
import { buildSessionTimelineItems } from '../session/timeline.js'

export type LatestSessionDom = {
  latestSessionSection: HTMLElement
  latestSessionTitle: HTMLElement
  latestSessionMeta: HTMLElement
  latestSessionStatus: HTMLElement
  latestSessionMessage: HTMLElement
  latestSessionHint: HTMLElement
  latestSessionRefreshButton: HTMLButtonElement
  latestSessionTimelineToggle: HTMLElement
  latestSessionTimelineTitle: HTMLElement
  latestSessionTimelineContainer: HTMLElement
  latestSessionError: HTMLElement
}

export type AnnotateWorkflowNotice = {
  kind: 'ide-dispatch'
  workflowId: string
  workflowLabel: string
}

export type LatestSessionRenderState = {
  latestSession: AnnotationWorkSession | null
  latestSessionSummary: AnnotationWorkSessionSummary | null
  workflowNotice: AnnotateWorkflowNotice | null
  isTimelineExpanded: boolean
  lastRevealedSessionId: string
  isLoading: boolean
  error: string | undefined
}

export type LatestSessionRenderResult = {
  latestSessionId: string
  isNewLatestSession: boolean
  isTimelineExpanded: boolean
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

function resetLatestSessionMessage(message: HTMLElement): void {
  message.style.display = 'none'
  message.textContent = ''
  delete message.dataset.inspectoLatestSessionPreview
  message.style.overflow = ''
  message.style.textOverflow = ''
  message.style.maxHeight = ''
  message.style.setProperty('-webkit-line-clamp', '')
  message.style.setProperty('-webkit-box-orient', '')
}

function renderWorkflowNotice(dom: LatestSessionDom): void {
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

function renderEmptyLatestSession(dom: LatestSessionDom): void {
  dom.latestSessionHint.textContent = ''
  dom.latestSessionHint.style.display = 'none'
  dom.latestSessionMessage.dataset.variant = 'default'
  dom.latestSessionMessage.style.color = 'var(--inspecto-text-secondary)'
  dom.latestSessionError.textContent = ''
  dom.latestSessionError.style.display = 'none'
  resetRefreshButton(dom.latestSessionRefreshButton)
  hideTimeline(dom)
}

function renderSessionMessage(
  dom: LatestSessionDom,
  params: {
    isLoading: boolean
    shouldShowTimeline: boolean
    latestStatus: AnnotationWorkSession['status']
    hasDetail: boolean
    lastAgentOrSystemMessage: string
    latestMessageVariant: string | null
  },
): void {
  resetLatestSessionMessage(dom.latestSessionMessage)

  const fallbackMsg = getLatestSessionFallbackMessage(params.latestStatus, params.hasDetail)
  const hasMessage =
    params.isLoading ||
    (!params.shouldShowTimeline && (params.lastAgentOrSystemMessage || fallbackMsg))

  if (hasMessage) {
    dom.latestSessionMessage.textContent = params.isLoading
      ? t('annotate.latestSession.loading')
      : params.lastAgentOrSystemMessage || fallbackMsg
    if (params.isLoading) {
      dom.latestSessionMessage.style.display = 'block'
    } else {
      dom.latestSessionMessage.dataset.inspectoLatestSessionPreview = 'true'
      dom.latestSessionMessage.style.display = 'block'
      dom.latestSessionMessage.style.overflow = 'hidden'
      dom.latestSessionMessage.style.textOverflow = 'ellipsis'
      dom.latestSessionMessage.style.maxHeight = '42px'
      dom.latestSessionMessage.style.setProperty('-webkit-line-clamp', '2')
      dom.latestSessionMessage.style.setProperty('-webkit-box-orient', 'vertical')
    }
  }

  dom.latestSessionMessage.dataset.variant = params.latestMessageVariant ?? 'default'
  dom.latestSessionMessage.style.color =
    params.latestMessageVariant === 'system-info' ? '#9ed8ff' : 'var(--inspecto-text-secondary)'
}

function renderSessionTimelineControls(
  dom: LatestSessionDom,
  latestSession: AnnotationWorkSession | null,
  isTimelineExpanded: boolean,
): void {
  const canShowTimeline = Boolean(latestSession)
  const shouldShowTimeline = canShowTimeline && isTimelineExpanded

  dom.latestSessionTimelineToggle.style.display = canShowTimeline ? '' : 'none'
  dom.latestSessionTimelineToggle.textContent = isTimelineExpanded
    ? t('annotate.latestSession.collapseTimeline')
    : t('annotate.latestSession.expandTimeline')
  dom.latestSessionTimelineToggle.setAttribute('aria-expanded', String(isTimelineExpanded))

  dom.latestSessionTimelineTitle.style.display = shouldShowTimeline ? 'block' : 'none'
  dom.latestSessionTimelineContainer.style.display = shouldShowTimeline ? 'block' : 'none'
  if (latestSession && shouldShowTimeline) {
    renderSessionTimeline(
      dom.latestSessionTimelineContainer,
      buildSessionTimelineItems(latestSession),
    )
  } else {
    dom.latestSessionTimelineContainer.replaceChildren()
  }
}

function renderSessionRefreshButton(
  dom: LatestSessionDom,
  params: {
    showReconnectAction: boolean
    isLoading: boolean
  },
): void {
  dom.latestSessionRefreshButton.textContent = params.showReconnectAction
    ? t('annotate.latestSession.reconnect')
    : '↻'
  dom.latestSessionRefreshButton.style.display =
    params.showReconnectAction || params.isLoading ? '' : 'none'
  dom.latestSessionRefreshButton.style.minWidth = params.showReconnectAction ? 'auto' : ''
  dom.latestSessionRefreshButton.style.padding = params.showReconnectAction ? '6px 10px' : ''
  dom.latestSessionRefreshButton.style.fontSize = params.showReconnectAction ? '11px' : '12px'
}

function renderLoadedLatestSession(
  dom: LatestSessionDom,
  state: LatestSessionRenderState,
  latestSession: AnnotationWorkSession | null,
  latestSessionSummary: AnnotationWorkSessionSummary | null,
): LatestSessionRenderResult {
  const latestStatus = latestSession?.status ?? latestSessionSummary?.status ?? 'pending'
  const latestSessionId = latestSession?.id ?? latestSessionSummary?.id ?? ''
  const isNewLatestSession = Boolean(
    latestSessionId && latestSessionId !== state.lastRevealedSessionId,
  )
  const isTimelineExpanded = isNewLatestSession ? false : state.isTimelineExpanded
  const shouldShowTimeline = Boolean(latestSession) && isTimelineExpanded

  dom.latestSessionMeta.textContent = latestSession
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

  dom.latestSessionStatus.textContent = getLatestSessionStatusLabel(latestStatus)
  applyLatestSessionStatusStyles(dom.latestSessionStatus, latestStatus)

  renderSessionMessage(dom, {
    isLoading: Boolean(state.isLoading),
    shouldShowTimeline,
    latestStatus,
    hasDetail: Boolean(latestSession),
    lastAgentOrSystemMessage,
    latestMessageVariant: latestMessageKind,
  })

  const latestSessionHintText = state.isLoading
    ? ''
    : shouldShowTimeline && latestStatus !== 'resolved'
      ? ''
      : getLatestSessionHint(latestStatus)
  const latestSessionErrorText = getLatestSessionErrorMessage(state.error)
  const showReconnectAction = Boolean(latestSessionErrorText)
  dom.latestSessionHint.textContent = latestSessionHintText
  dom.latestSessionHint.style.display =
    latestSessionHintText && !showReconnectAction ? 'block' : 'none'
  dom.latestSessionHint.style.color =
    latestStatus === 'resolved' ? '#b7f5cd' : 'var(--inspecto-text-secondary)'
  dom.latestSessionError.textContent = latestSessionErrorText
  dom.latestSessionError.style.display = latestSessionErrorText ? 'block' : 'none'

  renderSessionRefreshButton(dom, {
    showReconnectAction,
    isLoading: Boolean(state.isLoading),
  })
  renderSessionTimelineControls(dom, latestSession, isTimelineExpanded)

  return {
    latestSessionId,
    isNewLatestSession,
    isTimelineExpanded,
  }
}

export function renderLatestSession(
  dom: LatestSessionDom,
  state: LatestSessionRenderState,
): LatestSessionRenderResult {
  const latestSession = state.latestSession
  const latestSessionSummary = state.latestSessionSummary
  const workflowNotice = state.workflowNotice
  dom.latestSessionSection.style.display =
    latestSession || latestSessionSummary || workflowNotice ? '' : 'none'
  dom.latestSessionRefreshButton.disabled = Boolean(state.isLoading)
  dom.latestSessionTitle.textContent = workflowNotice
    ? t('workflow.notice.title')
    : t('annotate.latestSession.title')

  if (workflowNotice && !latestSession && !latestSessionSummary) {
    renderWorkflowNotice(dom)
    return { latestSessionId: '', isNewLatestSession: false, isTimelineExpanded: false }
  }

  if (latestSession || latestSessionSummary) {
    return renderLoadedLatestSession(dom, state, latestSession, latestSessionSummary)
  }

  renderEmptyLatestSession(dom)
  return { latestSessionId: '', isNewLatestSession: false, isTimelineExpanded: false }
}
