import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/config.js', () => ({
  getGlobalLogLevel: vi.fn(() => 'silent'),
  watchConfig: vi.fn(),
  unwatchConfig: vi.fn(),
}))

describe('server port file cleanup', () => {
  const portFile = path.join(os.tmpdir(), 'inspecto.port.json')
  let originalPortFile: string | null = null

  beforeEach(() => {
    vi.resetModules()
    originalPortFile = fs.existsSync(portFile) ? fs.readFileSync(portFile, 'utf-8') : null
    try {
      fs.unlinkSync(portFile)
    } catch {
      // ignore
    }
  })

  afterEach(() => {
    try {
      fs.unlinkSync(portFile)
    } catch {
      // ignore
    }
    if (originalPortFile !== null) {
      fs.writeFileSync(portFile, originalPortFile, 'utf-8')
    }
  })

  it('removes only the current project entry from inspecto.port.json on stop', async () => {
    const { serverState, stopServer } = await import('../src/server/index.js')
    const currentRoot = '/repo/current'
    const otherRoot = '/repo/other'
    const currentHash = crypto.createHash('md5').update(currentRoot).digest('hex')
    const otherHash = crypto.createHash('md5').update(otherRoot).digest('hex')

    serverState.projectRoot = currentRoot
    fs.writeFileSync(
      portFile,
      JSON.stringify(
        {
          [currentHash]: 5678,
          [otherHash]: 5679,
        },
        null,
        2,
      ),
      'utf-8',
    )

    stopServer()

    expect(JSON.parse(fs.readFileSync(portFile, 'utf-8'))).toEqual({
      [otherHash]: 5679,
    })
  })

  it('deletes inspecto.port.json when the current project is the last entry', async () => {
    const { serverState, stopServer } = await import('../src/server/index.js')
    const currentRoot = '/repo/current'
    const currentHash = crypto.createHash('md5').update(currentRoot).digest('hex')

    serverState.projectRoot = currentRoot
    fs.writeFileSync(portFile, JSON.stringify({ [currentHash]: 5678 }, null, 2), 'utf-8')

    stopServer()

    expect(fs.existsSync(portFile)).toBe(false)
  })
})
