import type { AnnotationThreadRole } from '@inspecto-dev/types'
import { t } from '../../../shared/i18n.js'

export type LatestSessionMessageKind = 'agent' | 'system-info'

export function classifySessionMessage(input: {
  role: AnnotationThreadRole
  text: string
}): LatestSessionMessageKind {
  if (input.role === 'agent') return 'agent'
  return 'system-info'
}

export function getLatestSessionFallbackMessage(status: string, hasDetail: boolean): string {
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

export function getLatestSessionStatusLabel(status: string): string {
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

export function getLatestSessionHint(status: string): string {
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

export function getLatestSessionErrorMessage(error: string | undefined): string {
  if (!error) return ''
  if (error === 'Live session updates disconnected. You can refresh to reconnect.') {
    return t('annotate.latestSession.error.disconnected')
  }
  return error
}

export function applyLatestSessionStatusStyles(element: HTMLElement, status: string): void {
  element.dataset.status = status
  if (status === 'resolved') {
    element.style.background = 'rgba(18, 183, 106, 0.12)'
    element.style.borderColor = 'rgba(18, 183, 106, 0.25)'
    element.style.color = '#5ad496'
    return
  }
  if (status === 'in_progress') {
    element.style.background = 'rgba(47, 128, 237, 0.12)'
    element.style.borderColor = 'rgba(47, 128, 237, 0.25)'
    element.style.color = '#73b2ff'
    return
  }
  if (status === 'dismissed') {
    element.style.background = 'rgba(152, 162, 179, 0.12)'
    element.style.borderColor = 'rgba(152, 162, 179, 0.25)'
    element.style.color = '#b0b8c6'
    return
  }

  element.style.background = 'rgba(255, 255, 255, 0.06)'
  element.style.borderColor = 'rgba(255, 255, 255, 0.1)'
  element.style.color = 'var(--inspecto-text-secondary)'
}
