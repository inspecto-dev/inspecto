import fs from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { detectBuildTools } from '../src/detect/build-tool.js'
import * as fsUtils from '../src/utils/fs.js'

vi.mock('node:fs/promises', () => ({
  default: {
    readdir: vi.fn(),
  },
}))

vi.mock('../src/utils/fs.js', () => ({
  exists: vi.fn(),
  readJSON: vi.fn(),
  readFile: vi.fn(),
}))

describe('detectBuildTools in monorepo roots', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'web', isDirectory: () => true },
      { name: 'docs', isDirectory: () => true },
    ] as any)
  })

  it('detects supported configs inside workspace packages when run from the monorepo root', async () => {
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath === '/mock/root/package.json') {
        return {}
      }

      if (filePath === '/mock/root/apps/web/package.json') {
        return { devDependencies: { vite: '^5.0.0' } }
      }

      if (filePath === '/mock/root/apps/docs/package.json') {
        return { dependencies: { next: '^15.0.0' } }
      }

      return null
    })

    vi.mocked(fsUtils.readFile).mockImplementation(async filePath => {
      if (filePath === '/mock/root/pnpm-workspace.yaml') {
        return "packages:\n  - 'apps/*'\n"
      }

      return null
    })

    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return (
        filePath === '/mock/root/apps' ||
        filePath === '/mock/root/apps/web' ||
        filePath === '/mock/root/apps/docs' ||
        filePath === '/mock/root/apps/web/package.json' ||
        filePath === '/mock/root/apps/docs/package.json' ||
        filePath === '/mock/root/apps/web/vite.config.ts' ||
        filePath === '/mock/root/apps/docs/next.config.ts'
      )
    })

    const result = await detectBuildTools('/mock/root')

    expect(result.supported).toContainEqual(
      expect.objectContaining({
        tool: 'vite',
        configPath: 'apps/web/vite.config.ts',
        packagePath: 'apps/web',
      }),
    )
    expect(result.unsupported).toContain('Next.js')
  })
})
