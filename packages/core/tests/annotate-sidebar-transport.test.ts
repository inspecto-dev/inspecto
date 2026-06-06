import { describe, expect, it } from 'vitest'
import type { FeedbackRecordSession } from '@inspecto-dev/types'
import {
  collectAnnotationTransportsFromSession,
  formatAnnotationContextAsMarkdown,
} from '../src/runtime/annotate-sidebar-transport.js'

function createSession(): FeedbackRecordSession {
  return {
    current: {
      id: 'draft-1',
      displayOrder: 2,
      target: {
        id: 'target-current',
        label: 'Input.email',
        location: { file: '/repo/src/Form.tsx', line: 20, column: 5 },
        selector: '#email',
        rect: { x: 0, y: 0, width: 120, height: 24 },
      },
      note: 'Validate the field before submit.',
      intent: 'review',
    },
    records: [
      {
        id: 'record-1',
        displayOrder: 1,
        target: {
          id: 'target-1',
          label: 'Button.primary',
          location: { file: '/repo/src/Button.tsx', line: 10, column: 3 },
          selector: 'button.primary',
          rect: { x: 0, y: 0, width: 80, height: 32 },
        },
        note: 'Tighten spacing.',
        intent: 'review',
      },
    ],
  }
}

describe('annotate sidebar transport helpers', () => {
  it('collects saved records and the current draft as annotation transports', () => {
    expect(collectAnnotationTransportsFromSession(createSession())).toEqual([
      {
        note: 'Tighten spacing.',
        intent: 'review',
        targets: [
          {
            label: 'Button.primary',
            location: { file: '/repo/src/Button.tsx', line: 10, column: 3 },
            selector: 'button.primary',
          },
        ],
      },
      {
        note: 'Validate the field before submit.',
        intent: 'review',
        targets: [
          {
            label: 'Input.email',
            location: { file: '/repo/src/Form.tsx', line: 20, column: 5 },
            selector: '#email',
          },
        ],
      },
    ])
  })

  it('formats clipboard context as markdown with compact target locations', () => {
    const markdown = formatAnnotationContextAsMarkdown(
      'Review the selected elements.',
      collectAnnotationTransportsFromSession(createSession()),
    )

    expect(markdown).toContain('Review the selected elements.')
    expect(markdown).toContain('### Selected Elements')
    expect(markdown).toContain('**Annotation 1**')
    expect(markdown).toContain('* Note: Tighten spacing.')
    expect(markdown).toContain('- Label: `Button.primary`')
    expect(markdown).toContain('- Location: `Button.tsx:10:3`')
    expect(markdown).toContain('- Selector: `button.primary`')
    expect(markdown).toContain('**Annotation 2**')
    expect(markdown).toContain('- Location: `Form.tsx:20:5`')
    expect(markdown).toContain('- Selector: `#email`')
  })
})
