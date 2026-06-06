import { describe, expect, it, vi } from 'vitest'
import type { RuntimeContextEnvelope, SourceLocation } from '@inspecto-dev/types'
import { resolveInspectMenuRuntimeContext } from '../src/features/inspect/menu/runtime-context-resolver.js'

const location: SourceLocation = { file: '/src/App.tsx', line: 10, column: 5 }

function createRuntimeContext(): RuntimeContextEnvelope {
  return {
    summary: {
      runtimeErrorCount: 1,
      failedRequestCount: 0,
      includedRecordIds: ['err-1'],
    },
    records: [
      {
        id: 'err-1',
        kind: 'runtime-error',
        timestamp: 100,
        message: 'boom',
        occurrenceCount: 1,
        relevanceScore: 0.9,
        relevanceLevel: 'high',
        relevanceReasons: ['stack references target file'],
      },
    ],
  }
}

describe('inspect menu runtime context resolver', () => {
  it('does not resolve when runtime context cannot be attached', () => {
    const getRuntimeContext = vi.fn(createRuntimeContext)

    expect(
      resolveInspectMenuRuntimeContext({
        canAttachRuntimeContext: false,
        runtimeContextPreference: true,
        runtimeContextDefaultMode: 'all-on',
        location,
        getRuntimeContext,
      }),
    ).toBeNull()
    expect(getRuntimeContext).not.toHaveBeenCalled()
  })

  it('uses mixed default mode only for fix intents', () => {
    const runtimeContext = createRuntimeContext()
    const getRuntimeContext = vi.fn(() => runtimeContext)

    expect(
      resolveInspectMenuRuntimeContext({
        canAttachRuntimeContext: true,
        runtimeContextPreference: null,
        runtimeContextDefaultMode: 'mixed',
        location,
        getRuntimeContext,
        intent: { id: 'fix-bug', aiIntent: 'fix' },
      }),
    ).toBe(runtimeContext)
    expect(
      resolveInspectMenuRuntimeContext({
        canAttachRuntimeContext: true,
        runtimeContextPreference: null,
        runtimeContextDefaultMode: 'mixed',
        location,
        getRuntimeContext,
        intent: { id: 'explain', aiIntent: 'ask' },
      }),
    ).toBeNull()
  })

  it('honors explicit user preference before default mode', () => {
    const runtimeContext = createRuntimeContext()
    const getRuntimeContext = vi.fn(() => runtimeContext)

    expect(
      resolveInspectMenuRuntimeContext({
        canAttachRuntimeContext: true,
        runtimeContextPreference: true,
        runtimeContextDefaultMode: 'off',
        location,
        getRuntimeContext,
      }),
    ).toBe(runtimeContext)
    expect(
      resolveInspectMenuRuntimeContext({
        canAttachRuntimeContext: true,
        runtimeContextPreference: false,
        runtimeContextDefaultMode: 'all-on',
        location,
        getRuntimeContext,
        intent: { id: 'fix-bug', aiIntent: 'fix' },
      }),
    ).toBeNull()
  })
})
