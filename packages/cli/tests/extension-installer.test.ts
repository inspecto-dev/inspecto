import { beforeEach, describe, expect, it, vi } from 'vitest'

const runMock = vi.fn()
const shellMock = vi.fn()
const whichMock = vi.fn()
const existsMock = vi.fn()
const logMock = {
  dryRun: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  hint: vi.fn(),
}

vi.mock('../src/utils/exec.js', () => ({
  run: runMock,
  shell: shellMock,
  which: whichMock,
}))

vi.mock('../src/utils/fs.js', () => ({
  exists: existsMock,
}))

vi.mock('../src/utils/logger.js', () => ({
  log: logMock,
}))

describe('installExtension', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    shellMock.mockResolvedValue({ stdout: '', stderr: '' })
    existsMock.mockResolvedValue(false)
  })

  it('treats an already-installed Cursor extension as success instead of showing manual install hints', async () => {
    vi.stubEnv('TERM_PROGRAM', '')
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin')
    whichMock.mockImplementation(async bin => bin === 'cursor')
    runMock.mockImplementation(async (_command, args: string[]) => {
      if (args[0] === '--list-extensions') {
        return { stdout: 'inspecto.inspecto\n', stderr: '' }
      }
      throw new Error('install should not run when already installed')
    })

    const { installExtension } = await import('../src/inject/extension.js')

    await expect(installExtension(false, 'cursor')).resolves.toMatchObject({
      type: 'extension_installed',
      id: 'inspecto.inspecto',
    })

    expect(logMock.success).toHaveBeenCalledWith('Cursor extension already installed')
    expect(logMock.warn).not.toHaveBeenCalledWith('Could not auto-install extension for cursor')
    expect(runMock).toHaveBeenCalledWith('cursor', ['--list-extensions'])
  })

  it('installs the Trae CN extension via the app binary on macOS when available', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin')
    whichMock.mockResolvedValue(false)
    existsMock.mockImplementation(async filePath => {
      return filePath === '/Applications/Trae CN.app/Contents/Resources/app/bin/trae-cn'
    })
    runMock.mockImplementation(async (_command, args: string[]) => {
      if (args[0] === '--list-extensions') {
        return { stdout: '', stderr: '' }
      }
      if (args[0] === '--install-extension') {
        return { stdout: '', stderr: '' }
      }
      throw new Error(`unexpected args: ${args.join(' ')}`)
    })

    const { installExtension } = await import('../src/inject/extension.js')

    await expect(installExtension(false, 'trae-cn')).resolves.toMatchObject({
      type: 'extension_installed',
      id: 'inspecto.inspecto',
    })

    expect(runMock).toHaveBeenCalledWith(
      '/Applications/Trae CN.app/Contents/Resources/app/bin/trae-cn',
      ['--install-extension', 'inspecto.inspecto', '--force'],
    )
    expect(logMock.success).toHaveBeenCalledWith('Trae CN extension installed via CLI')
  })

  it('installs the Trae extension via PATH when available', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin')
    whichMock.mockImplementation(async bin => bin === 'trae')
    runMock.mockImplementation(async (_command, args: string[]) => {
      if (args[0] === '--list-extensions') {
        return { stdout: '', stderr: '' }
      }
      if (args[0] === '--install-extension') {
        return { stdout: '', stderr: '' }
      }
      throw new Error(`unexpected args: ${args.join(' ')}`)
    })

    const { installExtension } = await import('../src/inject/extension.js')

    await expect(installExtension(false, 'trae')).resolves.toMatchObject({
      type: 'extension_installed',
      id: 'inspecto.inspecto',
      description: 'installed_via_cli',
    })

    expect(runMock).toHaveBeenCalledWith('trae', [
      '--install-extension',
      'inspecto.inspecto',
      '--force',
    ])
    expect(logMock.success).toHaveBeenCalledWith('Trae extension installed via CLI')
  })

  it('installs a VSIX path in Trae CN when provided', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin')
    whichMock.mockImplementation(async bin => bin === 'trae-cn')
    runMock.mockImplementation(async (_command, args: string[]) => {
      if (args[0] === '--list-extensions') {
        return { stdout: '', stderr: '' }
      }
      if (args[0] === '--install-extension') {
        return { stdout: '', stderr: '' }
      }
      throw new Error(`unexpected args: ${args.join(' ')}`)
    })

    const { installExtension } = await import('../src/inject/extension.js')

    await expect(
      installExtension(false, 'trae-cn', true, '/tmp/inspecto.vsix'),
    ).resolves.toMatchObject({
      type: 'extension_installed',
      id: '/tmp/inspecto.vsix',
      description: 'installed_via_cli',
    })

    expect(runMock).toHaveBeenCalledWith('trae-cn', [
      '--install-extension',
      '/tmp/inspecto.vsix',
      '--force',
    ])
  })

  it('treats Trae CN as already installed when install fails but a follow-up extension check succeeds', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin')
    whichMock.mockResolvedValue(false)

    let listCalls = 0
    existsMock.mockImplementation(async filePath => {
      return filePath === '/Applications/Trae CN.app/Contents/Resources/app/bin/trae-cn'
    })
    runMock.mockImplementation(async (_command, args: string[]) => {
      if (args[0] === '--list-extensions') {
        listCalls += 1
        return {
          stdout: listCalls === 1 ? '' : 'inspecto.inspecto\n',
          stderr: '',
        }
      }
      if (args[0] === '--install-extension') {
        throw new Error('network failed')
      }
      throw new Error(`unexpected args: ${args.join(' ')}`)
    })

    const { installExtension } = await import('../src/inject/extension.js')

    await expect(installExtension(false, 'trae-cn')).resolves.toMatchObject({
      type: 'extension_installed',
      id: 'inspecto.inspecto',
    })

    expect(logMock.success).toHaveBeenCalledWith('Trae CN extension already installed')
    expect(logMock.warn).not.toHaveBeenCalledWith('Could not auto-install extension for trae-cn')
  })
})

describe('openIdeWorkspace', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    existsMock.mockResolvedValue(false)
  })

  it('opens Trae CN in a new window for the requested workspace', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin')
    whichMock.mockResolvedValue(false)
    existsMock.mockImplementation(async filePath => {
      return filePath === '/Applications/Trae CN.app/Contents/Resources/app/bin/trae-cn'
    })
    runMock.mockResolvedValue({ stdout: '', stderr: '' })

    const { openIdeWorkspace } = await import('../src/inject/extension.js')

    await expect(openIdeWorkspace('trae-cn', '/repo/app')).resolves.toBe(true)

    expect(runMock).toHaveBeenCalledWith(
      '/Applications/Trae CN.app/Contents/Resources/app/bin/trae-cn',
      ['--new-window', '/repo/app'],
    )
  })
})
