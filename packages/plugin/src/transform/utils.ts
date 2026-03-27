import type { UnpluginOptions } from '@inspecto/types'
import type MagicString from 'magic-string'

export interface TransformResult {
  code: string
  map: ReturnType<MagicString['generateMap']> | null
  changed: boolean
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

/**
 * Determine if a file should be transformed.
 * Always skips node_modules and dist directories.
 */
export function shouldTransform(filePath: string, options: Required<UnpluginOptions>): boolean {
  // Never transform in production
  if (process.env['NODE_ENV'] === 'production') return false

  // Skip node_modules always
  if (filePath.includes('node_modules')) return false

  // Skip virtual modules
  if (filePath.startsWith('\x00')) return false

  // Skip dist/build directories
  if (/[/\\](dist|build|\.next|\.nuxt)[/\\]/.test(filePath)) return false

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
