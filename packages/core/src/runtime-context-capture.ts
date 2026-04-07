import type { RuntimeEvidenceRecord } from '@inspecto-dev/types'
import {
  buildRecordId,
  buildRequestDetails,
  buildRequestRecord,
  buildStackFromErrorEvent,
  buildXhrState,
  cloneRuntimeRecord,
  extractConsoleErrorDetails,
  isAbortLikeError,
  isNoisyInput,
  safePathname,
  stringifyReason,
  stringifyRequestUrl,
  type CollectorRecordInput,
  type FetchLike,
  type XhrState,
} from './runtime-context-shared.js'

type RuntimeCollector = ReturnType<typeof createRuntimeContextCollector>

type RuntimeCaptureLayer = {
  collector: RuntimeCollector
}

const activeCaptureLayers = new Set<RuntimeCaptureLayer>()
let originalConsoleError: typeof console.error | null = null
let originalFetch: FetchLike | null = null
let originalXhrOpen: XMLHttpRequest['open'] | null = null
let originalXhrSend: XMLHttpRequest['send'] | null = null
let xhrState: WeakMap<XMLHttpRequest, XhrState> | null = null
let sharedPatchesInstalled = false

const sharedWindowErrorHandler = (event: ErrorEvent) => {
  if (!event.error && !event.message) return

  const stack = event.error instanceof Error ? event.error.stack : buildStackFromErrorEvent(event)
  const sourceUrl = event.filename || undefined

  dispatchToActiveCollectors(collector =>
    collector.recordError({
      message: event.message || event.error?.message || 'Unknown runtime error',
      route: window.location.pathname,
      timestamp: Date.now(),
      ...(stack ? { stack } : {}),
      ...(sourceUrl ? { sourceUrl } : {}),
    }),
  )
}

const sharedWindowRejectionHandler = (
  event: PromiseRejectionEvent | (Event & { reason?: unknown }),
) => {
  const stack = event.reason instanceof Error ? event.reason.stack : undefined

  dispatchToActiveCollectors(collector =>
    collector.recordPromiseRejection({
      message: stringifyReason(event.reason),
      route: window.location.pathname,
      timestamp: Date.now(),
      ...(stack ? { stack } : {}),
    }),
  )
}

export function createRuntimeContextCollector(maxAgeMs = 60_000) {
  const records = new Map<string, RuntimeEvidenceRecord>()

  function normalize(input: CollectorRecordInput): RuntimeEvidenceRecord | null {
    if (isNoisyInput(input)) return null

    const id = buildRecordId(input)
    const existing = records.get(id)
    if (existing) {
      existing.occurrenceCount += 1
      existing.timestamp = Math.max(existing.timestamp, input.timestamp)
      return existing
    }

    return {
      id,
      kind: input.kind,
      timestamp: input.timestamp,
      message: input.message,
      occurrenceCount: 1,
      relevanceScore: 0,
      relevanceLevel: 'low',
      relevanceReasons: [],
      ...(input.stack ? { stack: input.stack } : {}),
      ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
      ...(input.sourceFile ? { sourceFile: input.sourceFile } : {}),
      ...(input.route ? { route: input.route } : {}),
      ...(input.componentHints ? { componentHints: input.componentHints } : {}),
      ...(input.request ? { request: input.request } : {}),
    }
  }

  function upsert(input: CollectorRecordInput): void {
    prune(input.timestamp)
    const normalized = normalize(input)
    if (!normalized) return
    records.set(normalized.id, normalized)
  }

  function prune(now: number): void {
    for (const [id, record] of records) {
      if (now - record.timestamp > maxAgeMs) {
        records.delete(id)
      }
    }
  }

  return {
    recordError(input: Omit<CollectorRecordInput, 'kind'>) {
      upsert({ ...input, kind: 'runtime-error' })
    },
    recordPromiseRejection(input: Omit<CollectorRecordInput, 'kind'>) {
      upsert({ ...input, kind: 'promise-rejection' })
    },
    recordConsoleError(input: Omit<CollectorRecordInput, 'kind'>) {
      upsert({ ...input, kind: 'console-error' })
    },
    recordFailedRequest(input: Omit<CollectorRecordInput, 'kind'>) {
      upsert({ ...input, kind: 'failed-request' })
    },
    snapshot() {
      prune(Date.now())
      return {
        records: Array.from(records.values()).map(cloneRuntimeRecord),
      }
    },
    clear() {
      records.clear()
    },
  }
}

export function attachRuntimeContextCapture(collector: RuntimeCollector): () => void {
  if (typeof window === 'undefined') return () => {}

  const layer: RuntimeCaptureLayer = { collector }
  activeCaptureLayers.add(layer)
  ensureSharedPatches()

  let disposed = false
  return () => {
    if (disposed) return
    disposed = true
    activeCaptureLayers.delete(layer)
    if (activeCaptureLayers.size === 0) {
      restoreSharedPatches()
    }
  }
}

function ensureSharedPatches(): void {
  if (sharedPatchesInstalled || typeof window === 'undefined') return

  sharedPatchesInstalled = true

  originalConsoleError = console.error
  console.error = ((...args: unknown[]) => {
    const consoleDetails = extractConsoleErrorDetails(args)
    dispatchToActiveCollectors(collector =>
      collector.recordConsoleError({
        message: consoleDetails.message,
        route: window.location.pathname,
        timestamp: Date.now(),
        ...(consoleDetails.stack ? { stack: consoleDetails.stack } : {}),
      }),
    )
    return originalConsoleError!.apply(console, args as never)
  }) as typeof console.error

  window.addEventListener('error', sharedWindowErrorHandler)
  window.addEventListener('unhandledrejection', sharedWindowRejectionHandler as EventListener)

  if (typeof window.fetch === 'function') {
    originalFetch = window.fetch as FetchLike
    window.fetch = (async (input, init) => {
      const request = buildRequestDetails(input, init)
      try {
        const response = await Reflect.apply(originalFetch!, window, [input, init])
        if (!response.ok) {
          const requestDetails = buildRequestRecord({
            method: request.method,
            url: request.url,
            status: response.status,
            responseSummary: response.statusText || `HTTP ${response.status}`,
            ...(request.pathname ? { pathname: request.pathname } : {}),
          })
          dispatchToActiveCollectors(collector =>
            collector.recordFailedRequest({
              message: `${request.method} ${request.pathname ?? request.url ?? 'request'} -> ${response.status}`,
              route: window.location.pathname,
              timestamp: Date.now(),
              request: requestDetails,
            }),
          )
        }
        return response
      } catch (error) {
        if (isAbortLikeError(error)) {
          throw error
        }
        const requestDetails = buildRequestRecord({
          method: request.method,
          url: request.url,
          responseSummary: stringifyReason(error),
          ...(request.pathname ? { pathname: request.pathname } : {}),
        })
        dispatchToActiveCollectors(collector =>
          collector.recordFailedRequest({
            message: `${request.method} ${request.pathname ?? request.url ?? 'request'} failed: ${stringifyReason(error)}`,
            route: window.location.pathname,
            timestamp: Date.now(),
            request: requestDetails,
          }),
        )
        throw error
      }
    }) as typeof window.fetch
  }

  if (typeof XMLHttpRequest !== 'undefined') {
    const prototype = XMLHttpRequest.prototype
    originalXhrOpen = prototype.open
    originalXhrSend = prototype.send
    xhrState = new WeakMap<XMLHttpRequest, XhrState>()

    prototype.open = function open(
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      ...rest: [boolean?, string?, string?]
    ) {
      const requestUrl = stringifyRequestUrl(url)
      const pathname = safePathname(requestUrl)
      xhrState!.set(
        this,
        buildXhrState({
          method: method.toUpperCase(),
          url: requestUrl,
          ...(pathname ? { pathname } : {}),
        }),
      )
      return Reflect.apply(originalXhrOpen!, this, [method, url, ...rest]) as void
    }

    prototype.send = function send(
      this: XMLHttpRequest,
      ...args: Parameters<XMLHttpRequest['send']>
    ) {
      const state = xhrState!.get(this) ?? buildXhrState()
      xhrState!.set(this, state)
      if (!state.attached) {
        state.attached = true
        const markAborted = () => {
          state.aborted = true
        }
        const recordIfNeeded = () => {
          if (state.recorded) return
          if (state.aborted) return
          if (this.status !== 0 && this.status < 400) return
          state.recorded = true
          const requestDetails = buildRequestRecord({
            responseSummary: this.statusText || 'Request failed',
            ...(state.method ? { method: state.method } : {}),
            ...(state.url ? { url: state.url } : {}),
            ...(state.pathname ? { pathname: state.pathname } : {}),
            ...(this.status ? { status: this.status } : {}),
          })
          dispatchToActiveCollectors(collector =>
            collector.recordFailedRequest({
              message: `${state.method ?? 'GET'} ${state.pathname ?? state.url ?? 'request'} -> ${
                this.status || 'network error'
              }`,
              route: window.location.pathname,
              timestamp: Date.now(),
              request: requestDetails,
            }),
          )
        }

        this.addEventListener('abort', markAborted, { once: true })
        this.addEventListener('error', recordIfNeeded, { once: true })
        this.addEventListener('timeout', recordIfNeeded, { once: true })
        this.addEventListener('loadend', recordIfNeeded, { once: true })
      }

      return originalXhrSend!.apply(this, args)
    }
  }
}

function restoreSharedPatches(): void {
  if (!sharedPatchesInstalled) return
  sharedPatchesInstalled = false

  if (originalConsoleError) {
    console.error = originalConsoleError
    originalConsoleError = null
  }

  if (typeof window !== 'undefined') {
    window.removeEventListener('error', sharedWindowErrorHandler)
    window.removeEventListener('unhandledrejection', sharedWindowRejectionHandler as EventListener)

    if (originalFetch) {
      window.fetch = originalFetch as typeof window.fetch
      originalFetch = null
    }
  }

  if (typeof XMLHttpRequest !== 'undefined' && originalXhrOpen && originalXhrSend) {
    XMLHttpRequest.prototype.open = originalXhrOpen
    XMLHttpRequest.prototype.send = originalXhrSend
  }
  originalXhrOpen = null
  originalXhrSend = null
  xhrState = null
}

function dispatchToActiveCollectors(callback: (collector: RuntimeCollector) => void): void {
  for (const layer of activeCaptureLayers) {
    callback(layer.collector)
  }
}
