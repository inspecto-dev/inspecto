import { describe, expect, it } from 'vitest'
import type { Annotation } from '@inspecto-dev/types'
import { createAnnotationSessionStore } from '../src/server/session-store.js'

function createAnnotation(id: string, note: string): Annotation {
  return {
    id,
    note,
    intent: 'review',
    targets: [
      {
        id: `${id}-target`,
        label: `${id}.label`,
        location: {
          file: `/repo/${id}.tsx`,
          line: 1,
          column: 1,
        },
        rect: {
          x: 0,
          y: 0,
          width: 100,
          height: 32,
        },
      },
    ],
  }
}

describe('annotation session store', () => {
  it('creates pending sessions and returns newest sessions first', () => {
    let tick = 100
    let sequence = 1
    const store = createAnnotationSessionStore({
      now: () => tick++,
      createId: () => `session-${sequence++}`,
    })

    const first = store.createSession({
      instruction: 'Review the first batch',
      annotations: [createAnnotation('alpha', 'Alpha note')],
    })
    const second = store.createSession({
      instruction: 'Review the second batch',
      annotations: [createAnnotation('beta', 'Beta note')],
    })

    expect(first.status).toBe('pending')
    expect(second.status).toBe('pending')
    expect(store.listSessions().map(session => session.id)).toEqual(['session-2', 'session-1'])
  })

  it('filters sessions by status and promotes agent replies to in_progress', () => {
    let tick = 200
    let sequence = 1
    const store = createAnnotationSessionStore({
      now: () => tick++,
      createId: () => `session-${sequence++}`,
    })

    const pending = store.createSession({
      annotations: [createAnnotation('pending', 'Pending note')],
    })
    const resolved = store.createSession({
      annotations: [createAnnotation('resolved', 'Resolved note')],
    })

    store.updateStatus(resolved.id, 'resolved')
    const updatedPending = store.appendMessage(pending.id, {
      role: 'agent',
      text: 'I am looking into this now.',
    })

    expect(updatedPending?.status).toBe('in_progress')
    expect(store.listSessions({ status: 'resolved' }).map(session => session.id)).toEqual([
      resolved.id,
    ])
    expect(
      store.listSessions({ status: ['pending', 'in_progress'] }).map(session => session.id),
    ).toEqual([pending.id])
  })

  it('records lifecycle timestamps for acknowledged and resolved transitions', () => {
    let tick = 300
    let sequence = 1
    const store = createAnnotationSessionStore({
      now: () => tick++,
      createId: () => `session-${sequence++}`,
    })

    const session = store.createSession({
      annotations: [createAnnotation('gamma', 'Gamma note')],
    })

    const acknowledged = store.updateStatus(session.id, 'acknowledged')
    const resolved = store.updateStatus(session.id, 'resolved')

    expect(acknowledged?.acknowledgedAt).toBe(301)
    expect(resolved?.resolvedAt).toBe(302)
    expect(resolved?.updatedAt).toBe(302)
  })

  it('emits cloned snapshots for create, message, and status events', () => {
    let tick = 400
    let sequence = 1
    const store = createAnnotationSessionStore({
      now: () => tick++,
      createId: () => `session-${sequence++}`,
    })
    const events: string[] = []

    const unsubscribe = store.subscribe(event => {
      events.push(`${event.type}:${event.session.status}:${event.session.messages.length}`)
      if (event.session.messages[0]) {
        event.session.messages[0].text = 'mutated outside store'
      }
    })

    const session = store.createSession({
      annotations: [createAnnotation('delta', 'Delta note')],
    })
    store.appendMessage(session.id, {
      role: 'agent',
      text: 'Progress update',
    })
    store.updateStatus(session.id, 'resolved')
    unsubscribe()

    expect(events).toEqual([
      'session-created:pending:0',
      'session-message-appended:in_progress:1',
      'session-status-updated:resolved:1',
    ])
    expect(store.getSession(session.id)?.messages[0]?.text).toBe('Progress update')
  })

  it('claims the newest pending session and marks it acknowledged', async () => {
    let tick = 700
    let sequence = 1
    const store = createAnnotationSessionStore({
      now: () => tick++,
      createId: () => `session-${sequence++}`,
    })

    const first = store.createSession({
      annotations: [createAnnotation('eta', 'Eta note')],
    })
    const latest = store.createSession({
      annotations: [createAnnotation('theta', 'Theta note')],
    })

    await expect(store.claimNextSession()).resolves.toEqual({
      session: expect.objectContaining({
        id: latest.id,
        status: 'acknowledged',
        acknowledgedAt: 702,
      }),
      timedOut: false,
      matchedExisting: true,
    })
    expect(store.getSession(first.id)?.status).toBe('pending')
    expect(store.getSession(latest.id)?.status).toBe('acknowledged')
  })

  it('waits for new work and claims it once', async () => {
    let tick = 800
    let sequence = 1
    const store = createAnnotationSessionStore({
      now: () => tick++,
      createId: () => `session-${sequence++}`,
    })

    const firstClaim = store.claimNextSession({ timeoutMs: 1000 })
    const secondClaim = store.claimNextSession({ timeoutMs: 0 })
    const session = store.createSession({
      annotations: [createAnnotation('iota', 'Iota note')],
    })

    await expect(firstClaim).resolves.toEqual({
      session: expect.objectContaining({
        id: session.id,
        status: 'acknowledged',
      }),
      timedOut: false,
      matchedExisting: false,
      event: 'session-created',
    })
    await expect(secondClaim).resolves.toEqual({
      session: null,
      timedOut: true,
      matchedExisting: false,
    })
    expect(store.getSession(session.id)?.status).toBe('acknowledged')
  })
})
