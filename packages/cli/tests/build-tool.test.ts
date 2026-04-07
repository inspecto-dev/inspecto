import { describe, it, expect, beforeEach, vi } from 'vitest'
import { detectBuildTools } from '../src/detect/build-tool.js'
import * as fsUtils from '../src/utils/fs.js'

vi.mock('../src/utils/fs.js', () => ({
  exists: vi.fn(),
  readJSON: vi.fn(),
  readFile: vi.fn(),
}))

describe('detectBuildTools', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('detects Vite config inside a specified package path', async () => {
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath.includes('packages/app/package.json')) {
        return { devDependencies: { vite: '^5.0.0' } }
      }
      if (filePath.endsWith('/package.json')) {
        return {}
      }
      return null
    })

    vi.mocked(fsUtils.exists).mockImplementation(async filePath =>
      filePath.includes('packages/app/vite.config.ts'),
    )

    const result = await detectBuildTools('/repo', ['packages/app'])
    expect(result.supported.some(det => det.tool === 'vite')).toBe(true)
  })

  it('detects vite.config.cjs at the repo root', async () => {
    vi.mocked(fsUtils.readJSON).mockResolvedValue({ devDependencies: { vite: '^5.0.0' } })
    vi.mocked(fsUtils.exists).mockImplementation(async filePath =>
      filePath.endsWith('vite.config.cjs'),
    )

    const result = await detectBuildTools('/repo')
    expect(result.supported.some(det => det.tool === 'vite')).toBe(true)
  })
})
