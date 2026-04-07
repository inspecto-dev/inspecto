import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  INSPECTO_API_PATHS,
  type SendAnnotationsToAiRequest,
  type SendToAiRequest,
} from '@inspecto-dev/types'

vi.mock('node:child_process', () => ({
  execSync: vi.fn(() => `${process.cwd()}\n`),
  execFileSync: vi.fn(),
}))

vi.mock('../src/config.js', () => ({
  loadUserConfigSync: vi.fn(() => ({
    ide: 'vscode',
    'provider.default': 'codex.cli',
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
      responseMode: 'unified',
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

  it('lists all targets when a single annotation spans multiple elements', async () => {
    const { buildAnnotationBatchPrompt } = await import('../src/server/annotation-dispatch.js')

    const prompt = buildAnnotationBatchPrompt({
      instruction: '',
      responseMode: 'unified',
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

  it('ignores response mode boilerplate and keeps the prompt minimal', async () => {
    const { buildAnnotationBatchPrompt } = await import('../src/server/annotation-dispatch.js')

    const prompt = buildAnnotationBatchPrompt({
      instruction: '',
      responseMode: 'per-annotation',
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
        responseMode: 'unified',
      },
      serverState,
    )

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('FORBIDDEN_PATH')
    expect(result.error).toContain('outside of project workspace')
  })

  it('prepends the provided instruction to minimal prompts', async () => {
    const { buildAnnotationBatchPrompt } = await import('../src/server/annotation-dispatch.js')

    const prompt = buildAnnotationBatchPrompt({
      instruction: 'Review these notes with a layout-consistency lens.',
      responseMode: 'unified',
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

  it('preserves runtime and screenshot context during annotation normalization and prompt assembly', async () => {
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
      screenshotContext: {
        enabled: true,
        capturedAt: '2026-04-04T12:00:00.000Z',
        mimeType: 'image/png',
        imageDataUrl: 'data:image/png;base64,AAA=',
      },
    })

    expect(batch.screenshotContext).toEqual({
      enabled: true,
      capturedAt: '2026-04-04T12:00:00.000Z',
      mimeType: 'image/png',
      imageDataUrl: 'data:image/png;base64,AAA=',
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
    expect(prompt).toContain('Visual screenshot context attached:')
    expect(prompt.indexOf('Relevant runtime context:')).toBeLessThan(
      prompt.indexOf('Visual screenshot context attached:'),
    )
  })

  it('appends CSS context to annotation prompts when provided', async () => {
    const { buildAnnotationBatchPrompt } = await import('../src/server/annotation-dispatch.js')

    const prompt = buildAnnotationBatchPrompt({
      instruction: 'Review the button styling.',
      responseMode: 'unified',
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

  it('appends screenshot evidence to annotation prompts when screenshot context is provided', async () => {
    const { buildAnnotationBatchPrompt } = await import('../src/server/annotation-dispatch.js')

    const prompt = buildAnnotationBatchPrompt({
      instruction: '',
      responseMode: 'unified',
      annotations: [
        {
          index: 1,
          note: 'Review the button treatment.',
          intent: 'review',
          targets: [{ file: '/repo/Button.tsx', line: 12, column: 3, label: 'button.primary' }],
        },
      ],
      screenshotContext: {
        enabled: true,
        capturedAt: '2026-04-04T12:00:00.000Z',
        mimeType: 'image/png',
        imageDataUrl: 'data:image/png;base64,AAA=',
      },
    })

    expect(prompt).toContain('Visual screenshot context attached:')
    expect(prompt).toContain('capturedAt=2026-04-04T12:00:00.000Z')
    expect(prompt).toContain('mimeType=image/png')
  })

  it('appends screenshot evidence to annotation prompts when only an asset id is provided', async () => {
    const { buildAnnotationBatchPrompt } = await import('../src/server/annotation-dispatch.js')

    const prompt = buildAnnotationBatchPrompt({
      instruction: '',
      responseMode: 'unified',
      annotations: [
        {
          index: 1,
          note: 'Review the button treatment.',
          intent: 'review',
          targets: [{ file: '/repo/Button.tsx', line: 12, column: 3, label: 'button.primary' }],
        },
      ],
      screenshotContext: {
        enabled: true,
        capturedAt: '2026-04-04T12:00:00.000Z',
        mimeType: 'image/png',
        imageAssetId: 'asset_123',
      },
    })

    expect(prompt).toContain('Visual screenshot context attached:')
    expect(prompt).toContain('capturedAt=2026-04-04T12:00:00.000Z')
    expect(prompt).toContain('mimeType=image/png')
    expect(prompt).toContain('imageAssetId=asset_123')
  })

  it('rejects empty annotation batches as invalid requests', async () => {
    const { dispatchAnnotationsToAi } = await import('../src/server/annotation-dispatch.js')
    const { serverState } = await import('../src/server/index.js')

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const result = await dispatchAnnotationsToAi(
      {
        annotations: [],
        responseMode: 'unified',
      },
      serverState,
    )

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('INVALID_REQUEST')
    expect(result.error).toContain('At least one annotation is required.')
  })

  it('serves the batch dispatch route through the server handler', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')
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
      responseMode: 'unified',
      screenshotContext: {
        enabled: true,
        capturedAt: '2026-04-04T12:00:00.000Z',
        mimeType: 'image/png',
        imageDataUrl: 'data:image/png;base64,AAA=',
      },
    }

    const request = createJsonRequest('POST', JSON.stringify(req))
    const response = createMockResponse()
    const url = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.AI_BATCH_DISPATCH}`)

    const pending = handleRequest(url, request as any, response as any)
    request.start()
    await pending

    expect(response.statusCode).toBe(200)
    expect(response.jsonBody.success).toBe(true)
    expect(response.jsonBody.fallbackPayload?.prompt).toContain('Review the plugin bootstrap flow.')
    expect(execFileSync).toHaveBeenCalled()

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
    expect(ticketResponse.jsonBody.prompt).toContain('Review the plugin bootstrap flow.')
    expect(ticketResponse.jsonBody.prompt).toContain('Visual screenshot context attached:')
    expect(ticketResponse.jsonBody.screenshotContext).toEqual({
      enabled: true,
      capturedAt: '2026-04-04T12:00:00.000Z',
      mimeType: 'image/png',
      imageDataUrl: 'data:image/png;base64,AAA=',
    })
  })

  it('preserves screenshot context in inspect dispatch tickets', async () => {
    const { handleRequest, serverState } = await import('../src/server/index.js')
    const { execFileSync } = await import('node:child_process')

    serverState.projectRoot = process.cwd()
    serverState.cwd = process.cwd()

    const file = `${process.cwd()}/packages/plugin/src/index.ts`
    const req: SendToAiRequest = {
      location: { file, line: 1, column: 1 },
      snippet: 'export {}',
      prompt: 'Review this inspect prompt.',
      screenshotContext: {
        enabled: true,
        capturedAt: '2026-04-04T12:00:00.000Z',
        mimeType: 'image/png',
        imageDataUrl: 'data:image/png;base64,AAA=',
      },
    }

    const request = createJsonRequest('POST', JSON.stringify(req))
    const response = createMockResponse()
    const url = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.AI_DISPATCH}`)

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
    expect(ticketResponse.jsonBody.screenshotContext).toEqual({
      enabled: true,
      capturedAt: '2026-04-04T12:00:00.000Z',
      mimeType: 'image/png',
      imageDataUrl: 'data:image/png;base64,AAA=',
    })
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
      responseMode: 'unified',
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

  it('includes built-in runtime context settings in client config responses', async () => {
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
    expect(response.jsonBody.runtimeContext).toEqual({
      enabled: true,
      preview: true,
      maxRuntimeErrors: 3,
      maxFailedRequests: 2,
    })
  })

  it('disables screenshot context controls by default in client config responses', async () => {
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
    expect(response.jsonBody.screenshotContext).toEqual({
      enabled: false,
    })
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
      const url = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.IDE_OPEN}`)

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
      const url = new URL(`http://127.0.0.1:5678${INSPECTO_API_PATHS.IDE_OPEN}`)

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
