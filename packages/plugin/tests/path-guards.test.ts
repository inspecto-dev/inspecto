import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'

vi.mock('node:fs', async () => {
  const actualFs = await vi.importActual<typeof import('node:fs')>('node:fs')
  const existsSync = vi.fn()
  const realpathSync = vi.fn()
  const readFileSync = vi.fn()
  return {
    ...actualFs,
    default: {
      ...actualFs,
      existsSync,
      realpathSync,
      readFileSync,
    },
    existsSync,
    realpathSync,
    readFileSync,
  }
})

describe('path guards', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  it('allows workspace-local symlinked package paths even when the real path resolves outside the workspace', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.realpathSync).mockImplementation(pathValue => {
      const filePath = String(pathValue)
      if (filePath === '/repo/node_modules/@inspecto-dev/core/dist/index.js') {
        return '/Users/dev/inspecto/packages/core/dist/index.js'
      }
      if (filePath === '/repo') {
        return '/repo'
      }
      return filePath
    })

    const { assertPathWithinProject } = await import('../src/server/path-guards.js')

    expect(() =>
      assertPathWithinProject('/repo/node_modules/@inspecto-dev/core/dist/index.js', '/repo'),
    ).not.toThrow()
  })

  it('allows ordinary workspace-local files', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.realpathSync).mockImplementation(pathValue => String(pathValue))

    const { assertPathWithinProject } = await import('../src/server/path-guards.js')

    expect(() => assertPathWithinProject('/repo/src/App.tsx', '/repo')).not.toThrow()
  })

  it('still blocks unrelated absolute paths outside the workspace', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.realpathSync).mockImplementation(pathValue => String(pathValue))

    const { assertPathWithinProject } = await import('../src/server/path-guards.js')

    expect(() => assertPathWithinProject('/etc/passwd', '/repo')).toThrow(
      /outside of project workspace/,
    )
  })

  it('allows opening files from linked dependencies that are reachable through workspace node_modules', async () => {
    vi.mocked(fs.existsSync).mockImplementation(pathValue => {
      const filePath = String(pathValue)
      return (
        filePath === '/Users/dev/inspecto/packages/core/src/menu.ts' ||
        filePath === '/repo' ||
        filePath === '/Users/dev/inspecto/packages/core/package.json' ||
        filePath === '/repo/node_modules/@inspecto-dev/core'
      )
    })
    vi.mocked(fs.realpathSync).mockImplementation(pathValue => {
      const filePath = String(pathValue)
      if (filePath === '/repo/node_modules/@inspecto-dev/core') {
        return '/Users/dev/inspecto/packages/core'
      }
      return filePath
    })
    vi.mocked(fs.readFileSync).mockImplementation(pathValue => {
      if (String(pathValue) === '/Users/dev/inspecto/packages/core/package.json') {
        return JSON.stringify({ name: '@inspecto-dev/core' })
      }
      throw new Error(`Unexpected read: ${String(pathValue)}`)
    })

    const { assertPathWithinIdeOpenScope } = await import('../src/server/path-guards.js')

    expect(() =>
      assertPathWithinIdeOpenScope('/Users/dev/inspecto/packages/core/src/menu.ts', '/repo'),
    ).not.toThrow()
  })

  it('allows opening files from locally installed packages when the package name matches an installed dependency', async () => {
    vi.mocked(fs.existsSync).mockImplementation(pathValue => {
      const filePath = String(pathValue)
      return (
        filePath === '/Users/dev/inspecto/packages/plugin/src/index.ts' ||
        filePath === '/Users/dev/inspecto/packages/plugin/package.json' ||
        filePath === '/repo/node_modules/@inspecto-dev/plugin'
      )
    })
    vi.mocked(fs.realpathSync).mockImplementation(pathValue => {
      const filePath = String(pathValue)
      if (filePath === '/repo/node_modules/@inspecto-dev/plugin') {
        return '/Users/dev/inspecto/packages/plugin'
      }
      return filePath
    })
    vi.mocked(fs.readFileSync).mockImplementation(pathValue => {
      if (String(pathValue) === '/Users/dev/inspecto/packages/plugin/package.json') {
        return JSON.stringify({ name: '@inspecto-dev/plugin' })
      }
      throw new Error(`Unexpected read: ${String(pathValue)}`)
    })

    const { assertPathWithinIdeOpenScope } = await import('../src/server/path-guards.js')

    expect(() =>
      assertPathWithinIdeOpenScope('/Users/dev/inspecto/packages/plugin/src/index.ts', '/repo'),
    ).not.toThrow()
  })

  it('still blocks unrelated external package roots even if they spoof an installed dependency name', async () => {
    vi.mocked(fs.existsSync).mockImplementation(pathValue => {
      const filePath = String(pathValue)
      return (
        filePath === '/tmp/evil/plugin/src/index.ts' ||
        filePath === '/tmp/evil/plugin/package.json' ||
        filePath === '/repo/node_modules/@inspecto-dev/plugin'
      )
    })
    vi.mocked(fs.realpathSync).mockImplementation(pathValue => String(pathValue))
    vi.mocked(fs.readFileSync).mockImplementation(pathValue => {
      if (String(pathValue) === '/tmp/evil/plugin/package.json') {
        return JSON.stringify({ name: '@inspecto-dev/plugin' })
      }
      throw new Error(`Unexpected read: ${String(pathValue)}`)
    })

    const { assertPathWithinIdeOpenScope } = await import('../src/server/path-guards.js')

    expect(() => assertPathWithinIdeOpenScope('/tmp/evil/plugin/src/index.ts', '/repo')).toThrow(
      /outside of project workspace/,
    )
  })
})
