import type { UnpluginOptions } from '@inspecto-dev/types'
import type MagicString from 'magic-string'
import path from 'node:path'

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
type UserPattern = string | RegExp

export function shouldTransform(
  filePath: string,
  options: Required<UnpluginOptions>,
  projectRoot?: string,
): boolean {
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
  if (ext && !['js', 'jsx', 'ts', 'tsx', 'mjs', 'mts', 'vue', 'svelte', 'astro'].includes(ext)) {
    return false
  }

  if (!matchesUserPatterns(resolvedFilePath, options.include as UserPattern[], true, projectRoot)) {
    return false
  }
  if (matchesUserPatterns(resolvedFilePath, options.exclude as UserPattern[], false, projectRoot)) {
    return false
  }

  return true
}

function matchesUserPatterns(
  filePath: string,
  patterns: UserPattern[],
  emptyResult: boolean,
  projectRoot?: string,
): boolean {
  if (patterns.length === 0) return emptyResult

  const normalizedPath = filePath.replace(/\\/g, '/')
  return patterns.some(pattern => matchesPattern(normalizedPath, pattern, projectRoot))
}

function matchesPattern(filePath: string, pattern: UserPattern, projectRoot?: string): boolean {
  if (pattern instanceof RegExp) {
    pattern.lastIndex = 0
    return pattern.test(filePath)
  }

  const normalizedPattern = pattern.replace(/\\/g, '/')
  const candidates = new Set<string>([filePath])

  if (projectRoot) {
    const normalizedProjectRoot = projectRoot.replace(/\\/g, '/')
    candidates.add(path.posix.relative(normalizedProjectRoot, filePath))
  }

  const srcIndex = filePath.indexOf('/src/')
  if (srcIndex >= 0) candidates.add(filePath.slice(srcIndex + 1))

  return expandBraceGlob(normalizedPattern).some(patternVariant => {
    const regexp = globToRegExp(patternVariant)
    return Array.from(candidates).some(candidate => regexp.test(candidate))
  })
}

function expandBraceGlob(pattern: string): string[] {
  const match = pattern.match(/\{([^{}]+)\}/)
  if (!match || match.index === undefined) return [pattern]

  const before = pattern.slice(0, match.index)
  const after = pattern.slice(match.index + match[0].length)
  return match[1]!.split(',').flatMap(part => expandBraceGlob(`${before}${part}${after}`))
}

function globToRegExp(pattern: string): RegExp {
  let source = '^'

  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index]!
    const next = pattern[index + 1]

    if (char === '*') {
      if (next === '*') {
        const afterGlobstar = pattern[index + 2]
        if (afterGlobstar === '/') {
          source += '(?:.*/)?'
          index += 2
        } else {
          source += '.*'
          index++
        }
      } else {
        source += '[^/]*'
      }
      continue
    }

    if (char === '?') {
      source += '[^/]'
      continue
    }

    source += escapeRegExp(char)
  }

  return new RegExp(`${source}$`)
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
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

export function resolveTransformAttrPath(options: {
  filePath: string
  projectRoot?: string
  pathType?: 'absolute' | 'relative'
}): string {
  const baseRoot = options.projectRoot ?? process.cwd()
  const normalizedInputPath = options.filePath.replace(/\\/g, '/')
  const normalizedProjectRoot = normalizeAbsoluteLikePath(baseRoot)
  const normalizedFilePath = isAbsoluteLikePath(normalizedInputPath)
    ? normalizedInputPath
    : normalizeAbsoluteLikePath(path.resolve(baseRoot, options.filePath))
  const resolvedPath =
    options.pathType === 'relative'
      ? path.posix.relative(normalizedProjectRoot, normalizedFilePath)
      : normalizedFilePath

  return resolvedPath.replace(/\\/g, '/')
}

function normalizeAbsoluteLikePath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

function isAbsoluteLikePath(filePath: string): boolean {
  return path.isAbsolute(filePath) || /^[A-Za-z]:\//.test(filePath)
}
