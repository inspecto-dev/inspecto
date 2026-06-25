import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchIdeInfo,
  fetchAnnotationSession,
  fetchSnippet,
  openAnnotationSessionEventStream,
  openFileWithDiagnostics,
  resetClientTransport,
  sendAnnotationsToAi,
  sendToAi,
  setClientTransport,
} from '../src/transport/http-client.js'

describe('core client transport override', () => {
  afterEach(() => {
    resetClientTransport()
    vi.restoreAllMocks()
  })

  it('uses supplied callbacks instead of the local Inspecto dev server', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    setClientTransport({
      fetchConfig: vi.fn().mockResolvedValue({ hotKeys: 'meta', ide: 'none', ideConnected: false }),
      openFile: vi.fn().mockResolvedValue({ success: true }),
      fetchSnippet: vi.fn().mockResolvedValue({
        snippet: '<button>Upgrade</button>',
        startLine: 10,
        file: '/app/src/Button.tsx',
      }),
      sendToAi: vi.fn().mockResolvedValue({ success: true }),
      sendAnnotationsToAi: vi.fn().mockResolvedValue({ success: true }),
      fetchAnnotationSession: vi.fn().mockResolvedValue({
        success: true,
        session: { id: 'session-1', status: 'pending' },
      }),
      openAnnotationSessionEventStream: vi.fn().mockReturnValue({ close: vi.fn() }),
    })

    await expect(fetchIdeInfo(true)).resolves.toMatchObject({ ide: 'none', hotKeys: 'meta' })
    await expect(
      openFileWithDiagnostics({ file: '/app/src/Button.tsx', line: 10, column: 5 }),
    ).resolves.toEqual({ success: true })
    await expect(fetchSnippet('/app/src/Button.tsx', 10, 5)).resolves.toMatchObject({
      snippet: '<button>Upgrade</button>',
    })
    await expect(sendToAi({ prompt: 'Fix this' })).resolves.toEqual({ success: true })
    await expect(
      sendAnnotationsToAi({ instruction: 'Fix this', annotations: [], deliveryMode: 'ide' }),
    ).resolves.toEqual({ success: true })
    await expect(fetchAnnotationSession('session-1')).resolves.toMatchObject({
      success: true,
      session: { id: 'session-1' },
    })
    expect(openAnnotationSessionEventStream('session-1', { onEvent: vi.fn() })).toMatchObject({
      close: expect.any(Function),
    })

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('clears the transport override when the inspector unmounts', async () => {
    const { mountInspector, unmountInspector } = await import('../src/index.js')
    const fetchMock = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal('fetch', fetchMock)

    await mountInspector({
      transport: {
        fetchConfig: vi.fn().mockResolvedValue({ ide: 'none' }),
        sendToAi: vi.fn().mockResolvedValue({ success: true }),
      },
    })
    unmountInspector()

    await expect(sendToAi({ prompt: 'after unmount' })).resolves.toMatchObject({
      success: false,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/inspecto/api/v1/ai/dispatch'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'after unmount' }),
      },
    )
  })
})
