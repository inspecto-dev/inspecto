import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  INSPECTO_API_PATHS,
  type SendAnnotationsToAiRequest,
  type SendToAiRequest,
} from '@inspecto-dev/types'

vi.mock('node:child_process', () => ({
  execSync: vi.fn(() => `${process.cwd()}\n`),
  exec: vi.fn((cmd, options, callback) => {
    if (typeof options === 'function') {
      callback = options
    }
    if (callback) {
      if (cmd.includes('branch')) {
        callback(null, { stdout: 'main\n', stderr: '' })
      } else if (cmd.includes('status')) {
        callback(null, { stdout: ' M file.ts\n?? new.ts\n', stderr: '' })
      } else {
        callback(null, { stdout: `${process.cwd()}\n`, stderr: '' })
      }
    }
    return {}
  }),
  execFileSync: vi.fn(),
  spawn: vi.fn(() => ({
    once: vi.fn(),
    unref: vi.fn(),
  })),
}))

vi.mock('../src/config.js', () => ({
  loadUserConfigSync: vi.fn(() => ({
    ide: 'vscode',
    'prompt.autoSend': false,
  })),
  loadPromptsConfig: vi.fn(async () => []),
  resolveProviderMode: vi.fn(() => 'cli'),
  extractToolOverrides: vi.fn(() => ({})),
  watchConfig: vi.fn(),
  unwatchConfig: vi.fn(),
  resolveTargetTool: vi.fn(() => 'codex'),
  getGlobalLogLevel: vi.fn(() => 'silent'),
  resolveIntents: vi.fn(() => []),
  resolveWorkflowSlots: vi.fn(() => []),
}))

describe('annotation batch dispatch', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    const { stopServer } = await import('../src/server/index.js')
    stopServer()
  })

  it('builds a minimal prompt from multiple single-target annotations', async () => {
    const { buildAnnotationBatchPrompt } = await import('../src/server/annotation-dispatch.js')

    const prompt = buildAnnotationBatchPrompt({
      instruction: '',
      annotations: [
        {
          index: 1,
          note: 'Align the form spacing.',
          intent: 'fix',
          targets: [
            {
              file: '/repo/Form.tsx',
              line: 10,
              column: 2,
              label: 'input.email',
              selector: '#email',
            },
          ],
        },
        {
          index: 2,
          note: 'Check if these cards should share a layout rule.',
          intent: 'review',
          targets: [
            {
              file: '/repo/Card.tsx',
              line: 12,
              column: 4,
              label: 'div.card',
            },
          ],
        },
      ],
    })

    expect(prompt).toContain('Selected elements:')
    expect(prompt).toContain(
      '- input.email\nfile=/repo/Form.tsx:10:2\nnote=Align the form spacing.',
    )
    expect(prompt).toContain(
      '- div.card\nfile=/repo/Card.tsx:12:4\nnote=Check if these cards should share a layout rule.',
    )
    expect(prompt).not.toContain('Response mode:')
    expect(prompt).not.toContain('Annotations:')
    expect(prompt).not.toContain('Intent: fix')
    expect(prompt).not.toContain('selector=#email')
  })

  it('uses configRoot rather than projectRoot when resolving dispatch settings', async () => {
    const config = await import('../src/config.js')
    const { resolvePromptDispatchRuntime } = await import('../src/server/dispatch-runtime.js')

    resolvePromptDispatchRuntime({
      cwd: '/repo/apps/web/src',
      projectRoot: '/repo/apps/web',
      configRoot: '/repo',
      ideInfo: { ide: 'vscode', scheme: 'vscode', workspaceRoot: '/repo' },
    } as any)

    expect(config.loadUserConfigSync).toHaveBeenCalledWith(false, '/repo/apps/web/src', '/repo')
  })

  it('lists all targets when a single annotation spans multiple elements', async () => {
    const { buildAnnotationBatchPrompt } = await import('../src/server/annotation-dispatch.js')

    const prompt = buildAnnotationBatchPrompt({
      instruction: '',
      annotations: [
        {
          index: 1,
          note: 'Align the form spacing.',
          intent: 'fix',
          targets: [
            {
              file: '/repo/Form.tsx',
              line: 10,
              column: 2,
              label: 'input.email',
              selector: '#email',
            },
            {
              file: '/repo/Form.tsx',
              line: 18,
              column: 2,
              label: 'button.submit',
            },
          ],
        },
      ],
    })

    expect(prompt).toContain('Selected elements:')
    expect(prompt).toContain(
      '- input.email\nfile=/repo/Form.tsx:10:2\nnote=Align the form spacing.',
    )
    expect(prompt).toContain(
      '- button.submit\nfile=/repo/Form.tsx:18:2\nnote=Align the form spacing.',
    )
    expect(prompt).not.toContain('You are reviewing a UI with multiple related annotations.')
    expect(prompt).not.toContain('Targets:')
  })

  it('keeps single-annotation prompts minimal', async () => {
    const { buildAnnotationBatchPrompt } = await import('../src/server/annotation-dispatch.js')

    const prompt = buildAnnotationBatchPrompt({
      instruction: '',
      annotations: [
        {
          index: 1,
          note: 'Review the button treatment.',
          intent: 'review',
          targets: [
            {
              file: '/repo/Button.tsx',
              line: 12,
              column: 3,
              label: 'button.primary',
            },
          ],
        },
      ],
    })

    expect(prompt).toContain('Selected elements:')
    expect(prompt).toContain(
      '- button.primary\nfile=/repo/Button.tsx:12:3\nnote=Review the button treatment.',
    )
    expect(prompt).not.toContain('Response mode:')
    expect(prompt).not.toContain('For each annotation, include:')
  })

  it('rejects annotation targets outside the project root', async () => {
    const { dispatchAnnotationsToAi } = await import('../src/server/annotation-dispatch.js')
    const { serverState } = await import('../src/server/index.js')

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const result = await dispatchAnnotationsToAi(
      {
        annotations: [
          {
            note: 'Outside path',
            intent: 'ask',
            targets: [
              {
                location: { file: '/tmp/outside.tsx', line: 1, column: 1 },
              },
            ],
          },
        ],
      },
      serverState,
    )

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('FORBIDDEN_PATH')
    expect(result.error).toContain('outside of project workspace')
    expect(result.session).toBeUndefined()
  })

  it('prepends the provided instruction to minimal prompts', async () => {
    const { buildAnnotationBatchPrompt } = await import('../src/server/annotation-dispatch.js')

    const prompt = buildAnnotationBatchPrompt({
      instruction: 'Review these notes with a layout-consistency lens.',
      annotations: [
        {
          index: 1,
          note: 'Align the form spacing.',
          intent: 'fix',
          targets: [
            {
              file: '/repo/Form.tsx',
              line: 10,
              column: 2,
              label: 'input.email',
            },
          ],
        },
        {
          index: 2,
          note: 'Check the helper copy rhythm.',
          intent: 'review',
          targets: [
            {
              file: '/repo/Form.tsx',
              line: 18,
              column: 2,
              label: 'p.helper',
            },
          ],
        },
      ],
    })

    expect(prompt.startsWith('Review these notes with a layout-consistency lens.')).toBe(true)
    expect(prompt).toContain('\n\nSelected elements:\n')
  })

  it('preserves runtime context during annotation normalization and prompt assembly', async () => {
    const { normalizeAnnotationBatch } = await import('../src/server/annotation-dispatch.js')
    const { buildAnnotationBatchPrompt } = await import('../src/server/annotation-dispatch.js')

    const batch = normalizeAnnotationBatch({
      instruction: '',
      annotations: [
        {
          note: 'Review the button treatment.',
          intent: 'review',
          targets: [{ location: { file: '/repo/Button.tsx', line: 12, column: 3 } }],
        },
      ],
      runtimeContext: {
        summary: {
          runtimeErrorCount: 1,
          failedRequestCount: 0,
          includedRecordIds: ['runtime-error::button-style'],
        },
        records: [
          {
            id: 'runtime-error::button-style',
            kind: 'runtime-error',
            timestamp: 1712232000000,
            message: 'Button style token was undefined',
            stack: 'Error: Button style token was undefined\n    at Button (/repo/Button.tsx:12:3)',
            occurrenceCount: 2,
            relevanceScore: 0.8,
            relevanceLevel: 'high',
            relevanceReasons: ['stack references target file'],
          },
        ],
      },
    })

    expect(batch.runtimeContext).toEqual({
      summary: {
        runtimeErrorCount: 1,
        failedRequestCount: 0,
        includedRecordIds: ['runtime-error::button-style'],
      },
      records: [
        {
          id: 'runtime-error::button-style',
          kind: 'runtime-error',
          timestamp: 1712232000000,
          message: 'Button style token was undefined',
          stack: 'Error: Button style token was undefined\n    at Button (/repo/Button.tsx:12:3)',
          occurrenceCount: 2,
          relevanceScore: 0.8,
          relevanceLevel: 'high',
          relevanceReasons: ['stack references target file'],
        },
      ],
    })

    const prompt = buildAnnotationBatchPrompt(batch)
    expect(prompt).toContain('Relevant runtime context:')
    expect(prompt).toContain('[runtime-error] Button style token was undefined')
    expect(prompt).toContain('relevance=high (stack references target file)')
    expect(prompt).toContain('occurrences=2')
  })

  it('appends CSS context to annotation prompts when provided', async () => {
    const { buildAnnotationBatchPrompt } = await import('../src/server/annotation-dispatch.js')

    const prompt = buildAnnotationBatchPrompt({
      instruction: 'Review the button styling.',
      annotations: [
        {
          index: 1,
          note: 'Review the button treatment.',
          intent: 'review',
          targets: [{ file: '/repo/Button.tsx', line: 12, column: 3, label: 'button.primary' }],
        },
      ],
      cssContextPrompt:
        'Relevant CSS context:\n- button.primary\n  file=/repo/Button.tsx:12:3\n  computed: display=flex',
    })

    expect(prompt).toContain('Review the button styling.')
    expect(prompt).toContain('Selected elements:')
    expect(prompt).toContain(
      '- button.primary\nfile=/repo/Button.tsx:12:3\nnote=Review the button treatment.',
    )
    expect(prompt).toContain('Relevant CSS context:')
    expect(prompt).toContain(
      '- button.primary\n  file=/repo/Button.tsx:12:3\n  computed: display=flex',
    )
    expect(prompt).not.toContain('You are reviewing a UI with multiple related annotations.')
    expect(prompt).not.toContain('Response mode:')
    expect(prompt).not.toContain('selector=')
  })

  it('rejects empty annotation batches as invalid requests', async () => {
    const { dispatchAnnotationsToAi } = await import('../src/server/annotation-dispatch.js')
    const { serverState } = await import('../src/server/index.js')

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const result = await dispatchAnnotationsToAi(
      {
        annotations: [],
      },
      serverState,
    )

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('INVALID_REQUEST')
    expect(result.error).toContain('At least one annotation is required.')
    expect(result.session).toBeUndefined()
  })

  it('creates a pending session while preserving the existing dispatch fallback', async () => {
    const { dispatchAnnotationsToAi } = await import('../src/server/annotation-dispatch.js')
    const { serverState } = await import('../src/server/index.js')
    const { annotationSessionStore } = await import('../src/server/session-store.js')

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const file = `${process.cwd()}/packages/plugin/src/index.ts`
    const result = await dispatchAnnotationsToAi(
      {
        instruction: 'Review this batch with a stability lens.',
        annotations: [
          {
            note: 'Review the plugin bootstrap flow.',
            intent: 'review',
            targets: [
              {
                location: { file, line: 1, column: 1 },
                label: 'InspectoPlugin',
                selector: 'module',
              },
            ],
          },
        ],
      },
      serverState,
    )

    expect(result.success).toBe(true)
    expect(result.session?.id).toBeTruthy()
    expect(result.session?.status).toBe('pending')
    expect(result.fallbackPayload?.prompt).toContain('Review this batch with a stability lens.')
    expect(annotationSessionStore.listSessions()).toHaveLength(1)
    expect(annotationSessionStore.listSessions()[0]?.instruction).toBe(
      'Review this batch with a stability lens.',
    )
    expect(annotationSessionStore.listSessions()[0]?.annotations[0]?.targets[0]?.selector).toBe(
      'module',
    )
  })

  it('serves the batch dispatch route through the server handler', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')
    const { annotationSessionStore } = await import('../src/server/session-store.js')
    const { execFileSync } = await import('node:child_process')
    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const file = `${process.cwd()}/packages/plugin/src/index.ts`
    const req: SendAnnotationsToAiRequest = {
      annotations: [
        {
          note: 'Review the plugin bootstrap flow.',
          intent: 'review',
          targets: [
            {
              location: { file, line: 1, column: 1 },
              label: 'InspectoPlugin',
              selector: 'module',
            },
          ],
        },
      ],
    }

    const request = createJsonRequest('POST', JSON.stringify(req))
    const response = createMockResponse()
    const url = new URL(`http://0.0.0.0:5678${INSPECTO_API_PATHS.AI_BATCH_DISPATCH}`)

    const pending = handleRequest(url, request as any, response as any)
    request.start()
    await pending

    expect(response.statusCode).toBe(200)
    expect(response.jsonBody.success).toBe(true)
    expect(response.jsonBody.session?.id).toBeTruthy()
    expect(response.jsonBody.session?.status).toBe('pending')
    expect(response.jsonBody.fallbackPayload?.prompt).toContain('Review the plugin bootstrap flow.')
    expect(execFileSync).toHaveBeenCalled()
    expect(annotationSessionStore.listSessions()).toHaveLength(1)
    expect(annotationSessionStore.listSessions()[0]?.instruction).toBe('')
    expect(annotationSessionStore.listSessions()[0]?.annotations[0]?.note).toBe(
      'Review the plugin bootstrap flow.',
    )

    const uri = vi.mocked(execFileSync).mock.calls[0]?.[1]?.[0] as string
    const launchedUrl = new URL(uri)
    const ticket = launchedUrl.searchParams.get('ticket')

    expect(ticket).toBeTruthy()

    const ticketRequest = createJsonRequest('GET', '')
    const ticketResponse = createMockResponse()
    const ticketUrl = new URL(`http://0.0.0.0:5678${INSPECTO_API_PATHS.AI_TICKET}/${ticket}`)

    const pendingTicket = handleRequest(ticketUrl, ticketRequest as any, ticketResponse as any)
    ticketRequest.start()
    await pendingTicket

    expect(ticketResponse.statusCode).toBe(200)
    expect(ticketResponse.jsonBody.prompt).toContain('Review the plugin bootstrap flow.')
  })

  it('serves created annotation sessions through the session routes', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const file = `${process.cwd()}/packages/plugin/src/index.ts`
    const createReq: SendAnnotationsToAiRequest = {
      annotations: [
        {
          note: 'Review the created session payload.',
          intent: 'review',
          targets: [
            {
              location: { file, line: 1, column: 1 },
              label: 'InspectoPlugin',
            },
          ],
        },
      ],
    }

    const createRequest = createJsonRequest('POST', JSON.stringify(createReq))
    const createResponse = createMockResponse()
    const createUrl = new URL(`http://0.0.0.0:5678${INSPECTO_API_PATHS.AI_BATCH_DISPATCH}`)

    const pendingCreate = handleRequest(createUrl, createRequest as any, createResponse as any)
    createRequest.start()
    await pendingCreate

    const sessionId = createResponse.jsonBody.session?.id as string
    expect(sessionId).toBeTruthy()

    const listRequest = createJsonRequest('GET', '')
    const listResponse = createMockResponse()
    const listUrl = new URL(`http://0.0.0.0:5678${INSPECTO_API_PATHS.SESSIONS}`)

    const pendingList = handleRequest(listUrl, listRequest as any, listResponse as any)
    listRequest.start()
    await pendingList

    expect(listResponse.statusCode).toBe(200)
    expect(listResponse.jsonBody.success).toBe(true)
    expect(listResponse.jsonBody.sessions).toHaveLength(1)
    expect(listResponse.jsonBody.sessions[0]?.id).toBe(sessionId)

    const detailRequest = createJsonRequest('GET', '')
    const detailResponse = createMockResponse()
    const detailUrl = new URL(`http://0.0.0.0:5678${INSPECTO_API_PATHS.SESSIONS}/${sessionId}`)

    const pendingDetail = handleRequest(detailUrl, detailRequest as any, detailResponse as any)
    detailRequest.start()
    await pendingDetail

    expect(detailResponse.statusCode).toBe(200)
    expect(detailResponse.jsonBody.success).toBe(true)
    expect(detailResponse.jsonBody.session.id).toBe(sessionId)
    expect(detailResponse.jsonBody.session.annotations[0]?.note).toBe(
      'Review the created session payload.',
    )
  })

  it('appends agent replies and promotes the session to in_progress', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const file = `${process.cwd()}/packages/plugin/src/index.ts`
    const createReq: SendAnnotationsToAiRequest = {
      annotations: [
        {
          note: 'Review the reply flow.',
          intent: 'review',
          targets: [{ location: { file, line: 1, column: 1 }, label: 'InspectoPlugin' }],
        },
      ],
    }

    const createRequest = createJsonRequest('POST', JSON.stringify(createReq))
    const createResponse = createMockResponse()
    const createUrl = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.AI_BATCH_DISPATCH}`)

    const pendingCreate = handleRequest(createUrl, createRequest as any, createResponse as any)
    createRequest.start()
    await pendingCreate

    const sessionId = createResponse.jsonBody.session?.id as string
    const replyRequest = createJsonRequest(
      'POST',
      JSON.stringify({ role: 'agent', text: 'I am investigating this now.' }),
    )
    const replyResponse = createMockResponse()
    const replyUrl = new URL(
      `http://0.0.0.0:5678${INSPECTO_API_PATHS.SESSIONS}/${sessionId}${INSPECTO_API_PATHS.SESSION_REPLY_SUFFIX}`,
    )

    const pendingReply = handleRequest(replyUrl, replyRequest as any, replyResponse as any)
    replyRequest.start()
    await pendingReply

    expect(replyResponse.statusCode).toBe(200)
    expect(replyResponse.jsonBody.success).toBe(true)
    expect(replyResponse.jsonBody.session.status).toBe('in_progress')
    expect(replyResponse.jsonBody.session.messages).toHaveLength(1)
    expect(replyResponse.jsonBody.session.messages[0]?.text).toBe('I am investigating this now.')
  })

  it('resolves a session and optionally appends a final summary message', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const file = `${process.cwd()}/packages/plugin/src/index.ts`
    const createReq: SendAnnotationsToAiRequest = {
      annotations: [
        {
          note: 'Review the resolve flow.',
          intent: 'fix',
          targets: [{ location: { file, line: 1, column: 1 }, label: 'InspectoPlugin' }],
        },
      ],
    }

    const createRequest = createJsonRequest('POST', JSON.stringify(createReq))
    const createResponse = createMockResponse()
    const createUrl = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.AI_BATCH_DISPATCH}`)

    const pendingCreate = handleRequest(createUrl, createRequest as any, createResponse as any)
    createRequest.start()
    await pendingCreate

    const sessionId = createResponse.jsonBody.session?.id as string
    const resolveRequest = createJsonRequest(
      'POST',
      JSON.stringify({ message: 'Implemented the fix and verified the flow.' }),
    )
    const resolveResponse = createMockResponse()
    const resolveUrl = new URL(
      `http://0.0.0.0:5678${INSPECTO_API_PATHS.SESSIONS}/${sessionId}${INSPECTO_API_PATHS.SESSION_RESOLVE_SUFFIX}`,
    )

    const pendingResolve = handleRequest(resolveUrl, resolveRequest as any, resolveResponse as any)
    resolveRequest.start()
    await pendingResolve

    expect(resolveResponse.statusCode).toBe(200)
    expect(resolveResponse.jsonBody.success).toBe(true)
    expect(resolveResponse.jsonBody.session.status).toBe('resolved')
    expect(resolveResponse.jsonBody.session.resolvedAt).toBeTruthy()
    const finalMessage =
      resolveResponse.jsonBody.session.messages[
        resolveResponse.jsonBody.session.messages.length - 1
      ]
    expect(finalMessage?.text).toBe('Implemented the fix and verified the flow.')
  })

  it('rejects invalid reply payloads and missing sessions', async () => {
    const { handleRequest } = await import('../src/server/index.js')

    const invalidRoleRequest = createJsonRequest(
      'POST',
      JSON.stringify({ role: 'unknown', text: 'hello' }),
    )
    const invalidRoleResponse = createMockResponse()
    const invalidRoleUrl = new URL(
      `http://0.0.0.0:5678${INSPECTO_API_PATHS.SESSIONS}/missing${INSPECTO_API_PATHS.SESSION_REPLY_SUFFIX}`,
    )

    const pendingInvalidRole = handleRequest(
      invalidRoleUrl,
      invalidRoleRequest as any,
      invalidRoleResponse as any,
    )
    invalidRoleRequest.start()
    await pendingInvalidRole

    expect(invalidRoleResponse.statusCode).toBe(400)
    expect(invalidRoleResponse.jsonBody.success).toBe(false)

    const invalidReplyRequest = createJsonRequest(
      'POST',
      JSON.stringify({ role: 'agent', text: '' }),
    )
    const invalidReplyResponse = createMockResponse()
    const invalidReplyUrl = new URL(
      `http://127.0.0.1:5678${INSPECTO_API_PATHS.SESSIONS}/missing${INSPECTO_API_PATHS.SESSION_REPLY_SUFFIX}`,
    )

    const pendingInvalidReply = handleRequest(
      invalidReplyUrl,
      invalidReplyRequest as any,
      invalidReplyResponse as any,
    )
    invalidReplyRequest.start()
    await pendingInvalidReply

    expect(invalidReplyResponse.statusCode).toBe(400)
    expect(invalidReplyResponse.jsonBody.success).toBe(false)

    const missingResolveRequest = createJsonRequest('POST', JSON.stringify({ message: 'done' }))
    const missingResolveResponse = createMockResponse()
    const missingResolveUrl = new URL(
      `http://0.0.0.0:5678${INSPECTO_API_PATHS.SESSIONS}/missing${INSPECTO_API_PATHS.SESSION_RESOLVE_SUFFIX}`,
    )

    const pendingMissingResolve = handleRequest(
      missingResolveUrl,
      missingResolveRequest as any,
      missingResolveResponse as any,
    )
    missingResolveRequest.start()
    await pendingMissingResolve

    expect(missingResolveResponse.statusCode).toBe(404)
    expect(missingResolveResponse.jsonBody.success).toBe(false)
  })

  it('streams session events over SSE and supports status filtering', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const streamRequest = createJsonRequest('GET', '')
    const streamResponse = createStreamingResponse()
    const streamUrl = new URL(
      `http://0.0.0.0:5678${INSPECTO_API_PATHS.SESSION_EVENTS}?status=pending`,
    )

    await handleRequest(streamUrl, streamRequest as any, streamResponse as any)

    expect(streamResponse.statusCode).toBe(200)
    expect(streamResponse.headers['Content-Type']).toBe('text/event-stream')
    expect(streamResponse.writes[0]).toContain('event: ready')

    const file = `${process.cwd()}/packages/plugin/src/index.ts`
    const createReq: SendAnnotationsToAiRequest = {
      annotations: [
        {
          note: 'Review the SSE flow.',
          intent: 'review',
          targets: [{ location: { file, line: 1, column: 1 }, label: 'InspectoPlugin' }],
        },
      ],
    }

    const createRequest = createJsonRequest('POST', JSON.stringify(createReq))
    const createResponse = createMockResponse()
    const createUrl = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.AI_BATCH_DISPATCH}`)

    const pendingCreate = handleRequest(createUrl, createRequest as any, createResponse as any)
    createRequest.start()
    await pendingCreate

    const sessionId = createResponse.jsonBody.session?.id as string
    const replyRequest = createJsonRequest(
      'POST',
      JSON.stringify({ role: 'agent', text: 'Moving this into progress.' }),
    )
    const replyResponse = createMockResponse()
    const replyUrl = new URL(
      `http://127.0.0.1:5678${INSPECTO_API_PATHS.SESSIONS}/${sessionId}${INSPECTO_API_PATHS.SESSION_REPLY_SUFFIX}`,
    )

    const pendingReply = handleRequest(replyUrl, replyRequest as any, replyResponse as any)
    replyRequest.start()
    await pendingReply

    expect(replyResponse.statusCode).toBe(200)
    expect(streamResponse.writes.some(chunk => chunk.includes('event: session-created'))).toBe(true)
    expect(
      streamResponse.writes.some(chunk => chunk.includes('event: session-message-appended')),
    ).toBe(false)

    streamRequest.emit('close')
    expect(streamResponse.ended).toBe(true)
  })

  it('claims the next pending session over the claim endpoint', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')
    const { annotationSessionStore } = await import('../src/server/session-store.js')

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const claimRequest = createJsonRequest('POST', JSON.stringify({ timeoutMs: 1000 }))
    const claimResponse = createMockResponse()
    const claimUrl = new URL(`http://0.0.0.0:5678${INSPECTO_API_PATHS.SESSION_CLAIM_NEXT}`)

    const pendingClaim = handleRequest(claimUrl, claimRequest as any, claimResponse as any)
    claimRequest.start()

    const file = `${process.cwd()}/packages/plugin/src/index.ts`
    const createReq: SendAnnotationsToAiRequest = {
      deliveryMode: 'mcp',
      annotations: [
        {
          note: 'Review the claim flow.',
          intent: 'review',
          targets: [{ location: { file, line: 1, column: 1 }, label: 'InspectoPlugin' }],
        },
      ],
    }

    const createRequest = createJsonRequest('POST', JSON.stringify(createReq))
    const createResponse = createMockResponse()
    const createUrl = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.AI_BATCH_DISPATCH}`)

    const pendingCreate = handleRequest(createUrl, createRequest as any, createResponse as any)
    createRequest.start()
    await pendingCreate
    await pendingClaim

    expect(claimResponse.statusCode).toBe(200)
    expect(claimResponse.jsonBody.success).toBe(true)
    expect(claimResponse.jsonBody.timedOut).toBe(false)
    expect(claimResponse.jsonBody.event).toBe('session-created')
    expect(claimResponse.jsonBody.session?.id).toBe(createResponse.jsonBody.session?.id)
    expect(claimResponse.jsonBody.session?.status).toBe('acknowledged')
    expect(annotationSessionStore.getSession(claimResponse.jsonBody.session.id)?.status).toBe(
      'acknowledged',
    )
  })

  it('streams events for a single session id across status changes', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const file = `${process.cwd()}/packages/plugin/src/index.ts`
    const createReq: SendAnnotationsToAiRequest = {
      annotations: [
        {
          note: 'Review the targeted SSE flow.',
          intent: 'review',
          targets: [{ location: { file, line: 1, column: 1 }, label: 'InspectoPlugin' }],
        },
      ],
    }

    const createRequest = createJsonRequest('POST', JSON.stringify(createReq))
    const createResponse = createMockResponse()
    const createUrl = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.AI_BATCH_DISPATCH}`)

    const pendingCreate = handleRequest(createUrl, createRequest as any, createResponse as any)
    createRequest.start()
    await pendingCreate

    const sessionId = createResponse.jsonBody.session?.id as string
    const streamRequest = createJsonRequest('GET', '')
    const streamResponse = createStreamingResponse()
    const streamUrl = new URL(
      `http://0.0.0.0:5678${INSPECTO_API_PATHS.SESSION_EVENTS}?sessionId=${sessionId}`,
    )

    await handleRequest(streamUrl, streamRequest as any, streamResponse as any)

    const replyRequest = createJsonRequest(
      'POST',
      JSON.stringify({ role: 'agent', text: 'Moving this into progress.' }),
    )
    const replyResponse = createMockResponse()
    const replyUrl = new URL(
      `http://127.0.0.1:5678${INSPECTO_API_PATHS.SESSIONS}/${sessionId}${INSPECTO_API_PATHS.SESSION_REPLY_SUFFIX}`,
    )

    const pendingReply = handleRequest(replyUrl, replyRequest as any, replyResponse as any)
    replyRequest.start()
    await pendingReply

    expect(replyResponse.statusCode).toBe(200)
    expect(
      streamResponse.writes.some(chunk => chunk.includes('event: session-message-appended')),
    ).toBe(true)

    streamRequest.emit('close')
    expect(streamResponse.ended).toBe(true)
  })

  it('rejects resolving a session before any agent reply is recorded', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const file = `${process.cwd()}/packages/plugin/src/index.ts`
    const createReq: SendAnnotationsToAiRequest = {
      annotations: [
        {
          note: 'Review resolve safety.',
          intent: 'review',
          targets: [{ location: { file, line: 1, column: 1 }, label: 'InspectoPlugin' }],
        },
      ],
    }

    const createRequest = createJsonRequest('POST', JSON.stringify(createReq))
    const createResponse = createMockResponse()
    const createUrl = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.AI_BATCH_DISPATCH}`)

    const pendingCreate = handleRequest(createUrl, createRequest as any, createResponse as any)
    createRequest.start()
    await pendingCreate

    const sessionId = createResponse.jsonBody.session?.id as string
    const resolveRequest = createJsonRequest('POST', JSON.stringify({}))
    const resolveResponse = createMockResponse()
    const resolveUrl = new URL(
      `http://127.0.0.1:5678${INSPECTO_API_PATHS.SESSIONS}/${sessionId}${INSPECTO_API_PATHS.SESSION_RESOLVE_SUFFIX}`,
    )

    const pendingResolve = handleRequest(resolveUrl, resolveRequest as any, resolveResponse as any)
    resolveRequest.start()
    await pendingResolve

    expect(resolveResponse.statusCode).toBe(400)
    expect(resolveResponse.jsonBody.error).toBe(
      'Resolve message is required until an agent reply is recorded.',
    )
  })

  it('serves inspect dispatch tickets with the prompt payload', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')
    const { execFileSync } = await import('node:child_process')

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const file = `${process.cwd()}/packages/plugin/src/index.ts`
    const req: SendToAiRequest = {
      location: { file, line: 1, column: 1 },
      snippet: 'export {}',
      prompt: 'Review this inspect prompt.',
    }

    const request = createJsonRequest('POST', JSON.stringify(req))
    const response = createMockResponse()
    const url = new URL(`http://0.0.0.0:5678${INSPECTO_API_PATHS.AI_DISPATCH}`)

    const pending = handleRequest(url, request as any, response as any)
    request.start()
    await pending

    expect(response.statusCode).toBe(200)
    expect(response.jsonBody.success).toBe(true)

    const uri = vi.mocked(execFileSync).mock.calls[0]?.[1]?.[0] as string
    const launchedUrl = new URL(uri)
    const ticket = launchedUrl.searchParams.get('ticket')

    expect(ticket).toBeTruthy()

    const ticketRequest = createJsonRequest('GET', '')
    const ticketResponse = createMockResponse()
    const ticketUrl = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.AI_TICKET}/${ticket}`)

    const pendingTicket = handleRequest(ticketUrl, ticketRequest as any, ticketResponse as any)
    ticketRequest.start()
    await pendingTicket

    expect(ticketResponse.statusCode).toBe(200)
    expect(ticketResponse.jsonBody.prompt).toBe('Review this inspect prompt.')
  })

  it('uses the active CodeBuddy CN scheme for AI dispatch when config uses codebuddy-cn', async () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'darwin' })

    try {
      const { handleRequest, serverState } = await import('../src/server/index.js')
      const { execFileSync } = await import('node:child_process')
      const { loadUserConfigSync } = await import('../src/config.js')

      serverState.projectRoot = process.cwd()
      serverState.cwd = process.cwd()
      serverState.ideInfo = { ide: 'codebuddy-cn', scheme: 'codebuddycn' } as any
      vi.mocked(loadUserConfigSync).mockReturnValue({
        ide: 'codebuddy-cn',
        'provider.default': 'codebuddy.builtin',
        'prompt.autoSend': false,
      })

      const file = `${process.cwd()}/packages/plugin/src/index.ts`
      const req: SendToAiRequest = {
        location: { file, line: 15, column: 7 },
        snippet: 'export {}',
        prompt: 'Review this with CodeBuddy.',
      }

      const request = createJsonRequest('POST', JSON.stringify(req))
      const response = createMockResponse()
      const url = new URL(`http://0.0.0.0:5678${INSPECTO_API_PATHS.AI_DISPATCH}`)

      const pending = handleRequest(url, request as any, response as any)
      request.start()
      await pending

      expect(response.statusCode).toBe(200)
      expect(response.jsonBody.success).toBe(true)

      const uri = vi.mocked(execFileSync).mock.calls[0]?.[1]?.[0] as string
      expect(uri.startsWith('codebuddycn://inspecto.inspecto/send?')).toBe(true)
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    }
  })

  it('returns a 403 batch route response for forbidden annotation paths', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')
    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const req: SendAnnotationsToAiRequest = {
      annotations: [
        {
          note: 'Outside path',
          intent: 'ask',
          targets: [
            {
              location: { file: '/tmp/outside.tsx', line: 1, column: 1 },
            },
          ],
        },
      ],
    }

    const request = createJsonRequest('POST', JSON.stringify(req))
    const response = createMockResponse()
    const url = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.AI_BATCH_DISPATCH}`)

    const pending = handleRequest(url, request as any, response as any)
    request.start()
    await pending

    expect(response.statusCode).toBe(403)
    expect(response.jsonBody.success).toBe(false)
    expect(response.jsonBody.errorCode).toBe('FORBIDDEN_PATH')
  })

  it('creates a durable session without IDE fallback payload when batch delivery mode is agent', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')
    const { execFileSync, spawn } = await import('node:child_process')
    const { annotationSessionStore } = await import('../src/server/session-store.js')
    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const req: SendAnnotationsToAiRequest = {
      instruction: 'Create an agent task for these notes.',
      deliveryMode: 'mcp',
      annotations: [
        {
          note: 'Review this onboarding surface.',
          intent: 'review',
          targets: [
            {
              location: {
                file: `${process.cwd()}/packages/plugin/src/index.ts`,
                line: 10,
                column: 2,
              },
              label: 'Onboarding panel',
            },
          ],
        },
      ],
    }

    const request = createJsonRequest('POST', JSON.stringify(req))
    const response = createMockResponse()
    const url = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.AI_BATCH_DISPATCH}`)

    const pending = handleRequest(url, request as any, response as any)
    request.start()
    await pending

    expect(response.statusCode).toBe(200)
    expect(response.jsonBody.success).toBe(true)
    expect(response.jsonBody.session?.id).toBeTruthy()
    expect(response.jsonBody.session?.status).toBe('pending')
    expect(response.jsonBody.fallbackPayload).toBeUndefined()
    expect(execFileSync).not.toHaveBeenCalled()
    expect(spawn).not.toHaveBeenCalled()
    expect(annotationSessionStore.getSession(response.jsonBody.session.id)?.status).toBe('pending')
    expect(annotationSessionStore.getSession(response.jsonBody.session.id)?.deliveryMode).toBe(
      'mcp',
    )
    expect(annotationSessionStore.getSession(response.jsonBody.session.id)?.messages).toEqual([])
  })

  it('does not auto-launch a background worker for agent sessions', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')
    const { spawn } = await import('node:child_process')
    const { annotationSessionStore } = await import('../src/server/session-store.js')
    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const req: SendAnnotationsToAiRequest = {
      instruction: 'Create an agent task for these notes.',
      deliveryMode: 'mcp',
      annotations: [
        {
          note: 'Review this onboarding surface.',
          intent: 'review',
          targets: [
            {
              location: {
                file: `${process.cwd()}/packages/plugin/src/index.ts`,
                line: 10,
                column: 2,
              },
              label: 'Onboarding panel',
            },
          ],
        },
      ],
    }

    const request = createJsonRequest('POST', JSON.stringify(req))
    const response = createMockResponse()
    const url = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.AI_BATCH_DISPATCH}`)

    const pending = handleRequest(url, request as any, response as any)
    request.start()
    await pending

    expect(response.statusCode).toBe(200)
    expect(response.jsonBody.success).toBe(true)
    expect(response.jsonBody.session?.id).toBeTruthy()
    expect(annotationSessionStore.getSession(response.jsonBody.session.id)?.status).toBe('pending')
    expect(spawn).not.toHaveBeenCalled()
  })

  it('includes built-in runtime context settings in client config responses', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')
    const { loadUserConfigSync } = await import('../src/config.js')

    vi.mocked(loadUserConfigSync).mockReturnValue({
      ide: 'vscode',
      'provider.default': 'codex.cli',
      'prompt.autoSend': false,
      'annotate.channel': 'mcp',
    })

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const request = createJsonRequest('GET', '')
    const response = createMockResponse()
    const url = new URL(`http://0.0.0.0:5678${INSPECTO_API_PATHS.CLIENT_CONFIG}`)

    const pending = handleRequest(url, request as any, response as any)
    request.start()
    await pending

    expect(response.statusCode).toBe(200)
    expect(response.jsonBody.annotateChannel).toBe('mcp')
    expect(response.jsonBody.runtimeContext).toEqual({
      enabled: true,
      preview: true,
      maxRuntimeErrors: 3,
      maxFailedRequests: 2,
    })
    expect(response.jsonBody.ideConnected).toBe(false)
  })

  it('marks client config as IDE-connected after an IDE handshake', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')
    const { loadUserConfigSync } = await import('../src/config.js')

    vi.mocked(loadUserConfigSync).mockReturnValue({
      ide: 'vscode',
      'annotate.channel': 'mcp',
    })

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()
    serverState.ideInfo = { ide: 'vscode', scheme: 'vscode', providers: {} } as any

    const request = createJsonRequest('GET', '')
    const response = createMockResponse()
    const url = new URL(`http://0.0.0.0:5678${INSPECTO_API_PATHS.CLIENT_CONFIG}`)

    const pending = handleRequest(url, request as any, response as any)
    request.start()
    await pending

    expect(response.statusCode).toBe(200)
    expect(response.jsonBody.ide).toBe('vscode')
    expect(response.jsonBody.ideConnected).toBe(true)
    expect(response.jsonBody.annotateChannel).toBe('mcp')
  })

  it('keeps IDE integration disabled in client config when user config sets ide none', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')
    const { loadUserConfigSync } = await import('../src/config.js')

    vi.mocked(loadUserConfigSync).mockReturnValue({
      ide: 'none',
      'annotate.channel': 'mcp',
    })

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()
    serverState.ideInfo = { ide: 'vscode', scheme: 'vscode', providers: {} } as any

    const request = createJsonRequest('GET', '')
    const response = createMockResponse()
    const url = new URL(`http://0.0.0.0:5678${INSPECTO_API_PATHS.CLIENT_CONFIG}`)

    const pending = handleRequest(url, request as any, response as any)
    request.start()
    await pending

    expect(response.statusCode).toBe(200)
    expect(response.jsonBody.ide).toBe('none')
    expect(response.jsonBody.ideConnected).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(response.jsonBody, 'providers')).toBe(false)
    expect(response.jsonBody.annotateChannel).toBe('mcp')
  })

  it('serves client config responses without deprecated capability fields', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')
    const { loadUserConfigSync } = await import('../src/config.js')

    vi.mocked(loadUserConfigSync).mockReturnValue({
      ide: 'vscode',
      'provider.default': 'codex.cli',
      'prompt.autoSend': false,
    })

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const request = createJsonRequest('GET', '')
    const response = createMockResponse()
    const url = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.CLIENT_CONFIG}`)

    const pending = handleRequest(url, request as any, response as any)
    request.start()
    await pending

    expect(response.statusCode).toBe(200)
    expect(Object.prototype.hasOwnProperty.call(response.jsonBody, 'screenshotContext')).toBe(false)
  })

  it('opens files through VS Code family URI schemes on macOS', async () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'darwin' })

    try {
      const { handleRequest, serverState } = await import('../src/server/index.js')
      const { execFileSync } = await import('node:child_process')
      const { loadUserConfigSync } = await import('../src/config.js')

      serverState.projectRoot = process.cwd()
      serverState.cwd = process.cwd()
      serverState.ideInfo = { ide: 'cursor', scheme: 'cursor' } as any
      vi.mocked(loadUserConfigSync).mockReturnValue({
        ide: 'cursor',
        'provider.default': 'codex.cli',
        'prompt.autoSend': false,
      })

      const file = `${process.cwd()}/packages/plugin/src/index.ts`
      const request = createJsonRequest('POST', JSON.stringify({ file, line: 12, column: 3 }))
      const response = createMockResponse()
      const url = new URL(`http://0.0.0.0:5678${INSPECTO_API_PATHS.SOURCE_OPEN}`)

      const pending = handleRequest(url, request as any, response as any)
      request.start()
      await pending

      expect(response.statusCode).toBe(200)
      expect(vi.mocked(execFileSync)).toHaveBeenCalledWith('open', [
        `cursor://file${encodeURI(file)}:12:3`,
      ])
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    }
  })

  it('prefers the active CodeBuddy CN scheme when config uses the codebuddy-cn ide id', async () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'darwin' })

    try {
      const { handleRequest, serverState } = await import('../src/server/index.js')
      const { execFileSync } = await import('node:child_process')
      const { loadUserConfigSync } = await import('../src/config.js')

      serverState.projectRoot = process.cwd()
      serverState.cwd = process.cwd()
      serverState.ideInfo = { ide: 'codebuddy-cn', scheme: 'codebuddycn' } as any
      vi.mocked(loadUserConfigSync).mockReturnValue({
        ide: 'codebuddy-cn',
        'provider.default': 'codebuddy.builtin',
        'prompt.autoSend': false,
      })

      const file = `${process.cwd()}/packages/plugin/src/index.ts`
      const request = createJsonRequest('POST', JSON.stringify({ file, line: 15, column: 7 }))
      const response = createMockResponse()
      const url = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.SOURCE_OPEN}`)

      const pending = handleRequest(url, request as any, response as any)
      request.start()
      await pending

      expect(response.statusCode).toBe(200)
      expect(vi.mocked(execFileSync)).toHaveBeenCalledWith('open', [
        `codebuddycn://file${encodeURI(file)}:15:7`,
      ])
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    }
  })

  it('normalizes Windows file paths before opening through VS Code family URI schemes', async () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'win32' })

    try {
      const { handleRequest, serverState } = await import('../src/server/index.js')
      const { execFileSync } = await import('node:child_process')
      const { loadUserConfigSync } = await import('../src/config.js')

      serverState.projectRoot = 'C:\\repo'
      serverState.cwd = 'C:\\repo'
      serverState.ideInfo = { ide: 'vscode', scheme: 'vscode' } as any
      vi.mocked(loadUserConfigSync).mockReturnValue({
        ide: 'vscode',
        'provider.default': 'codex.cli',
        'prompt.autoSend': false,
      })

      const request = createJsonRequest(
        'POST',
        JSON.stringify({ file: 'C:\\repo\\src\\App.tsx', line: 42, column: 7 }),
      )
      const response = createMockResponse()
      const url = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.SOURCE_OPEN}`)

      const pending = handleRequest(url, request as any, response as any)
      request.start()
      await pending

      expect(response.statusCode).toBe(200)
      expect(vi.mocked(execFileSync)).toHaveBeenCalledWith('cmd', [
        '/c',
        'start',
        '""',
        'vscode://file/C:/repo/src/App.tsx:42:7',
      ])
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    }
  })
})

function createJsonRequest(method: string, body: string) {
  const listeners = new Map<string, ((chunk?: Buffer) => void)[]>()

  return {
    method,
    on(event: string, listener: (chunk?: Buffer) => void) {
      const current = listeners.get(event) ?? []
      current.push(listener)
      listeners.set(event, current)
      return this
    },
    emit(event: string, chunk?: Buffer) {
      for (const listener of listeners.get(event) ?? []) {
        listener(chunk)
      }
    },
    start() {
      if (body.length > 0) {
        this.emit('data', Buffer.from(body))
      }
      this.emit('end')
    },
  }
}

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: '',
    jsonBody: {} as any,
    setHeader(name: string, value: string) {
      this.headers[name] = value
    },
    writeHead(statusCode: number, headers?: Record<string, string>) {
      this.statusCode = statusCode
      Object.assign(this.headers, headers)
    },
    end(payload = '') {
      this.body = payload
      this.jsonBody = payload ? JSON.parse(payload) : {}
    },
  }
}

function createStreamingResponse() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    writes: [] as string[],
    ended: false,
    setHeader(name: string, value: string) {
      this.headers[name] = value
    },
    writeHead(statusCode: number, headers?: Record<string, string>) {
      this.statusCode = statusCode
      Object.assign(this.headers, headers)
    },
    write(payload: string) {
      this.writes.push(payload)
    },
    end(payload = '') {
      if (payload) {
        this.writes.push(payload)
      }
      this.ended = true
    },
  }
}
