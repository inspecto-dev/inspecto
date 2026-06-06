import type { FeedbackRecord } from '@inspecto-dev/types'
import { describe, expect, it, vi } from 'vitest'
import { renderIncludedRecords } from '../src/features/annotate/sidebar/included-records.js'
import {
  annotateSidebarEmptyClass,
  annotateSidebarQueueItemClass,
  annotateSidebarQueueMetaClass,
} from '../src/shared/styles/index.js'

function createRecord(overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: 'record-1',
    displayOrder: 1,
    target: {
      id: 'target-1',
      label: 'Button.primary',
      location: { file: '/repo/App.tsx', line: 12, column: 4 },
      rect: { x: 0, y: 0, width: 120, height: 36 },
    },
    note: 'Tighten spacing.',
    intent: 'review',
    ...overrides,
  }
}

describe('annotate sidebar included records renderer', () => {
  it('renders the empty state when no records are included', () => {
    const recordsList = document.createElement('div')

    renderIncludedRecords([], recordsList, { onEditRecord: () => undefined })

    const empty = recordsList.querySelector(`.${annotateSidebarEmptyClass}`) as HTMLElement
    expect(empty).not.toBeNull()
    expect(empty.textContent).toBe('No records included yet.')
  })

  it('renders editable record rows with note fallback', () => {
    const recordsList = document.createElement('div')
    const onEditRecord = vi.fn()

    renderIncludedRecords(
      [
        createRecord(),
        createRecord({
          id: 'record-2',
          target: {
            id: 'target-2',
            label: '',
            location: { file: '/repo/App.tsx', line: 24, column: 2 },
            rect: { x: 0, y: 0, width: 80, height: 24 },
          },
          note: '   ',
        }),
      ],
      recordsList,
      { onEditRecord },
    )

    const items = Array.from(
      recordsList.querySelectorAll(`.${annotateSidebarQueueItemClass}`),
    ) as HTMLElement[]
    expect(items).toHaveLength(2)
    expect(items[0]?.getAttribute('role')).toBe('button')
    expect(items[0]?.getAttribute('aria-pressed')).toBe('false')
    expect(items[0]?.textContent).toContain('Button.primary')
    expect(items[0]?.textContent).toContain('Tighten spacing.')
    expect(items[1]?.textContent).toContain('Unknown target')
    expect(items[1]?.querySelector(`.${annotateSidebarQueueMetaClass}`)?.textContent).toBe(
      'Optional note left empty.',
    )

    items[0]?.click()
    items[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    items[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))

    expect(onEditRecord).toHaveBeenNthCalledWith(1, 'record-1')
    expect(onEditRecord).toHaveBeenNthCalledWith(2, 'record-2')
    expect(onEditRecord).toHaveBeenNthCalledWith(3, 'record-2')
  })
})
