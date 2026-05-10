import { describe, it, expect, vi } from 'vitest'
import webpack from 'webpack'
import { webpackPlugin } from '../src/index.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { createFsFromVolume, Volume } from 'memfs'
import fs from 'node:fs'
import os from 'node:os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginPackageRoot = path.resolve(__dirname, '..')

vi.mock('../src/server/server-url.js', async () => {
  const actual = await vi.importActual<typeof import('../src/server/server-url.js')>(
    '../src/server/server-url.js',
  )
  return {
    ...actual,
    resolveServerHost: () => '127.0.0.1',
  }
})

vi.mock('../src/server/index.js', async () => {
  const actual =
    await vi.importActual<typeof import('../src/server/index.js')>('../src/server/index.js')
  return {
    ...actual,
    startServer: vi.fn(async () => 5678),
    serverState: {
      port: 5678,
      running: true,
      projectRoot: process.cwd(),
      configRoot: process.cwd(),
      cwd: process.cwd(),
    },
  }
})

const sanitizeSnapshot = (code: string) => {
  const rootDir = path.resolve(__dirname, '../../..')
  return code.replaceAll(rootDir, '<PROJECT_ROOT>').replace(/\\/g, '/')
}

describe('E2E Build Integration - Webpack', () => {
  it('should inject inspecto code correctly in a webpack build', async () => {
    const fixturePath = path.resolve(__dirname, './fixtures/react-app')

    const originalEnv = process.env.NODE_ENV
    const originalHome = process.env.HOME
    const isolatedHome = fs.mkdtempSync(path.join(os.tmpdir(), 'inspecto-plugin-home-'))
    process.env.NODE_ENV = 'development'
    process.env.HOME = isolatedHome
    fs.mkdirSync(path.join(isolatedHome, '.inspecto'), { recursive: true })
    fs.writeFileSync(
      path.join(isolatedHome, '.inspecto', 'settings.json'),
      JSON.stringify({ 'server.host': '127.0.0.1' }, null, 2),
      'utf-8',
    )

    try {
      const compiler = webpack({
        mode: 'development',
        entry: path.join(fixturePath, 'src/main.tsx'),
        output: {
          path: '/dist',
          filename: 'bundle.js',
        },
        resolve: {
          extensions: ['.ts', '.tsx', '.js'],
        },
        module: {
          rules: [
            {
              test: /\.[jt]sx?$/,
              exclude: /node_modules/,
              use: {
                loader: require.resolve('babel-loader', { paths: [pluginPackageRoot] }),
                options: {
                  presets: [
                    '@babel/preset-env',
                    ['@babel/preset-react', { runtime: 'automatic' }],
                    '@babel/preset-typescript',
                  ],
                },
              },
            },
          ],
        },
        plugins: [webpackPlugin()],
        // Don't bundle react
        externals: {
          react: 'react',
          'react-dom/client': 'react-dom/client',
        },
      })

      // Use memfs to avoid writing to disk
      const fs = createFsFromVolume(new Volume())
      compiler.outputFileSystem = fs as any

      const _stats = await new Promise<webpack.Stats>((resolve, reject) => {
        compiler.run((err, stats) => {
          if (err) return reject(err)
          if (stats?.hasErrors()) return reject(new Error(stats.toString('errors-only')))
          resolve(stats!)
        })
      })

      const outputCode = fs.readFileSync('/dist/bundle.js', 'utf8') as string
      const sanitizedCode = sanitizeSnapshot(outputCode)

      // 1. Check if client is injected (Webpack plugin uses entry injection)
      expect(sanitizedCode).toContain('core/dist/index.cjs')

      // 2. Check if AST transform applied to JSX
      expect(sanitizedCode).toContain('data-inspecto')
      expect(sanitizedCode).toContain('fixtures/react-app/src/App.tsx:5:5')

      // Optional: Snapshot
      // expect(sanitizedCode).toMatchSnapshot()
    } finally {
      process.env.NODE_ENV = originalEnv
      process.env.HOME = originalHome
    }
  })
})
