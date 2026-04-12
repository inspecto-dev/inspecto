import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fsUtils from '../src/utils/fs.js'
import * as gitignoreUtils from '../src/inject/gitignore.js'
import { devLink, devStatus, devUnlink } from '../src/commands/dev-config.js'

vi.mock('../src/utils/fs.js', () => ({
  exists: vi.fn(),
  readJSON: vi.fn(),
  removeFile: vi.fn(),
  writeJSON: vi.fn(),
}))

vi.mock('../src/inject/gitignore.js', () => ({
  updateGitignore: vi.fn(),
}))

describe('dev config commands', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(process, 'cwd').mockReturnValue('/repo')
  })

  it('writes cliBin into .inspecto/dev.json', async () => {
    vi.mocked(fsUtils.readJSON).mockResolvedValue(null)

    const result = await devLink({ cliBin: '/tmp/inspecto/bin.js', json: true })

    expect(gitignoreUtils.updateGitignore).toHaveBeenCalledWith('/repo', false, false, true)
    expect(fsUtils.writeJSON).toHaveBeenCalledWith('/repo/.inspecto/dev.json', {
      cliBin: '/tmp/inspecto/bin.js',
    })
    expect(result.config).toEqual({ cliBin: '/tmp/inspecto/bin.js' })
  })

  it('writes devRepo into .inspecto/dev.json', async () => {
    vi.mocked(fsUtils.readJSON).mockResolvedValue({ cliBin: '/tmp/old.js' })

    const result = await devLink({ devRepo: '/tmp/inspecto', json: true })

    expect(gitignoreUtils.updateGitignore).toHaveBeenCalledWith('/repo', false, false, true)
    expect(fsUtils.writeJSON).toHaveBeenCalledWith('/repo/.inspecto/dev.json', {
      cliBin: '/tmp/old.js',
      devRepo: '/tmp/inspecto',
    })
    expect(result.config).toEqual({
      cliBin: '/tmp/old.js',
      devRepo: '/tmp/inspecto',
    })
  })

  it('returns current dev config status', async () => {
    vi.mocked(fsUtils.exists).mockResolvedValue(true)
    vi.mocked(fsUtils.readJSON).mockResolvedValue({
      cliBin: '/tmp/inspecto/bin.js',
      devRepo: '/tmp/inspecto',
    })

    const result = await devStatus(true)

    expect(result.status).toBe('ok')
    expect(result.config).toEqual({
      cliBin: '/tmp/inspecto/bin.js',
      devRepo: '/tmp/inspecto',
    })
  })

  it('clears the dev config on unlink', async () => {
    const result = await devUnlink(true)

    expect(fsUtils.removeFile).toHaveBeenCalledWith('/repo/.inspecto/dev.json')
    expect(result.status).toBe('ok')
  })
})
