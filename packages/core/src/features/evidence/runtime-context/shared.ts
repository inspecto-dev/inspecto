import type { RuntimeEvidenceKind, RuntimeEvidenceRecord } from '@inspecto-dev/types'

export type CollectorRecordInput = {
  kind: RuntimeEvidenceKind
  message: string
  timestamp: number
  stack?: string
  sourceUrl?: string
  sourceFile?: string
  route?: string
  componentHints?: string[]
  request?: RuntimeEvidenceRecord['request']
}

export type RuntimeEvidenceLimits = {
  maxRuntimeErrors?: number
  maxFailedRequests?: number
}

export const NOISE_PATTERNS = [
  /\[vite\]/i,
  /\bhmr\b/i,
  /\bhot update\b/i,
  /\bwebsocket\b/i,
  /\bsource map\b/i,
  /extension:\/\//i,
]

export function isNoisyInput(input: CollectorRecordInput): boolean {
  const candidates = [
    input.message,
    input.stack,
    input.sourceUrl,
    input.sourceFile,
    input.route,
    input.request?.url,
    input.request?.pathname,
    input.request?.responseSummary,
  ].filter((value): value is string => typeof value === 'string')

  return candidates.some(candidate => NOISE_PATTERNS.some(pattern => pattern.test(candidate)))
}

export function buildRecordId(input: CollectorRecordInput): string {
  return [
    input.kind,
    normalizeKey(input.message),
    normalizeKey(input.stack),
    normalizeKey(input.sourceUrl),
    normalizeKey(input.sourceFile),
    normalizeKey(input.route),
    normalizeKey(input.request?.method),
    normalizeKey(input.request?.url),
    normalizeKey(input.request?.pathname),
    normalizeKey(input.request?.status),
  ].join('::')
}

export function cloneRuntimeRecord(record: RuntimeEvidenceRecord): RuntimeEvidenceRecord {
  return {
    ...record,
    relevanceReasons: [...record.relevanceReasons],
    ...(record.componentHints ? { componentHints: [...record.componentHints] } : {}),
    ...(record.request ? { request: { ...record.request } } : {}),
  }
}

export function compareRankedRuntimeEvidence(
  a: RuntimeEvidenceRecord,
  b: RuntimeEvidenceRecord,
): number {
  return (
    b.relevanceScore - a.relevanceScore ||
    b.timestamp - a.timestamp ||
    b.occurrenceCount - a.occurrenceCount
  )
}

export function stackReferencesLocation(stack: string, file: string): boolean {
  const normalizedCandidates = buildComparablePaths(file)
  return normalizedCandidates.some(candidate => candidate.length > 0 && stack.includes(candidate))
}

export function matchesTargetFile(candidate: string | undefined, file: string): boolean {
  if (!candidate) return false

  const candidateVariants = buildComparablePaths(candidate)
  const fileVariants = buildComparablePaths(file)

  for (const candidateVariant of candidateVariants) {
    for (const fileVariant of fileVariants) {
      if (
        candidateVariant === fileVariant ||
        candidateVariant.endsWith(fileVariant) ||
        fileVariant.endsWith(candidateVariant)
      ) {
        return true
      }
    }
  }

  return false
}

export function normalizeKey(value: string | number | undefined): string {
  return value === undefined || value === null ? '' : String(value).trim().replace(/\s+/g, ' ')
}

export function buildComparablePaths(value: string): string[] {
  const variants = new Set<string>()
  const trimmed = value.trim()
  if (!trimmed) return []

  variants.add(trimmed)

  try {
    const url = new URL(
      trimmed,
      typeof window !== 'undefined' ? window.location.href : 'http://localhost',
    )
    variants.add(url.pathname)
    const decoded = decodeURIComponent(url.pathname)
    variants.add(decoded)
    const basename = decoded.split('/').pop()
    if (basename) variants.add(basename)
  } catch {
    const basename = trimmed.split('/').pop()
    if (basename) variants.add(basename)
  }

  return Array.from(variants).filter(Boolean)
}

export function stringifyValue(value: unknown): string {
  if (value instanceof Error) return value.stack || value.message
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  try {
    return JSON.stringify(value)
  } catch {
    return Object.prototype.toString.call(value)
  }
}

export function stringifyReason(reason: unknown): string {
  if (reason instanceof Error) return reason.message || reason.stack || 'Unknown promise rejection'
  if (typeof reason === 'string') return reason
  if (reason === undefined) return 'Unknown promise rejection'
  return stringifyValue(reason)
}

export function extractConsoleErrorDetails(args: unknown[]): { message: string; stack?: string } {
  const message = args.map(arg => stringifyValue(arg)).join(' ')

  for (const arg of args) {
    if (arg instanceof Error && arg.stack) {
      return { message, stack: arg.stack }
    }

    if (arg && typeof arg === 'object') {
      const maybeStack = 'stack' in arg ? (arg as { stack?: unknown }).stack : undefined
      if (typeof maybeStack === 'string' && maybeStack.trim()) {
        return { message, stack: maybeStack }
      }
    }

    if (typeof arg === 'string' && looksLikeStackTrace(arg)) {
      return { message, stack: arg }
    }
  }

  return { message }
}

export function buildStackFromErrorEvent(event: ErrorEvent): string | undefined {
  if (!event.filename) return undefined
  const line = typeof event.lineno === 'number' && event.lineno > 0 ? event.lineno : undefined
  const column = typeof event.colno === 'number' && event.colno > 0 ? event.colno : undefined
  if (line && column)
    return `${event.message || 'Error'}\n    at <unknown> (${event.filename}:${line}:${column})`
  if (line) return `${event.message || 'Error'}\n    at <unknown> (${event.filename}:${line})`
  return event.filename
}

function looksLikeStackTrace(value: string): boolean {
  return (
    /\n\s*at\s+/i.test(value) ||
    /https?:\/\/.+?:\d+:\d+/i.test(value) ||
    /\/[^\s]+:\d+:\d+/.test(value)
  )
}
