import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  attachRuntimeContextCapture,
  createRuntimeContextCollector,
  createRuntimeContextEnvelope,
  rankRuntimeEvidence,
  selectRuntimeEvidence,
  summarizeRuntimeContext,
} from '../src/runtime-context.js'

describe('runtime context collector', () => {
  let cleanup: (() => void) | undefined

  beforeEach(() => {
    cleanup = undefined
  })

  afterEach(() => {
    cleanup?.()
    vi.restoreAllMocks()
  })

  it('deduplicates repeated runtime errors and increments occurrence count', () => {
    const collector = createRuntimeContextCollector()
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(120)

    collector.recordError({
      kind: 'runtime-error',
      message: 'Cannot read properties of undefined',
      stack: 'at App (/repo/src/App.tsx:10:5)',
      timestamp: 100,
    })
    collector.recordError({
      kind: 'runtime-error',
      message: 'Cannot read properties of undefined',
      stack: 'at App (/repo/src/App.tsx:10:5)',
      timestamp: 120,
    })

    const snapshot = collector.snapshot()
    expect(snapshot.records).toHaveLength(1)
    expect(snapshot.records[0]?.occurrenceCount).toBe(2)
    nowSpy.mockRestore()
  })

  it('prunes expired records when snapshot is read even if no new events arrive', () => {
    const collector = createRuntimeContextCollector(10)
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(100)

    collector.recordError({
      message: 'old boom',
      stack: 'at App (/repo/src/App.tsx:10:5)',
      timestamp: 0,
    })

    const snapshot = collector.snapshot()

    expect(snapshot.records).toHaveLength(0)
    nowSpy.mockRestore()
  })

  it('drops noisy HMR and sourcemap records before ranking', () => {
    const collector = createRuntimeContextCollector()

    collector.recordConsoleError({
      message: '[vite] connecting...',
      timestamp: 100,
    })
    collector.recordConsoleError({
      message: 'Failed to load source map',
      timestamp: 101,
    })

    expect(collector.snapshot().records).toHaveLength(0)
  })

  it('prefers records whose stack references the inspected file', () => {
    const ranked = rankRuntimeEvidence(
      [
        {
          id: 'a',
          kind: 'runtime-error',
          message: 'bad',
          occurrenceCount: 1,
          timestamp: 100,
          relevanceScore: 0,
          relevanceLevel: 'low',
          relevanceReasons: [],
        },
        {
          id: 'b',
          kind: 'runtime-error',
          message: 'bad',
          stack: 'at Form (/repo/src/Form.tsx:20:3)',
          occurrenceCount: 1,
          timestamp: 105,
          relevanceScore: 0,
          relevanceLevel: 'low',
          relevanceReasons: [],
        },
      ],
      { file: '/repo/src/Form.tsx', line: 20, column: 3 },
    )

    expect(ranked[0]?.id).toBe('b')
    expect(ranked[0]?.relevanceLevel).toBe('high')
  })

  it('summarizes failed requests separately from runtime errors', () => {
    const summary = summarizeRuntimeContext([
      {
        id: 'req',
        kind: 'failed-request',
        message: 'GET /api/user -> 500',
        occurrenceCount: 1,
        timestamp: 100,
        relevanceScore: 0.8,
        relevanceLevel: 'high',
        relevanceReasons: [],
      },
    ])

    expect(summary.failedRequestCount).toBe(1)
    expect(summary.runtimeErrorCount).toBe(0)
  })

  it('creates a runtime context envelope from ranked records', () => {
    const records = rankRuntimeEvidence(
      [
        {
          id: 'err-1',
          kind: 'runtime-error',
          message: 'boom',
          stack: 'at App (/repo/src/App.tsx:10:5)',
          occurrenceCount: 2,
          timestamp: 100,
          relevanceScore: 0,
          relevanceLevel: 'low',
          relevanceReasons: [],
        },
      ],
      { file: '/repo/src/App.tsx', line: 10, column: 5 },
    )

    const envelope = createRuntimeContextEnvelope(records)

    expect(envelope.summary.includedRecordIds).toEqual(['err-1'])
    expect(envelope.summary.runtimeErrorCount).toBe(1)
    expect(envelope.records[0]?.relevanceLevel).toBe('high')
  })

  it('selects the best-matching evidence across multiple target locations', () => {
    const selected = selectRuntimeEvidence(
      [
        {
          id: 'form-error',
          kind: 'runtime-error',
          message: 'form exploded',
          stack: 'at Form (/repo/src/Form.tsx:20:3)',
          occurrenceCount: 1,
          timestamp: 100,
          relevanceScore: 0,
          relevanceLevel: 'low',
          relevanceReasons: [],
        },
        {
          id: 'card-error',
          kind: 'runtime-error',
          message: 'card exploded',
          stack: 'at Card (/repo/src/Card.tsx:12:2)',
          occurrenceCount: 1,
          timestamp: 105,
          relevanceScore: 0,
          relevanceLevel: 'low',
          relevanceReasons: [],
        },
      ],
      [
        { file: '/repo/src/Form.tsx', line: 20, column: 3 },
        { file: '/repo/src/Card.tsx', line: 12, column: 2 },
      ],
    )

    expect(selected.map(record => record.id)).toEqual(['card-error', 'form-error'])
    expect(selected.every(record => record.relevanceLevel === 'high')).toBe(true)
  })

  it('applies separate caps for runtime errors and failed requests', () => {
    const selected = selectRuntimeEvidence(
      [
        {
          id: 'err-1',
          kind: 'runtime-error',
          message: 'first error',
          stack: 'at App (/repo/src/App.tsx:10:5)',
          occurrenceCount: 1,
          timestamp: 100,
          relevanceScore: 0,
          relevanceLevel: 'low',
          relevanceReasons: [],
        },
        {
          id: 'err-2',
          kind: 'console-error',
          message: 'second error',
          stack: 'at App (/repo/src/App.tsx:11:5)',
          occurrenceCount: 1,
          timestamp: 101,
          relevanceScore: 0,
          relevanceLevel: 'low',
          relevanceReasons: [],
        },
        {
          id: 'req-1',
          kind: 'failed-request',
          message: 'GET /api/user in /repo/src/App.tsx -> 500',
          sourceFile: '/repo/src/App.tsx',
          occurrenceCount: 2,
          timestamp: 102,
          relevanceScore: 0,
          relevanceLevel: 'low',
          relevanceReasons: [],
          request: { method: 'GET', pathname: '/api/user', status: 500 },
        },
        {
          id: 'req-2',
          kind: 'failed-request',
          message: 'GET /api/settings in /repo/src/App.tsx -> 500',
          sourceFile: '/repo/src/App.tsx',
          occurrenceCount: 3,
          timestamp: 103,
          relevanceScore: 0,
          relevanceLevel: 'low',
          relevanceReasons: [],
          request: { method: 'GET', pathname: '/api/settings', status: 500 },
        },
      ],
      { file: '/repo/src/App.tsx', line: 10, column: 5 },
      { maxRuntimeErrors: 1, maxFailedRequests: 1 },
    )

    expect(selected.map(record => record.id)).toContain('err-1')
    expect(selected.map(record => record.id)).toContain('req-2')
    expect(selected.filter(record => record.kind === 'failed-request')).toHaveLength(1)
    expect(selected.filter(record => record.kind !== 'failed-request')).toHaveLength(1)
  })

  it('keeps plain failed requests selectable even without source-file hints', () => {
    const selected = selectRuntimeEvidence(
      [
        {
          id: 'req-1',
          kind: 'failed-request',
          message: 'GET /api/user -> 500',
          occurrenceCount: 1,
          timestamp: 100,
          relevanceScore: 0,
          relevanceLevel: 'low',
          relevanceReasons: [],
          request: { method: 'GET', pathname: '/api/user', status: 500 },
        },
      ],
      { file: '/repo/src/App.tsx', line: 10, column: 5 },
      { maxFailedRequests: 1 },
    )

    expect(selected).toHaveLength(1)
    expect(selected[0]?.kind).toBe('failed-request')
    expect(selected[0]?.relevanceLevel).toBe('medium')
  })

  it('captures runtime errors, promise rejections, and console errors without breaking native behavior', () => {
    const collector = createRuntimeContextCollector()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    cleanup = attachRuntimeContextCapture(collector)

    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'runtime exploded',
        error: new Error('runtime exploded'),
        filename: '/repo/src/App.tsx',
      }),
    )

    const rejection = new Event('unhandledrejection')
    Object.defineProperty(rejection, 'reason', {
      value: new Error('promise exploded'),
    })
    window.dispatchEvent(rejection)

    console.error('console exploded')

    const snapshot = collector.snapshot()
    expect(snapshot.records.some(record => record.kind === 'runtime-error')).toBe(true)
    expect(snapshot.records.some(record => record.kind === 'promise-rejection')).toBe(true)
    expect(snapshot.records.some(record => record.kind === 'console-error')).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('console exploded')
  })

  it('keeps the remaining capture layer active after a nested cleanup', () => {
    const collectorA = createRuntimeContextCollector()
    const collectorB = createRuntimeContextCollector()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const detachA = attachRuntimeContextCapture(collectorA)
    const detachB = attachRuntimeContextCapture(collectorB)

    detachA()
    console.error('nested capture should still work')

    expect(collectorA.snapshot().records).toHaveLength(0)
    expect(collectorB.snapshot().records).toHaveLength(1)
    expect(collectorB.snapshot().records[0]?.kind).toBe('console-error')
    expect(consoleSpy).toHaveBeenCalledWith('nested capture should still work')

    detachB()
  })

  it('captures failed fetch and xhr requests while preserving the original transports', async () => {
    const collector = createRuntimeContextCollector()

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('nope', {
        status: 500,
        statusText: 'Internal Server Error',
      }),
    )
    const openSpy = vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
    ) {
      void method
      void url
      return undefined as never
    })
    const sendSpy = vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function (
      this: XMLHttpRequest,
    ) {
      this.dispatchEvent(new Event('loadend'))
      return undefined as never
    })

    cleanup = attachRuntimeContextCapture(collector)

    const response = await fetch('/api/user')
    expect(response.status).toBe(500)
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/save')
    xhr.send()

    expect(openSpy).toHaveBeenCalledTimes(1)
    expect(sendSpy).toHaveBeenCalledTimes(1)

    const snapshot = collector.snapshot()
    expect(
      snapshot.records.some(
        record => record.kind === 'failed-request' && record.request?.pathname === '/api/user',
      ),
    ).toBe(true)
    expect(
      snapshot.records.some(
        record => record.kind === 'failed-request' && record.request?.pathname === '/api/save',
      ),
    ).toBe(true)
  })

  it('captures repeated failed requests when the same XHR instance is reused', () => {
    const collector = createRuntimeContextCollector()

    const openSpy = vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
    ) {
      void method
      void url
      return undefined as never
    })
    const sendSpy = vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function (
      this: XMLHttpRequest,
    ) {
      this.dispatchEvent(new Event('loadend'))
      return undefined as never
    })

    cleanup = attachRuntimeContextCapture(collector)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/reused')
    xhr.send()
    xhr.open('POST', '/api/reused')
    xhr.send()

    expect(openSpy).toHaveBeenCalledTimes(2)
    expect(sendSpy).toHaveBeenCalledTimes(2)

    const snapshot = collector.snapshot()
    const record = snapshot.records.find(
      entry => entry.kind === 'failed-request' && entry.request?.pathname === '/api/reused',
    )

    expect(record?.occurrenceCount).toBe(2)
  })

  it('ignores aborted fetch requests', async () => {
    const collector = createRuntimeContextCollector()
    const abortError = new DOMException('The operation was aborted.', 'AbortError')

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError)
    cleanup = attachRuntimeContextCapture(collector)

    await expect(fetch('/api/aborted')).rejects.toBe(abortError)

    expect(collector.snapshot().records).toHaveLength(0)
  })

  it('ignores aborted xhr requests', () => {
    const collector = createRuntimeContextCollector()

    vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
    ) {
      void method
      void url
      return undefined as never
    })
    vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function (this: XMLHttpRequest) {
      this.dispatchEvent(new Event('abort'))
      this.dispatchEvent(new Event('loadend'))
      return undefined as never
    })

    cleanup = attachRuntimeContextCapture(collector)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/cancelled')
    xhr.send()

    expect(collector.snapshot().records).toHaveLength(0)
  })

  it('captures stack information from console.error Error arguments so inspect prompts can select it', () => {
    const collector = createRuntimeContextCollector()
    cleanup = attachRuntimeContextCapture(collector)

    const error = new Error('console boom')
    error.stack = 'Error: console boom\n    at App (/repo/src/App.tsx:10:5)'

    console.error('Runtime issue', error)

    const snapshot = collector.snapshot()
    expect(snapshot.records).toHaveLength(1)
    expect(snapshot.records[0]?.stack).toContain('/repo/src/App.tsx:10:5')

    const selected = selectRuntimeEvidence(snapshot.records, {
      file: '/repo/src/App.tsx',
      line: 10,
      column: 5,
    })

    expect(selected).toHaveLength(1)
    expect(selected[0]?.kind).toBe('console-error')
    expect(selected[0]?.relevanceLevel).not.toBe('low')
  })

  it('captures stack information from console.error string output that already embeds a stack trace', () => {
    const collector = createRuntimeContextCollector()
    cleanup = attachRuntimeContextCapture(collector)

    console.error('Error: console boom\n    at App (/repo/src/App.tsx:10:5)')

    const snapshot = collector.snapshot()
    expect(snapshot.records).toHaveLength(1)
    expect(snapshot.records[0]?.stack).toContain('/repo/src/App.tsx:10:5')

    const selected = selectRuntimeEvidence(snapshot.records, {
      file: '/repo/src/App.tsx',
      line: 10,
      column: 5,
    })

    expect(selected).toHaveLength(1)
    expect(selected[0]?.relevanceLevel).not.toBe('low')
  })

  it('captures stack information from non-Error console.error payloads that expose a stack field', () => {
    const collector = createRuntimeContextCollector()
    cleanup = attachRuntimeContextCapture(collector)

    console.error({
      message: 'console boom',
      stack: 'Error: console boom\n    at App (/repo/src/App.tsx:10:5)',
    })

    const snapshot = collector.snapshot()
    expect(snapshot.records).toHaveLength(1)
    expect(snapshot.records[0]?.stack).toContain('/repo/src/App.tsx:10:5')

    const selected = selectRuntimeEvidence(snapshot.records, {
      file: '/repo/src/App.tsx',
      line: 10,
      column: 5,
    })

    expect(selected).toHaveLength(1)
    expect(selected[0]?.relevanceLevel).not.toBe('low')
  })
})
