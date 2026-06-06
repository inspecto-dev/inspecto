import { describe, expect, it } from 'vitest'
import type { RuntimeContextEnvelope } from '@inspecto-dev/types'
import {
  formatRuntimeContextSummary,
  getCollectedRuntimeErrorCount,
  getRuntimeContextLimits,
} from '../src/runtime/evidence-summary.js'

function createRuntimeContext(
  overrides: Partial<RuntimeContextEnvelope['summary']> = {},
): RuntimeContextEnvelope {
  return {
    summary: {
      runtimeErrorCount: 2,
      failedRequestCount: 1,
      includedRecordIds: ['err-1', 'err-2', 'req-1'],
      ...overrides,
    },
    records: [],
  }
}

describe('runtime evidence summary helpers', () => {
  it('reads configured runtime context selection limits', () => {
    expect(
      getRuntimeContextLimits({
        options: {
          runtimeContext: {
            maxRuntimeErrors: 4,
            maxFailedRequests: 2,
          },
        },
      }),
    ).toEqual({ maxRuntimeErrors: 4, maxFailedRequests: 2 })

    expect(getRuntimeContextLimits({ options: {} })).toEqual({})
  })

  it('formats runtime context summaries for errors and failed requests', () => {
    expect(formatRuntimeContextSummary(null)).toBe('')
    expect(formatRuntimeContextSummary(createRuntimeContext())).toBe(
      '2 runtime errors • 1 failed request',
    )
    expect(
      formatRuntimeContextSummary(
        createRuntimeContext({ runtimeErrorCount: 1, failedRequestCount: 0 }),
      ),
    ).toBe('1 runtime error')
  })

  it('counts collected runtime errors excluding failed requests', () => {
    expect(
      getCollectedRuntimeErrorCount({
        runtimeContextCollector: {
          snapshot: () => ({
            records: [
              { kind: 'runtime-error' },
              { kind: 'console-error' },
              { kind: 'failed-request' },
            ],
          }),
        },
      }),
    ).toBe(2)
  })
})
