import { describe, expect, it } from 'vitest'
import type { Annotation } from '@inspecto-dev/types'
import { createInspectoMcpAdapter } from '../src/server/mcp-adapter.js'
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
          height: 20,
        },
      },
    ],
  }
}

describe('inspecto mcp adapter', () => {
  it('lists the minimal MCP tools', () => {
    const store = createAnnotationSessionStore()
    const adapter = createInspectoMcpAdapter({ store })

    expect(adapter.listTools().map(tool => tool.name)).toEqual([
      'inspecto_get_session',
      'inspecto_claim_next',
      'inspecto_reply',
      'inspecto_resolve',
      'inspecto_dismiss',
    ])
  })

  it('returns a specific session by id', () => {
    const store = createAnnotationSessionStore()
    const session = store.createSession({
      annotations: [createAnnotation('alpha', 'Alpha note')],
    })
    const adapter = createInspectoMcpAdapter({ store })

    expect(adapter.getSession({ sessionId: session.id })).toEqual({
      success: true,
      session: expect.objectContaining({
        id: session.id,
        annotations: expect.arrayContaining([
          expect.objectContaining({
            note: 'Alpha note',
          }),
        ]),
      }),
    })
  })

  it('claims the next pending session for hands-free agents', async () => {
    let tick = 230
    let sequence = 1
    const store = createAnnotationSessionStore({
      now: () => tick++,
      createId: () => `session-${sequence++}`,
    })
    const older = store.createSession({
      annotations: [createAnnotation('alpha', 'Alpha note')],
    })
    const latest = store.createSession({
      annotations: [createAnnotation('beta', 'Beta note')],
    })
    const adapter = createInspectoMcpAdapter({ store })

    const result = await adapter.claimNext({ timeoutMs: 1000 })

    expect(result).toEqual({
      success: true,
      timedOut: false,
      matchedExisting: true,
      session: expect.objectContaining({
        id: latest.id,
        status: 'acknowledged',
      }),
    })
    expect(store.getSession(older.id)?.status).toBe('pending')
    expect(store.getSession(latest.id)?.status).toBe('acknowledged')
  })

  it('replies as agent and promotes pending sessions to in_progress', () => {
    let tick = 300
    let sequence = 1
    const store = createAnnotationSessionStore({
      now: () => tick++,
      createId: () => `session-${sequence++}`,
    })
    const session = store.createSession({
      annotations: [createAnnotation('alpha', 'Alpha note')],
    })
    const adapter = createInspectoMcpAdapter({ store })

    const result = adapter.reply({
      sessionId: session.id,
      text: 'I am investigating this now.',
    })

    expect(result.success).toBe(true)
    expect(result.session?.status).toBe('in_progress')
    expect(result.session?.messages[0]?.text).toBe('I am investigating this now.')
  })

  it('resolves sessions and optionally appends a final message', () => {
    let tick = 400
    let sequence = 1
    const store = createAnnotationSessionStore({
      now: () => tick++,
      createId: () => `session-${sequence++}`,
    })
    const session = store.createSession({
      annotations: [createAnnotation('alpha', 'Alpha note')],
    })
    const adapter = createInspectoMcpAdapter({ store })

    const result = adapter.resolve({
      sessionId: session.id,
      message: 'Implemented the fix and verified the flow.',
    })

    expect(result.success).toBe(true)
    expect(result.session?.status).toBe('resolved')
    expect(result.session?.resolvedAt).toBe(402)
    expect(result.session?.messages[0]?.text).toBe('Implemented the fix and verified the flow.')
  })

  it('dismisses sessions and optionally appends a final note', () => {
    let tick = 450
    let sequence = 1
    const store = createAnnotationSessionStore({
      now: () => tick++,
      createId: () => `session-${sequence++}`,
    })
    const session = store.createSession({
      annotations: [createAnnotation('alpha', 'Alpha note')],
    })
    const adapter = createInspectoMcpAdapter({ store })

    const result = adapter.dismiss({
      sessionId: session.id,
      message: 'Duplicate annotation batch; dismissing this one.',
    })

    expect(result.success).toBe(true)
    expect(result.session?.status).toBe('dismissed')
    expect(result.session?.messages[0]?.text).toBe(
      'Duplicate annotation batch; dismissing this one.',
    )
  })

  it('requires a resolve message until the agent has replied at least once', () => {
    const store = createAnnotationSessionStore()
    const session = store.createSession({
      annotations: [createAnnotation('alpha', 'Alpha note')],
    })
    const adapter = createInspectoMcpAdapter({ store })

    expect(
      adapter.resolve({
        sessionId: session.id,
      }),
    ).toEqual({
      success: false,
      error: 'Resolve message is required until an agent reply is recorded.',
    })

    adapter.reply({
      sessionId: session.id,
      text: 'I am working on it.',
    })

    const resolved = adapter.resolve({
      sessionId: session.id,
    })

    expect(resolved.success).toBe(true)
    expect(resolved.session?.status).toBe('resolved')
  })

  it('returns stable validation errors for missing ids, text, and sessions', () => {
    const store = createAnnotationSessionStore()
    const adapter = createInspectoMcpAdapter({ store })

    expect(adapter.getSession({ sessionId: '' })).toEqual({
      success: false,
      error: 'Session id is required.',
    })
    expect(adapter.getSession({ sessionId: 'missing' })).toEqual({
      success: false,
      error: 'Session not found.',
    })
    expect(adapter.reply({ sessionId: '', text: 'hello' })).toEqual({
      success: false,
      error: 'Session id is required.',
    })
    expect(adapter.reply({ sessionId: 'missing', text: '' })).toEqual({
      success: false,
      error: 'Reply text is required.',
    })
    expect(adapter.reply({ sessionId: 'missing', text: 'hello' })).toEqual({
      success: false,
      error: 'Session not found.',
    })
    expect(adapter.resolve({ sessionId: '' })).toEqual({
      success: false,
      error: 'Session id is required.',
    })
    expect(adapter.resolve({ sessionId: 'missing' })).toEqual({
      success: false,
      error: 'Session not found.',
    })
    expect(adapter.dismiss({ sessionId: '' })).toEqual({
      success: false,
      error: 'Session id is required.',
    })
    expect(adapter.dismiss({ sessionId: 'missing' })).toEqual({
      success: false,
      error: 'Session not found.',
    })
  })
})
