import type {
  AnnotationSessionStatus,
  AnnotationThreadRole,
  AnnotationWorkSession,
} from '@inspecto-dev/types'

export type SessionTimelineItemKind = 'status' | 'agent_message' | 'system_message'

export interface SessionTimelineItem {
  id: string
  kind: SessionTimelineItemKind
  status?: AnnotationSessionStatus
  role?: AnnotationThreadRole
  text?: string
  textKey?: string
  timestamp?: number
}

const TIMELINE_SORT_RANK: Record<string, number> = {
  'status:pending': 0,
  'status:acknowledged': 1,
  agent_message: 2,
  system_message: 2,
  'status:resolved': 3,
  'status:dismissed': 3,
}

export function buildSessionTimelineItems(session: AnnotationWorkSession): SessionTimelineItem[] {
  const items: SessionTimelineItem[] = [
    {
      id: `${session.id}:created`,
      kind: 'status',
      status: 'pending',
      textKey: 'annotate.timeline.created',
      timestamp: session.createdAt,
    },
  ]

  if (session.acknowledgedAt !== undefined) {
    items.push({
      id: `${session.id}:acknowledged`,
      kind: 'status',
      status: 'acknowledged',
      textKey: 'annotate.timeline.claimed',
      timestamp: session.acknowledgedAt,
    })
  }

  for (const message of session.messages) {
    if (message.role !== 'agent' && message.role !== 'system') continue
    items.push({
      id: `message:${message.id}`,
      kind: message.role === 'agent' ? 'agent_message' : 'system_message',
      role: message.role,
      text: message.text,
      timestamp: message.createdAt,
    })
  }

  if (session.status === 'resolved') {
    items.push({
      id: `${session.id}:resolved`,
      kind: 'status',
      status: 'resolved',
      textKey: 'annotate.timeline.resolved',
      timestamp: session.resolvedAt ?? session.updatedAt,
    })
  }

  if (session.status === 'dismissed') {
    items.push({
      id: `${session.id}:dismissed`,
      kind: 'status',
      status: 'dismissed',
      textKey: 'annotate.timeline.dismissed',
      timestamp: session.updatedAt,
    })
  }

  return items.sort((left, right) => {
    const timestampDelta = (left.timestamp ?? 0) - (right.timestamp ?? 0)
    if (timestampDelta !== 0) return timestampDelta
    const rankDelta = getTimelineSortRank(left) - getTimelineSortRank(right)
    if (rankDelta !== 0) return rankDelta
    return left.id.localeCompare(right.id)
  })
}

function getTimelineSortRank(item: SessionTimelineItem): number {
  if (item.kind === 'status') return TIMELINE_SORT_RANK[`status:${item.status}`] ?? 99
  return TIMELINE_SORT_RANK[item.kind] ?? 99
}

export function formatTimelineTimestamp(
  timestamp: number | undefined,
  locale = typeof navigator === 'undefined' ? 'en-US' : navigator.language,
): string {
  if (timestamp === undefined) return ''
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(timestamp))
  } catch {
    return ''
  }
}
