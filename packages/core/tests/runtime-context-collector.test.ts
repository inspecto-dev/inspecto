import { describe, expect, it, vi } from 'vitest'
import { createRuntimeContextCollector } from '../src/features/evidence/runtime-context/collector.js'

describe('runtime context collector', () => {
  it('deduplicates repeated runtime errors and updates the latest timestamp', () => {
    const collector = createRuntimeContextCollector()
    vi.spyOn(Date, 'now').mockReturnValue(200)

    collector.recordError({
      message: 'Cannot read properties of undefined',
      stack: 'at App (/repo/src/App.tsx:10:5)',
      timestamp: 100,
    })
    collector.recordError({
      message: 'Cannot read properties of undefined',
      stack: 'at App (/repo/src/App.tsx:10:5)',
      timestamp: 150,
    })

    const snapshot = collector.snapshot()
    expect(snapshot.records).toHaveLength(1)
    expect(snapshot.records[0]?.occurrenceCount).toBe(2)
    expect(snapshot.records[0]?.timestamp).toBe(150)

    vi.restoreAllMocks()
  })

  it('returns cloned records from snapshots', () => {
    const collector = createRuntimeContextCollector()
    vi.spyOn(Date, 'now').mockReturnValue(200)

    collector.recordFailedRequest({
      message: 'GET /api/user -> 500',
      timestamp: 100,
      request: { method: 'GET', pathname: '/api/user', status: 500 },
    })

    const firstSnapshot = collector.snapshot()
    firstSnapshot.records[0]!.relevanceReasons.push('mutated outside')
    firstSnapshot.records[0]!.request!.status = 418

    const secondSnapshot = collector.snapshot()
    expect(secondSnapshot.records[0]?.relevanceReasons).toEqual([])
    expect(secondSnapshot.records[0]?.request?.status).toBe(500)

    vi.restoreAllMocks()
  })
})
