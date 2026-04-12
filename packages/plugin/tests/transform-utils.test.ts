import { describe, expect, it } from 'vitest'
import {
  extractTransformFilePath,
  shouldTransform,
  type NormalizedTransformTarget,
} from '../src/transform/utils.js'

const defaultOptions = {
  include: [],
  exclude: [],
  escapeTags: [],
  pathType: 'absolute' as const,
  attributeName: 'data-inspecto',
  logLevel: 'warn' as const,
}

describe('extractTransformFilePath', () => {
  it('extracts the original source file from Next.js loader requests', () => {
    const nextLoaderRequest =
      '/repo/node_modules/.pnpm/next@16.2.3/node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?modules=%7B%22request%22%3A%22%2Frepo%2Fsrc%2Fapp%2Flayout.tsx%22%2C%22ids%22%3A%5B%22default%22%5D%7D&server=false!'

    expect(extractTransformFilePath(nextLoaderRequest)).toEqual<NormalizedTransformTarget>({
      requestId: nextLoaderRequest,
      filePath: '/repo/src/app/layout.tsx',
      wrapped: true,
    })
  })

  it('keeps normal source file ids unchanged', () => {
    expect(extractTransformFilePath('/repo/src/app/page.tsx')).toEqual<NormalizedTransformTarget>({
      requestId: '/repo/src/app/page.tsx',
      filePath: '/repo/src/app/page.tsx',
      wrapped: false,
    })
  })
})

describe('shouldTransform', () => {
  it('does not reject extracted Next.js source files just because the loader id contains node_modules', () => {
    const nextLoaderRequest =
      '/repo/node_modules/.pnpm/next@16.2.3/node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?modules=%7B%22request%22%3A%22%2Frepo%2Fsrc%2Fapp%2Flayout.tsx%22%2C%22ids%22%3A%5B%22default%22%5D%7D&server=false!'

    expect(shouldTransform(nextLoaderRequest, defaultOptions)).toBe(true)
  })
})
