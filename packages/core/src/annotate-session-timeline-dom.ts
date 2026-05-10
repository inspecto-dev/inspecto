import type { SessionTimelineItem } from './annotate-session-timeline.js'
import { formatTimelineTimestamp } from './annotate-session-timeline.js'
import { t } from './i18n.js'

export function renderSessionTimeline(container: HTMLElement, items: SessionTimelineItem[]): void {
  container.replaceChildren()

  if (items.length === 0) {
    const empty = document.createElement('div')
    empty.dataset.inspectoSessionTimelineEmpty = 'true'
    empty.textContent = t('annotate.timeline.empty')
    empty.style.color = 'var(--inspecto-text-tertiary)'
    empty.style.fontSize = '11px'
    container.appendChild(empty)
    return
  }

  for (const item of items) {
    container.appendChild(createTimelineItemElement(item))
  }
}

function createTimelineItemElement(item: SessionTimelineItem): HTMLElement {
  const row = document.createElement('div')
  row.dataset.inspectoSessionTimelineItem = item.id
  row.dataset.kind = item.kind
  if (item.status) row.dataset.status = item.status
  row.style.display = 'grid'
  row.style.gridTemplateColumns = '42px 16px minmax(0, 1fr)'
  row.style.gap = '6px'
  row.style.alignItems = 'start'
  row.style.padding = '4px 0'

  const time = document.createElement('span')
  time.textContent = formatTimelineTimestamp(item.timestamp)
  time.style.color = 'var(--inspecto-text-tertiary)'
  time.style.fontSize = '10px'
  time.style.lineHeight = '1.5'

  const icon = document.createElement('span')
  icon.textContent = getTimelineIcon(item)
  icon.style.color = getTimelineColor(item)
  icon.style.fontSize = '11px'
  icon.style.lineHeight = '1.5'

  const text = document.createElement('div')
  text.textContent = getTimelineText(item)
  text.style.color = item.kind === 'system_message' ? '#9ed8ff' : 'var(--inspecto-text-secondary)'
  text.style.fontSize = '11px'
  text.style.lineHeight = '1.45'
  text.style.whiteSpace = 'pre-wrap'
  text.style.overflowWrap = 'anywhere'

  row.append(time, icon, text)
  return row
}

function getTimelineText(item: SessionTimelineItem): string {
  if (item.kind === 'agent_message') {
    return t('annotate.timeline.agentMessage', { text: item.text ?? '' })
  }
  if (item.kind === 'system_message') return item.text ?? ''
  return item.textKey ? t(item.textKey) : (item.text ?? '')
}

function getTimelineIcon(item: SessionTimelineItem): string {
  if (item.status === 'resolved') return '✓'
  if (item.status === 'dismissed') return '−'
  if (item.status === 'acknowledged' || item.kind === 'agent_message') return '◔'
  return '•'
}

function getTimelineColor(item: SessionTimelineItem): string {
  if (item.status === 'resolved') return '#5ad496'
  if (item.status === 'dismissed') return '#b0b8c6'
  if (item.status === 'acknowledged' || item.kind === 'agent_message') return '#73b2ff'
  if (item.kind === 'system_message') return '#9ed8ff'
  return 'var(--inspecto-text-tertiary)'
}
