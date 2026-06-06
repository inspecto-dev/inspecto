import {
  annotateSidebarButtonClass,
  annotateSidebarQueueMetaClass,
  annotateSidebarSectionClass,
  annotateSidebarTextClass,
  errorMsgClass,
} from '../../../shared/styles/index.js'
import { t } from '../../../shared/i18n.js'
import { createSidebarButton } from './helpers.js'

export type AnnotateSidebarLatestSessionDom = {
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
}

export function createAnnotateSidebarLatestSessionDom(): AnnotateSidebarLatestSessionDom {
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

  const latestSessionTimelineToggle = createSidebarButton(
    t('annotate.latestSession.expandTimeline'),
    annotateSidebarButtonClass,
  )
  latestSessionTimelineToggle.dataset.role = 'latest-session-timeline-toggle'
  latestSessionTimelineToggle.style.alignSelf = 'flex-start'
  latestSessionTimelineToggle.style.marginTop = '4px'
  latestSessionTimelineToggle.style.fontSize = '11px'

  const latestSessionTimelineTitle = document.createElement('div')
  latestSessionTimelineTitle.className = annotateSidebarQueueMetaClass
  latestSessionTimelineTitle.textContent = t('annotate.timeline.title')
  latestSessionTimelineTitle.style.display = 'none'
  latestSessionTimelineTitle.style.marginTop = '8px'

  const latestSessionTimelineContainer = document.createElement('div')
  latestSessionTimelineContainer.dataset.inspectoSessionTimeline = 'true'
  latestSessionTimelineContainer.style.display = 'none'
  latestSessionTimelineContainer.style.maxHeight = '220px'
  latestSessionTimelineContainer.style.overflow = 'auto'
  latestSessionTimelineContainer.style.marginTop = '4px'
  latestSessionTimelineContainer.style.padding = '6px 0 0'
  latestSessionTimelineContainer.style.borderTop = '1px solid rgba(255, 255, 255, 0.08)'

  const latestSessionError = document.createElement('div')
  latestSessionError.className = errorMsgClass
  latestSessionError.style.display = 'none'

  latestSessionSection.append(
    latestSessionHeader,
    latestSessionMessage,
    latestSessionHint,
    latestSessionTimelineToggle,
    latestSessionTimelineTitle,
    latestSessionTimelineContainer,
    latestSessionError,
  )

  return {
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
  }
}
