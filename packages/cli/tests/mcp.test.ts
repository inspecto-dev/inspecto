import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import {
  INSPECTO_MCP_TOOLS,
  createInspectoMcpRuntime,
  resolveInspectoServerBaseUrl,
} from '../src/commands/mcp.js'

describe('inspecto mcp command', () => {
  const portFile = path.join(os.tmpdir(), 'inspecto.port.json')
  let originalPortFile: string | null = null

  afterEach(() => {
    vi.restoreAllMocks()
    try {
      fs.unlinkSync(portFile)
    } catch {
      // ignore
    }
    if (originalPortFile !== null) {
      fs.writeFileSync(portFile, originalPortFile, 'utf-8')
      originalPortFile = null
    }
  })

  it('resolves the current project server URL from inspecto.port.json', () => {
    originalPortFile = fs.existsSync(portFile) ? fs.readFileSync(portFile, 'utf-8') : null
    const cwd = '/repo/current'
    const currentHash = crypto.createHash('md5').update(cwd).digest('hex')
    const otherHash = crypto.createHash('md5').update('/repo/other').digest('hex')

    fs.writeFileSync(
      portFile,
      JSON.stringify(
        {
          [otherHash]: 5679,
          [currentHash]: 5680,
        },
        null,
        2,
      ),
      'utf-8',
    )

    expect(resolveInspectoServerBaseUrl(cwd)).toBe('http://0.0.0.0:5680')
  })

  it('resolves the project server URL when Codex runs from a nested working directory', () => {
    originalPortFile = fs.existsSync(portFile) ? fs.readFileSync(portFile, 'utf-8') : null
    const projectRoot = '/repo/current'
    const nestedCwd = '/repo/current/packages/app'
    const projectRootHash = crypto.createHash('md5').update(projectRoot).digest('hex')

    fs.writeFileSync(
      portFile,
      JSON.stringify(
        {
          [projectRootHash]: 5681,
        },
        null,
        2,
      ),
      'utf-8',
    )

    expect(resolveInspectoServerBaseUrl(nestedCwd)).toBe('http://0.0.0.0:5681')
  })

  it('exposes the expected MCP tool definitions', () => {
    expect(INSPECTO_MCP_TOOLS.map(tool => tool.name)).toEqual([
      'inspecto_get_session',
      'inspecto_claim_next',
      'inspecto_reply',
      'inspecto_resolve',
      'inspecto_dismiss',
    ])
  })

  it('maps getSession and claimNext to the HTTP session endpoints', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, session: { id: 'session-1' } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          timedOut: false,
          matchedExisting: true,
          session: { id: 'session-claim', status: 'acknowledged' },
        }),
      } as Response)
    const runtime = createInspectoMcpRuntime('http://0.0.0.0:5678')

    const session = await runtime.getSession({ sessionId: 'session-1' })

    expect(fetchMock).toHaveBeenCalledWith('http://0.0.0.0:5678/inspecto/api/v1/sessions/session-1')
    expect(session).toEqual({ success: true, session: { id: 'session-1' } })

    const claim = await runtime.claimNext()

    expect(fetchMock).toHaveBeenCalledWith(
      'http://0.0.0.0:5678/inspecto/api/v1/sessions/claim',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
      }),
    )
    expect(claim).toEqual({
      success: true,
      timedOut: false,
      matchedExisting: true,
      session: { id: 'session-claim', status: 'acknowledged' },
    })
  })

  it('maps reply, resolve, and dismiss to session mutation endpoints', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, session: { id: 'session-1' } }),
    } as Response)
    const runtime = createInspectoMcpRuntime('http://0.0.0.0:5678')

    const reply = await runtime.reply({
      sessionId: 'session-1',
      text: 'Working on it.',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://0.0.0.0:5678/inspecto/api/v1/sessions/session-1/reply',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(reply).toEqual({ success: true, session: { id: 'session-1' } })

    const resolve = await runtime.resolve({
      sessionId: 'session-1',
      message: 'Done.',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://0.0.0.0:5678/inspecto/api/v1/sessions/session-1/resolve',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(resolve).toEqual({ success: true, session: { id: 'session-1' } })

    const dismiss = await runtime.dismiss({
      sessionId: 'session-1',
      message: 'No action needed.',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://0.0.0.0:5678/inspecto/api/v1/sessions/session-1/dismiss',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(dismiss).toEqual({ success: true, session: { id: 'session-1' } })
  })

  it('surfaces failed session mutations as rejected runtime calls', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: 'Session not found' }),
    } as Response)
    const runtime = createInspectoMcpRuntime('http://0.0.0.0:5678')

    await expect(
      runtime.reply({
        sessionId: 'missing-session',
        text: 'Working on it.',
      }),
    ).rejects.toThrow('Session not found')
  })

  it('surfaces direct session lookup failures as rejected runtime calls', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: 'Session not found' }),
    } as Response)
    const runtime = createInspectoMcpRuntime('http://0.0.0.0:5678')

    await expect(runtime.getSession({ sessionId: 'missing-session' })).rejects.toThrow(
      'Session not found',
    )
  })
})
