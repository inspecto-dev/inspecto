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

  it('marks rspack versions below 0.4.0 as legacy', async () => {
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath.includes('package.json')) {
        return { devDependencies: { '@rspack/core': '^0.3.14' } }
      }
      return null
    })

    vi.mocked(fsUtils.exists).mockImplementation(async filePath =>
      filePath.endsWith('rspack.config.ts'),
    )

    const result = await detectBuildTools('/repo')
    expect(result.supported).toContainEqual(
      expect.objectContaining({
        tool: 'rspack',
        isLegacyRspack: true,
      }),
    )
  })

  it('treats ranged rspack versions below 0.4.0 as legacy', async () => {
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath.includes('package.json')) {
        return { devDependencies: { '@rspack/core': '>=0.3.0 <0.4.0' } }
      }
      return null
    })

    vi.mocked(fsUtils.exists).mockImplementation(async filePath =>
      filePath.endsWith('rspack.config.ts'),
    )

    const result = await detectBuildTools('/repo')
    expect(result.supported).toContainEqual(
      expect.objectContaining({
        tool: 'rspack',
        isLegacyRspack: true,
      }),
    )
  })

  it('treats webpack 4 tilde ranges as legacy', async () => {
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath.includes('package.json')) {
        return { devDependencies: { webpack: '~4.46.0' } }
      }
      return null
    })

    vi.mocked(fsUtils.exists).mockImplementation(async filePath =>
      filePath.endsWith('webpack.config.js'),
    )

    const result = await detectBuildTools('/repo')
    expect(result.supported).toContainEqual(
      expect.objectContaining({
        tool: 'webpack',
        isLegacyWebpack: true,
      }),
    )
  })

  it('resolves the real rspack config path from a script entrypoint', async () => {
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath.includes('package.json')) {
        return {
          devDependencies: { '@rspack/core': '^0.3.14' },
          scripts: { dev: 'node ./rspack-scripts/dev/start.js dev' },
        }
      }
      return null
    })

    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return (
        filePath.endsWith('rspack-scripts/dev/start.js') ||
        filePath.endsWith('rspack-config/rspack.config.dev.ts')
      )
    })

    vi.mocked(fsUtils.readFile).mockImplementation(async filePath => {
      if (filePath.endsWith('rspack-scripts/dev/start.js')) {
        return "const configPath = path.resolve(__dirname, '../../rspack-config/rspack.config.dev.ts')"
      }
      return null
    })

    const result = await detectBuildTools('/repo', ['finder'])
    expect(result.supported).toContainEqual(
      expect.objectContaining({
        tool: 'rspack',
        configPath: 'finder/rspack-config/rspack.config.dev.ts',
        isLegacyRspack: true,
      }),
    )
  })

  it('resolves the real rspack config path from rspack serve -c inside a script wrapper', async () => {
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath.includes('package.json')) {
        return {
          devDependencies: { '@rspack/core': '^0.3.14' },
          scripts: { dev: 'node ./rspack-scripts/dev/start.js dev' },
        }
      }
      return null
    })

    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return (
        filePath.endsWith('rspack-scripts/dev/start.js') ||
        filePath.endsWith('rspack-config/rspack.config.dev.ts')
      )
    })

    vi.mocked(fsUtils.readFile).mockImplementation(async filePath => {
      if (filePath.endsWith('rspack-scripts/dev/start.js')) {
        return 'const cli = `NODE_ENV=development rspack serve -c ./rspack-config/rspack.config.dev.ts`'
      }
      return null
    })

    const result = await detectBuildTools('/repo', ['finder'])
    expect(result.supported).toContainEqual(
      expect.objectContaining({
        tool: 'rspack',
        configPath: 'finder/rspack-config/rspack.config.dev.ts',
        isLegacyRspack: true,
      }),
    )
  })

  it('prefers the dev webpack script and resolves a shared webpack base config', async () => {
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath.includes('package.json')) {
        return {
          devDependencies: { webpack: '^4.46.0', 'webpack-cli': '^3.0.8' },
          scripts: {
            dll_dev: 'webpack --config webpack.dll.config.js',
            start:
              'node ./node_modules/.bin/webpack-dev-server --hot --inline --progress --config webpack.config.esbuild.js',
            prod: 'node ./node_modules/.bin/webpack --config webpack.config.prod.js',
          },
        }
      }
      return null
    })

    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return (
        filePath.endsWith('webpack.config.esbuild.js') ||
        filePath.endsWith('webpack.config.common.js') ||
        filePath.endsWith('webpack.dll.config.js')
      )
    })

    vi.mocked(fsUtils.readFile).mockImplementation(async filePath => {
      if (filePath.endsWith('webpack.config.esbuild.js')) {
        return "const configPath = './webpack.config.common.js'; const devConfig = require(configPath);"
      }
      return null
    })

    const result = await detectBuildTools('/repo')
    expect(result.supported).toContainEqual(
      expect.objectContaining({
        tool: 'webpack',
        configPath: 'webpack.config.common.js',
        isLegacyWebpack: true,
      }),
    )
  })

  it('detects webpack.config.common.js without relying on package scripts', async () => {
    vi.mocked(fsUtils.readJSON).mockImplementation(async filePath => {
      if (filePath.includes('package.json')) {
        return {
          devDependencies: { webpack: '^4.46.0', 'webpack-cli': '^3.0.8' },
          scripts: {},
        }
      }
      return null
    })

    vi.mocked(fsUtils.exists).mockImplementation(async filePath => {
      return filePath.endsWith('webpack.config.common.js')
    })

    const result = await detectBuildTools('/repo')
    expect(result.supported).toContainEqual(
      expect.objectContaining({
        tool: 'webpack',
        configPath: 'webpack.config.common.js',
        isLegacyWebpack: true,
      }),
    )
  })
})
