import { beforeEach, describe, expect, it, vi } from 'vitest'
import { injectPlugin } from '../src/inject/ast-injector.js'
import * as fsUtils from '../src/utils/fs.js'
import { log } from '../src/utils/logger.js'

vi.mock('../src/utils/fs.js', () => ({
  exists: vi.fn(),
  readFile: vi.fn(),
}))

vi.mock('../src/utils/logger.js', () => ({
  log: {
    warn: vi.fn(),
    hint: vi.fn(),
    blank: vi.fn(),
    error: vi.fn(),
    copyableCodeBlock: vi.fn(),
    success: vi.fn(),
    dryRun: vi.fn(),
  },
}))

vi.mock('magicast', () => ({
  loadFile: vi.fn(),
  writeFile: vi.fn(),
}))

describe('injectPlugin manual instructions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('prints copyable manual instructions when automatic config cannot read the config file', async () => {
    vi.mocked(fsUtils.readFile).mockResolvedValue(null)

    await injectPlugin(
      '/repo',
      {
        tool: 'vite',
        configPath: 'vite.config.ts',
        label: 'Vite (vite.config.ts)',
      },
      false,
    )

    expect(log.copyableCodeBlock).toHaveBeenCalledWith(
      expect.arrayContaining(["import { vitePlugin as inspecto } from '@inspecto-dev/plugin'"]),
    )
  })
})
