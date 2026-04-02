import { describe, it, expect, beforeEach, vi } from 'vitest'
import crypto from 'node:crypto'
import {
  vscodeMock,
  resetVscodeMocks,
  setMockWorkspaceFolders,
  setMockActiveEditor,
} from './vscode-mock'

vi.mock('vscode', () => vscodeMock)

const mockFs = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  watch: vi.fn(),
}))
vi.mock('node:fs', () => mockFs)
vi.mock('node:os', () => ({ tmpdir: () => '/tmp' }))

import { resolveServerPorts, __testingGetPreferredWorkspaceRoot } from '../src/extension.ts'

describe('resolveServerPorts', () => {
  beforeEach(() => {
    resetVscodeMocks()
    mockFs.readFileSync.mockReset()
    mockFs.existsSync.mockReset()
    mockFs.watch.mockReset()
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
})
