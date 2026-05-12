import { describe, expect, it } from 'vitest'
import {
  extractTransformFilePath,
  resolveTransformAttrPath,
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

  it('honors include globs when deciding whether to transform source files', () => {
    expect(
      shouldTransform('/repo/src/components/Button.tsx', {
        ...defaultOptions,
        include: ['src/components/**/*.tsx'],
      }),
    ).toBe(true)

    expect(
      shouldTransform('/repo/src/pages/Home.tsx', {
        ...defaultOptions,
        include: ['src/components/**/*.tsx'],
      }),
    ).toBe(false)
  })

  it('honors exclude globs after include matches', () => {
    expect(
      shouldTransform('/repo/src/components/Button.stories.tsx', {
        ...defaultOptions,
        include: ['src/**/*.tsx'],
        exclude: ['**/*.stories.tsx'],
      }),
    ).toBe(false)
  })

  it('supports brace globs used by documented include patterns', () => {
    expect(
      shouldTransform('/repo/src/App.vue', {
        ...defaultOptions,
        include: ['**/*.{js,jsx,ts,tsx,vue}'],
      }),
    ).toBe(true)
  })

  it('matches include and exclude globs relative to the project root', () => {
    expect(
      shouldTransform(
        '/repo/packages/ui/src/Button.tsx',
        {
          ...defaultOptions,
          include: ['packages/*/src/**/*.tsx'],
        },
        '/repo',
      ),
    ).toBe(true)

    expect(
      shouldTransform(
        '/repo/packages/ui/src/generated/Icon.tsx',
        {
          ...defaultOptions,
          include: ['packages/*/src/**/*.tsx'],
          exclude: ['packages/*/src/generated/**'],
        },
        '/repo',
      ),
    ).toBe(false)
  })

  it('supports legacy RegExp include and exclude patterns', () => {
    expect(
      shouldTransform('/repo/src/App.tsx', {
        ...defaultOptions,
        include: [/\.[jt]sx?$/],
      }),
    ).toBe(true)

    expect(
      shouldTransform('/repo/node_modules/pkg/App.tsx', {
        ...defaultOptions,
        include: [/\.[jt]sx?$/],
        exclude: [/node_modules/],
      }),
    ).toBe(false)
  })

  it('treats stateful RegExp include patterns consistently across repeated calls', () => {
    const include = [/\.tsx$/g]
    const options = {
      ...defaultOptions,
      include,
    }

    expect(shouldTransform('/repo/src/App.tsx', options)).toBe(true)
    expect(shouldTransform('/repo/src/App.tsx', options)).toBe(true)
  })
})

describe('resolveTransformAttrPath', () => {
  it('resolves relative paths and normalizes Windows separators', () => {
    expect(
      resolveTransformAttrPath({
        filePath: 'C:\\Users\\dev\\project\\src\\Card.svelte',
        projectRoot: 'C:\\Users\\dev\\project',
        pathType: 'relative',
      }),
    ).toBe('src/Card.svelte')
  })

  it('resolves relative file paths from projectRoot for absolute output', () => {
    expect(
      resolveTransformAttrPath({
        filePath: 'src/App.tsx',
        projectRoot: '/repo',
        pathType: 'absolute',
      }),
    ).toBe('/repo/src/App.tsx')
  })

  it('resolves relative file paths from projectRoot for relative output', () => {
    expect(
      resolveTransformAttrPath({
        filePath: 'src/App.tsx',
        projectRoot: '/repo',
        pathType: 'relative',
      }),
    ).toBe('src/App.tsx')
  })
})
