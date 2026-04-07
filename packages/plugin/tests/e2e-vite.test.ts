import { describe, it, expect } from 'vitest'
import { build } from 'vite'
import { vitePlugin } from '../src/index.js'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Helper to remove absolute paths from snapshots
const sanitizeSnapshot = (code: string) => {
  const rootDir = path.resolve(__dirname, '../../..')
  return code.replaceAll(rootDir, '<PROJECT_ROOT>').replace(/\\/g, '/')
}

describe('E2E Build Integration - Vite', () => {
  it('should inject inspecto code and attributes correctly in a React build', async () => {
    const fixturePath = path.resolve(__dirname, './fixtures/react-app')

    // Force development mode since the plugin skips production
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    try {
      const result = await build({
        root: fixturePath,
        plugins: [react(), vitePlugin()],
        build: {
          write: false,
          minify: false,
          rollupOptions: {
            external: ['react', 'react-dom/client'], // Don't bundle react itself
          },
        },
        logLevel: 'silent',
      })

      const output = (result as any).output || (result as any)[0]?.output
      const mainChunk = output.find(
        (chunk: any) => chunk.type === 'chunk' && chunk.fileName.endsWith('.js'),
      )

      expect(mainChunk).toBeDefined()

      const code = mainChunk.code
      const sanitizedCode = sanitizeSnapshot(code)

      // 1. Assert: Core Client is imported (since it's a virtual module in Vite)
      // Because it's a pure build without server, the transformIndexHtml won't run,
      // but the AST transformation should work.

      // 2. Assert: AST transformation works and injects data-inspecto
      expect(sanitizedCode).toContain('data-inspecto')
      expect(sanitizedCode).toContain('fixtures/react-app/src/App.tsx:5:5') // <div className="app-container">

      // Save a snapshot of the component
      expect(sanitizedCode).toMatchSnapshot()
    } finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  it('should inject inspecto attributes correctly in a Vue build', async () => {
    const fixturePath = path.resolve(__dirname, './fixtures/vue-app')

    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    try {
      const result = await build({
        root: fixturePath,
        plugins: [vue(), vitePlugin()],
        build: {
          write: false,
          minify: false,
          rollupOptions: {
            external: ['vue'],
          },
        },
        logLevel: 'silent',
      })

      const output = (result as any).output || (result as any)[0]?.output
      const mainChunk = output.find(
        (chunk: any) => chunk.type === 'chunk' && chunk.fileName.endsWith('.js'),
      )

      expect(mainChunk).toBeDefined()

      const code = mainChunk.code
      const sanitizedCode = sanitizeSnapshot(code)

      // Assert: AST transformation works and injects data-inspecto for Vue
      expect(sanitizedCode).toContain('data-inspecto')
      expect(sanitizedCode).toContain('fixtures/vue-app/src/App.vue:2:3') // <div class="vue-app">

      expect(sanitizedCode).toMatchSnapshot()
    } finally {
      process.env.NODE_ENV = originalEnv
    }
  })
})
