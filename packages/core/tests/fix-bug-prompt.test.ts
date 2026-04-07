import { describe, expect, it } from 'vitest'
import {
  appendScreenshotContextToPrompt,
  buildFixBugPrompt,
  buildPromptForIntent,
  selectFixBugEvidence,
} from '../src/fix-bug-prompt.js'

describe('fix bug prompt assembly', () => {
  it('keeps high-confidence runtime errors ahead of medium evidence', () => {
    const records = selectFixBugEvidence([
      {
        id: 'low',
        kind: 'console-error',
        message: 'generic',
        timestamp: 100,
        occurrenceCount: 1,
        relevanceScore: 0.2,
        relevanceLevel: 'low',
        relevanceReasons: [],
      },
      {
        id: 'high',
        kind: 'runtime-error',
        message: 'Cannot read properties of undefined',
        timestamp: 110,
        occurrenceCount: 1,
        relevanceScore: 0.9,
        relevanceLevel: 'high',
        relevanceReasons: ['stack references target file'],
      },
    ])

    expect(records.map(record => record.id)).toEqual(['high'])
  })

  it('renders the evidence-guided contract while preserving configured fix-bug guidance as reference', () => {
    const prompt = buildFixBugPrompt({
      template: `I found a bug in the following component from \`{{file}}\` (line {{line}}).

Please:

1. Identify potential bugs or issues in this code
2. Explain the root cause of each issue
3. Provide a fixed version with minimal changes`,
      location: { file: '/repo/src/App.tsx', line: 10, column: 5 },
      snippet: 'throw new Error("boom")',
      records: [
        {
          id: 'high',
          kind: 'runtime-error',
          message: 'boom',
          timestamp: 110,
          occurrenceCount: 2,
          relevanceScore: 0.9,
          relevanceLevel: 'high',
          relevanceReasons: ['stack references target file'],
        },
      ],
    })

    expect(prompt).toContain('You are fixing a bug for the currently inspected UI target.')
    expect(prompt).toContain('Target source context:')
    expect(prompt).toContain('High-confidence runtime evidence:')
    expect(prompt).toContain('Response contract:')
    expect(prompt).toContain('1. Most likely root cause')
    expect(prompt).toContain('Configured intent guidance (reference only):')
    expect(prompt).toContain(
      'I found a bug in the following component from `{{file}}` (line {{line}}).',
    )
    expect(prompt).toContain('Please:')
    expect(prompt).toContain('Identify potential bugs or issues in this code')
    expect(prompt).toContain('Provide a fixed version with minimal changes')
  })

  it('routes fix-bug intents through the evidence-guided builder and other intents through buildPrompt', () => {
    const runtimeContext = {
      summary: {
        runtimeErrorCount: 1,
        failedRequestCount: 0,
        includedRecordIds: ['err-1'],
      },
      records: [
        {
          id: 'err-1',
          kind: 'runtime-error' as const,
          message: 'Cannot read properties of undefined',
          timestamp: 120,
          occurrenceCount: 2,
          relevanceScore: 0.9,
          relevanceLevel: 'high' as const,
          relevanceReasons: ['stack references target file'],
        },
      ],
    }

    const fixBugPrompt = buildPromptForIntent(
      {
        id: 'fix-bug',
        prompt: 'Fix {{file}}',
      },
      { file: '/repo/src/App.tsx', line: 10, column: 5 },
      { snippet: 'const x = 1', file: '/repo/src/App.tsx', startLine: 10 },
      runtimeContext,
    )

    const explainPrompt = buildPromptForIntent(
      {
        id: 'explain',
        prompt: 'Explain {{file}}',
      },
      { file: '/repo/src/App.tsx', line: 10, column: 5 },
      null,
    )

    expect(fixBugPrompt).toContain('You are fixing a bug for the currently inspected UI target.')
    expect(fixBugPrompt).toContain('Cannot read properties of undefined')
    expect(fixBugPrompt).not.toContain('None selected. Do not treat unrelated logs as proof.')
    expect(explainPrompt).toContain('Explain /repo/src/App.tsx')
    expect(explainPrompt).not.toContain(
      'You are fixing a bug for the currently inspected UI target.',
    )
  })

  it('preserves prepend and append guidance for fix-bug intents', () => {
    const fixBugPrompt = buildPromptForIntent(
      {
        id: 'fix-bug',
        prompt: 'Fix {{file}}',
        prependPrompt: 'Use Simplified Chinese in the final answer.',
        appendPrompt: 'Keep code changes minimal and explain any trade-offs.',
      },
      { file: '/repo/src/App.tsx', line: 10, column: 5 },
      { snippet: 'const x = 1', file: '/repo/src/App.tsx', startLine: 10 },
      {
        summary: {
          runtimeErrorCount: 0,
          failedRequestCount: 0,
          includedRecordIds: [],
        },
        records: [],
      },
    )

    expect(fixBugPrompt).toContain('Configured intent guidance (reference only):')
    expect(fixBugPrompt).toContain('Use Simplified Chinese in the final answer.')
    expect(fixBugPrompt).toContain('Fix {{file}}')
    expect(fixBugPrompt).toContain('Keep code changes minimal and explain any trade-offs.')
  })

  it('appends runtime evidence to non-fix-bug prompts only when evidence exists', () => {
    const runtimeContext = {
      summary: {
        runtimeErrorCount: 1,
        failedRequestCount: 1,
        includedRecordIds: ['err-1', 'req-1'],
      },
      records: [
        {
          id: 'err-1',
          kind: 'runtime-error' as const,
          message: 'Cannot read properties of undefined',
          timestamp: 120,
          occurrenceCount: 2,
          relevanceScore: 0.9,
          relevanceLevel: 'high' as const,
          relevanceReasons: ['stack references target file'],
          stack: 'at App (/repo/src/App.tsx:10:5)',
        },
        {
          id: 'req-1',
          kind: 'failed-request' as const,
          message: 'GET /api/user -> 500',
          timestamp: 121,
          occurrenceCount: 1,
          relevanceScore: 0.8,
          relevanceLevel: 'high' as const,
          relevanceReasons: ['request near target interaction'],
          request: { method: 'GET', pathname: '/api/user', status: 500 },
        },
      ],
    }

    const explainPrompt = buildPromptForIntent(
      {
        id: 'explain',
        prompt: 'Explain {{file}}',
      },
      { file: '/repo/src/App.tsx', line: 10, column: 5 },
      null,
      runtimeContext,
    )

    const plainPrompt = buildPromptForIntent(
      {
        id: 'explain',
        prompt: 'Explain {{file}}',
      },
      { file: '/repo/src/App.tsx', line: 10, column: 5 },
      null,
      {
        summary: { runtimeErrorCount: 0, failedRequestCount: 0, includedRecordIds: [] },
        records: [],
      },
    )

    expect(explainPrompt).toContain('Relevant runtime context:')
    expect(explainPrompt).toContain('Cannot read properties of undefined')
    expect(explainPrompt).toContain('GET /api/user -> 500')
    expect(plainPrompt).toContain('Explain /repo/src/App.tsx')
    expect(plainPrompt).not.toContain('Relevant runtime context:')
  })

  it('appends screenshot context when only an asset id is available', () => {
    const prompt = appendScreenshotContextToPrompt('Explain the issue.', {
      enabled: true,
      capturedAt: '2026-04-04T12:00:00.000Z',
      mimeType: 'image/png',
      imageAssetId: 'asset_123',
    })

    expect(prompt).toContain('Visual screenshot context attached:')
    expect(prompt).toContain('capturedAt=2026-04-04T12:00:00.000Z')
    expect(prompt).toContain('mimeType=image/png')
  })
})
