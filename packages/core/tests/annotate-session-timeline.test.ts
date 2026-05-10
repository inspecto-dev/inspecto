import { describe, expect, it } from 'vitest'
import type { AnnotationWorkSession } from '@inspecto-dev/types'
import {
  buildSessionTimelineItems,
  formatTimelineTimestamp,
} from '../src/annotate-session-timeline.js'
import { renderSessionTimeline } from '../src/annotate-session-timeline-dom.js'
import { configureI18n } from '../src/i18n.js'

function makeSession(input: Partial<AnnotationWorkSession> = {}): AnnotationWorkSession {
  return {
    id: 'session-1',
    instruction: 'Fix this button',
    annotations: [],
    status: 'pending',
    messages: [],
    createdAt: 100,
    updatedAt: 100,
    ...input,
  }
}

describe('buildSessionTimelineItems', () => {
  it('creates a pending timeline from session metadata', () => {
    const items = buildSessionTimelineItems(makeSession())

    expect(items).toEqual([
      {
        id: 'session-1:created',
        kind: 'status',
        status: 'pending',
        textKey: 'annotate.timeline.created',
        timestamp: 100,
      },
    ])
  })

  it('adds claimed and resolved lifecycle items from timestamps', () => {
    const items = buildSessionTimelineItems(
      makeSession({
        status: 'resolved',
        updatedAt: 300,
        acknowledgedAt: 150,
        resolvedAt: 300,
      }),
    )

    expect(items.map(item => [item.id, item.status, item.timestamp])).toEqual([
      ['session-1:created', 'pending', 100],
      ['session-1:acknowledged', 'acknowledged', 150],
      ['session-1:resolved', 'resolved', 300],
    ])
  })

  it('includes every agent and system message in chronological order', () => {
    const items = buildSessionTimelineItems(
      makeSession({
        status: 'in_progress',
        acknowledgedAt: 110,
        updatedAt: 140,
        messages: [
          { id: 'm2', role: 'system', text: 'Task acknowledged.', createdAt: 120 },
          { id: 'm1', role: 'agent', text: 'Working on it now.', createdAt: 115 },
        ],
      }),
    )

    expect(items.map(item => [item.id, item.kind, item.text])).toEqual([
      ['session-1:created', 'status', undefined],
      ['session-1:acknowledged', 'status', undefined],
      ['message:m1', 'agent_message', 'Working on it now.'],
      ['message:m2', 'system_message', 'Task acknowledged.'],
    ])
  })

  it('keeps lifecycle items before messages when timestamps are equal', () => {
    const items = buildSessionTimelineItems(
      makeSession({
        status: 'in_progress',
        acknowledgedAt: 100,
        updatedAt: 100,
        messages: [{ id: 'm1', role: 'agent', text: 'Working immediately.', createdAt: 100 }],
      }),
    )

    expect(items.map(item => item.id)).toEqual([
      'session-1:created',
      'session-1:acknowledged',
      'message:m1',
    ])
  })

  it('uses updatedAt for dismissed lifecycle item', () => {
    const items = buildSessionTimelineItems(
      makeSession({
        status: 'dismissed',
        updatedAt: 250,
      }),
    )

    expect(items.at(-1)).toMatchObject({
      id: 'session-1:dismissed',
      status: 'dismissed',
      timestamp: 250,
    })
  })
})

describe('formatTimelineTimestamp', () => {
  it('formats numeric timestamps as HH:mm', () => {
    const date = new Date('2026-05-10T09:08:00.000Z')
    expect(formatTimelineTimestamp(date.getTime(), 'en-US')).toMatch(/^\d{2}:\d{2}$/)
  })

  it('returns empty string for missing timestamps', () => {
    expect(formatTimelineTimestamp(undefined)).toBe('')
  })
})

describe('renderSessionTimeline', () => {
  it('renders message and status items into a container', () => {
    const container = document.createElement('div')

    renderSessionTimeline(container, [
      {
        id: 'session-1:created',
        kind: 'status',
        status: 'pending',
        textKey: 'annotate.timeline.created',
        timestamp: 100,
      },
      {
        id: 'message:m1',
        kind: 'agent_message',
        role: 'agent',
        text: 'Working on it now.',
        timestamp: 120,
      },
    ])

    expect(container.textContent).toContain('Created from annotate mode')
    expect(container.textContent).toContain('Agent: Working on it now.')
    expect(container.querySelectorAll('[data-inspecto-session-timeline-item]')).toHaveLength(2)
  })

  it('localizes the agent message prefix', () => {
    configureI18n({ locale: 'zh-CN' })
    const container = document.createElement('div')

    renderSessionTimeline(container, [
      {
        id: 'message:m1',
        kind: 'agent_message',
        role: 'agent',
        text: 'Working on it now.',
        timestamp: 120,
      },
    ])

    expect(container.textContent).toContain('助手：Working on it now.')
    expect(container.textContent).not.toContain('Agent: Working on it now.')
    configureI18n({ locale: 'en' })
  })
})
