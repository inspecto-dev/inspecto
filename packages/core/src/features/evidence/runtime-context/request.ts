import type { RuntimeEvidenceRecord } from '@inspecto-dev/types'

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type XhrState = {
  method?: string
  url?: string
  pathname?: string
  attached: boolean
  recorded: boolean
  aborted: boolean
}

export function buildRequestRecord(input: {
  method?: string
  url?: string
  pathname?: string
  status?: number
  responseSummary?: string
}): NonNullable<RuntimeEvidenceRecord['request']> {
  return {
    ...(input.method ? { method: input.method } : {}),
    ...(input.url ? { url: input.url } : {}),
    ...(input.pathname ? { pathname: input.pathname } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.responseSummary ? { responseSummary: input.responseSummary } : {}),
  }
}

export function buildXhrState(
  input: Omit<XhrState, 'attached' | 'recorded' | 'aborted'> = {},
): XhrState {
  return {
    attached: false,
    recorded: false,
    aborted: false,
    ...(input.method ? { method: input.method } : {}),
    ...(input.url ? { url: input.url } : {}),
    ...(input.pathname ? { pathname: input.pathname } : {}),
  }
}

export function isAbortLikeError(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError'
  }

  if (error instanceof Error) {
    return error.name === 'AbortError'
  }

  return Boolean(
    error &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError',
  )
}

export function buildRequestDetails(input: RequestInfo | URL, init?: RequestInit) {
  const request = typeof Request !== 'undefined' && input instanceof Request ? input : undefined
  const requestUrl = stringifyRequestUrl(input)
  const pathname = safePathname(requestUrl)
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase()

  return {
    method,
    url: requestUrl,
    pathname,
  }
}

export function stringifyRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (typeof URL !== 'undefined' && input instanceof URL) return input.toString()
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url
  return String(input)
}

export function safePathname(value: string | undefined): string | undefined {
  if (!value) return undefined

  try {
    return new URL(value, window.location.href).pathname
  } catch {
    return value.startsWith('/') ? value : undefined
  }
}
