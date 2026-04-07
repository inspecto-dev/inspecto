import { describe, it, expect, beforeEach, vi } from 'vitest'
import crypto from 'node:crypto'
import {
  vscodeMock,
  resetVscodeMocks,
  setMockWorkspaceFolders,
  setMockActiveEditor,
} from './vscode-mock'

vi.mock('vscode', () => vscodeMock)

const uriHandlerMocks = vi.hoisted(() => ({
  executeWithFallback: vi.fn(),
  filterChannels: vi.fn((channels: unknown[]) => channels),
  getStrategy: vi.fn(() => ({
    channels: [{ type: 'extension', execute: vi.fn() }],
  })),
}))

vi.mock('../src/fallback-chain', () => ({
  executeWithFallback: uriHandlerMocks.executeWithFallback,
  AllChannelsFailedError: class AllChannelsFailedError extends Error {
    constructor(public readonly attempts: { type: string; error: unknown }[] = []) {
      super('All channels failed')
      this.name = 'AllChannelsFailedError'
    }
  },
  filterChannels: uriHandlerMocks.filterChannels,
}))

vi.mock('../src/strategies/index', () => ({
  getStrategy: uriHandlerMocks.getStrategy,
}))

const mockFs = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  watch: vi.fn(),
}))
vi.mock('node:fs', () => mockFs)
vi.mock('node:os', () => ({ tmpdir: () => '/tmp' }))

import { resolveServerPorts, __testingGetPreferredWorkspaceRoot } from '../src/extension.ts'
import { InspectoUriHandler } from '../src/uri-handler.ts'

describe('resolveServerPorts', () => {
  beforeEach(() => {
    resetVscodeMocks()
    mockFs.readFileSync.mockReset()
    mockFs.existsSync.mockReset()
    mockFs.watch.mockReset()
    uriHandlerMocks.executeWithFallback.mockReset()
    uriHandlerMocks.filterChannels.mockClear()
    uriHandlerMocks.getStrategy.mockClear()
    vi.unstubAllGlobals()
  })

  it('prioritizes ports that match workspace roots', () => {
    setMockWorkspaceFolders(['/repo/app', '/repo/admin'])
    const portData: Record<string, number> = {}
    const rootA = crypto.createHash('md5').update('/repo/app').digest('hex')
    portData[rootA] = 6000
    const rootB = crypto.createHash('md5').update('/repo/admin').digest('hex')
    portData[rootB] = 6001
    mockFs.readFileSync.mockReturnValueOnce(JSON.stringify(portData))

    const ports = resolveServerPorts()
    expect(ports.slice(0, 2)).toEqual([6000, 6001])
  })

  it('prefers workspace containing .inspecto even if active editor is elsewhere', () => {
    setMockWorkspaceFolders(['/repo/tea', '/repo/inspecto'])
    setMockActiveEditor('/repo/tea/src/index.ts')
    mockFs.readFileSync.mockReturnValueOnce('{}')
    mockFs.existsSync.mockImplementation(p => String(p).includes('/repo/inspecto/.inspecto'))

    const picked = __testingGetPreferredWorkspaceRoot()
    expect(picked).toBe('/repo/inspecto')
  })

  it('preserves screenshot context when loading a ticket payload', async () => {
    const handler = new InspectoUriHandler('vscode')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ide: 'vscode',
        target: 'copilot',
        targetType: 'extension',
        prompt: 'Review this UI',
        screenshotContext: {
          enabled: true,
          capturedAt: '2026-04-04T12:00:00.000Z',
          mimeType: 'image/png',
          imageDataUrl: 'data:image/png;base64,AAA=',
        },
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    await handler.handleUri({
      query: 'target=copilot&ticket=test-ticket',
      toString: () => 'vscode://inspecto.inspecto/send?target=copilot&ticket=test-ticket',
    } as any)

    expect(fetchMock).toHaveBeenCalled()
    expect(uriHandlerMocks.executeWithFallback).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        prompt: 'Review this UI',
        screenshotContext: expect.objectContaining({ mimeType: 'image/png' }),
      }),
    )
  })

  it('ignores direct onboarding URIs that target a different workspace', async () => {
    setMockWorkspaceFolders(['/repo/current'])
    const handler = new InspectoUriHandler('vscode')

    await handler.handleUri({
      query:
        'target=codex&prompt=Set+up+Inspecto+in+this+project&workspace=%2Frepo%2Fother&overrides=%7B%22type%22%3A%22cli%22%7D',
      toString: () =>
        'vscode://inspecto.inspecto/send?target=codex&prompt=Set+up+Inspecto+in+this+project&workspace=%2Frepo%2Fother',
    } as any)

    expect(uriHandlerMocks.executeWithFallback).not.toHaveBeenCalled()
  })

  it('dispatches direct onboarding URIs when the workspace matches the current window', async () => {
    setMockWorkspaceFolders(['/repo/current'])
    const handler = new InspectoUriHandler('vscode')

    await handler.handleUri({
      query:
        'target=codex&prompt=Set+up+Inspecto+in+this+project&workspace=%2Frepo%2Fcurrent&overrides=%7B%22type%22%3A%22cli%22%7D',
      toString: () =>
        'vscode://inspecto.inspecto/send?target=codex&prompt=Set+up+Inspecto+in+this+project&workspace=%2Frepo%2Fcurrent',
    } as any)

    expect(uriHandlerMocks.executeWithFallback).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        prompt: 'Set up Inspecto in this project',
        target: 'codex',
      }),
    )
  })

  it('uses a real vscode.Uri when matching direct onboarding workspaces', async () => {
    setMockWorkspaceFolders(['/repo/current'])
    vscodeMock.workspace.getWorkspaceFolder.mockImplementation(uri => {
      if (!uri || typeof uri.fsPath !== 'string') {
        throw new Error('invalid uri')
      }
      return uri.fsPath === '/repo/current' ? { uri: { fsPath: '/repo/current' } } : undefined
    })

    const handler = new InspectoUriHandler('vscode')

    await handler.handleUri({
      query:
        'target=codex&prompt=Set+up+Inspecto+in+this+project&workspace=%2Frepo%2Fcurrent&overrides=%7B%22type%22%3A%22cli%22%7D',
      toString: () =>
        'vscode://inspecto.inspecto/send?target=codex&prompt=Set+up+Inspecto+in+this+project&workspace=%2Frepo%2Fcurrent',
    } as any)

    expect(vscodeMock.Uri.file).toHaveBeenCalledWith('/repo/current')
    expect(uriHandlerMocks.executeWithFallback).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        prompt: 'Set up Inspecto in this project',
        target: 'codex',
      }),
    )
  })
})
