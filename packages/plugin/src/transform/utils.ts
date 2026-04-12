import type { UnpluginOptions } from '@inspecto-dev/types'
import type MagicString from 'magic-string'

export interface TransformResult {
  code: string
  map: ReturnType<MagicString['generateMap']> | null
  changed: boolean
}

export interface NormalizedTransformTarget {
  requestId: string
  filePath: string
  wrapped: boolean
}

/** Default tags whose JSX elements should NOT receive data-inspecto attributes */
export const DEFAULT_ESCAPE_TAGS = new Set([
  'template',
  'script',
  'style',
  // React special elements
  'Fragment',
  'React.Fragment',
  'StrictMode',
  'React.StrictMode',
  'Suspense',
  'React.Suspense',
  'Profiler',
  'React.Profiler',
  // React transitions
  'Transition',
  'TransitionGroup',
  // Vue built-in components
  'KeepAlive',
  'Teleport',
  'Suspense',
  // Vue router built-ins
  'RouterView',
  'RouterLink',
  'NuxtPage',
  'NuxtLink',
])

/** File extensions that contain JSX/TSX syntax */
export const JSX_EXTENSIONS = new Set(['.jsx', '.tsx', '.js', '.ts', '.mjs', '.mts'])

function normalizeWebpackModuleRequest(id: string): string {
  return id.replace(/!+$/, '').replace(/^\((?:app-pages-browser|rsc|ssr)\)\/\.\//, '')
}

function extractNextModuleRequest(id: string): string | undefined {
  if (!id.includes('next-flight-client-entry-loader.js?')) {
    return undefined
  }

  const queryIndex = id.indexOf('?')
  if (queryIndex === -1) {
    return undefined
  }

  const params = new URLSearchParams(id.slice(queryIndex + 1).replace(/!+$/, ''))
  for (const entry of params.getAll('modules')) {
    try {
      const parsed = JSON.parse(entry) as { request?: unknown }
      if (typeof parsed.request === 'string' && parsed.request.length > 0) {
        return parsed.request
      }
    } catch {
      continue
    }
  }

  return undefined
}

export function extractTransformFilePath(requestId: string): NormalizedTransformTarget {
  const normalizedRequestId = normalizeWebpackModuleRequest(requestId)
  const nextModuleRequest = extractNextModuleRequest(normalizedRequestId)
  if (nextModuleRequest) {
    return {
      requestId,
      filePath: nextModuleRequest,
      wrapped: true,
    }
  }

  const lastLoaderSeparator = normalizedRequestId.lastIndexOf('!')
  const resourceRequest =
    lastLoaderSeparator >= 0
      ? normalizedRequestId.slice(lastLoaderSeparator + 1)
      : normalizedRequestId
  const queryIndex = resourceRequest.indexOf('?')
  const filePath = queryIndex >= 0 ? resourceRequest.slice(0, queryIndex) : resourceRequest

  return {
    requestId,
    filePath,
    wrapped: filePath !== requestId,
  }
}

/**
 * Determine if a file should be transformed.
 * Always skips node_modules and dist directories.
 */
export function shouldTransform(filePath: string, options: Required<UnpluginOptions>): boolean {
  const resolvedFilePath = extractTransformFilePath(filePath).filePath

  // Never transform in production
  if (process.env['NODE_ENV'] === 'production') return false

  // Skip node_modules always
  if (resolvedFilePath.includes('node_modules')) return false

  // Skip virtual modules
  if (resolvedFilePath.startsWith('\x00')) return false

  // Skip dist/build directories
  if (/[/\\](dist|build|\.next|\.nuxt)[/\\]/.test(resolvedFilePath)) return false

  // Skip non-code files (like .html, .css)
  const ext = resolvedFilePath.split('.').pop()?.toLowerCase()
  if (ext && !['js', 'jsx', 'ts', 'tsx', 'mjs', 'mts', 'vue'].includes(ext)) {
    return false
  }

  // Check user-defined exclude patterns
  // (picomatch integration — see index.ts for how options.exclude is applied)

  return true
}

/**
 * Build the escape tags set from user options merged with defaults.
 */
export function buildEscapeTagsSet(escapeTags?: string[]): Set<string> {
  const merged = new Set(DEFAULT_ESCAPE_TAGS)
  if (escapeTags) {
    for (const tag of escapeTags) {
      merged.add(tag)
    }
  }
  return merged
}

/**
 * Format a source location value for the data-inspecto attribute.
 * Format: "filepath:line:column"
 */
export function formatAttrValue(file: string, line: number, column: number): string {
  return `${file}:${line}:${column}`
}
