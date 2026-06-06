import type { AnnotationWorkSession } from '@inspecto-dev/types'
import { t } from '../../../shared/i18n.js'
import { getLatestSessionFallbackMessage, type LatestSessionMessageKind } from './latest-session.js'

export type LatestSessionMessageRenderInput = {
  isLoading: boolean
  shouldShowTimeline: boolean
  latestStatus: AnnotationWorkSession['status']
  hasDetail: boolean
  lastAgentOrSystemMessage: string
  latestMessageVariant: LatestSessionMessageKind | null
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

export function renderLatestSessionMessage(
  message: HTMLElement,
  params: LatestSessionMessageRenderInput,
): void {
  resetLatestSessionMessage(message)

  const fallbackMsg = getLatestSessionFallbackMessage(params.latestStatus, params.hasDetail)
  const hasMessage =
    params.isLoading ||
    (!params.shouldShowTimeline && (params.lastAgentOrSystemMessage || fallbackMsg))

  if (hasMessage) {
    message.textContent = params.isLoading
      ? t('annotate.latestSession.loading')
      : params.lastAgentOrSystemMessage || fallbackMsg
    if (params.isLoading) {
      message.style.display = 'block'
    } else {
      message.dataset.inspectoLatestSessionPreview = 'true'
      message.style.display = 'block'
      message.style.overflow = 'hidden'
      message.style.textOverflow = 'ellipsis'
      message.style.maxHeight = '42px'
      message.style.setProperty('-webkit-line-clamp', '2')
      message.style.setProperty('-webkit-box-orient', 'vertical')
    }
  }

  message.dataset.variant = params.latestMessageVariant ?? 'default'
  message.style.color =
    params.latestMessageVariant === 'system-info' ? '#9ed8ff' : 'var(--inspecto-text-secondary)'
}
