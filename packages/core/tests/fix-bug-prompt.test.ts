import { describe, expect, it } from 'vitest'
import {
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

  it('renders a concise evidence-guided fix-bug prompt with optional custom guidance', () => {
    const prompt = buildFixBugPrompt({
      template: 'Use Simplified Chinese in the final answer.',
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

    expect(prompt).toContain('Fix the bug for the inspected UI target.')
    expect(prompt).toContain('Target source context:')
    expect(prompt).toContain('Runtime evidence:')
    expect(prompt).toContain('Task:')
    expect(prompt).toContain('Additional guidance:')
    expect(prompt).toContain('Use Simplified Chinese in the final answer.')
    expect(prompt).not.toContain('Guardrails:')
    expect(prompt).not.toContain('Response contract:')
    expect(prompt).not.toContain('Configured intent guidance')
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

    expect(fixBugPrompt).toContain('Fix the bug for the inspected UI target.')
    expect(fixBugPrompt).toContain('Cannot read properties of undefined')
    expect(fixBugPrompt).not.toContain('None selected. Do not treat unrelated logs as proof.')
    expect(fixBugPrompt).not.toContain('Fix {{file}}')
    expect(explainPrompt).toContain('Explain /repo/src/App.tsx')
    expect(explainPrompt).not.toContain('Fix the bug for the inspected UI target.')
  })

  it('preserves prepend and append guidance for fix-bug intents without re-adding the base template', () => {
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

    expect(fixBugPrompt).toContain('Additional guidance:')
    expect(fixBugPrompt).toContain('Use Simplified Chinese in the final answer.')
    expect(fixBugPrompt).toContain('Keep code changes minimal and explain any trade-offs.')
    expect(fixBugPrompt).not.toContain('Fix {{file}}')
    expect(fixBugPrompt).not.toContain('Configured intent guidance')
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
})
