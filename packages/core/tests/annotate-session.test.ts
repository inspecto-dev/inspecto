import { describe, expect, it } from 'vitest'
import {
  createEmptySession,
  editRecord,
  removeRecord,
  saveCurrentRecord,
  setCurrentRecordTarget,
  updateCurrentRecordIntent,
  updateCurrentRecordNote,
} from '../src/annotate-session.js'

function createTarget(id: string, line: number, label: string) {
  return {
    id,
    location: { file: '/repo/App.tsx', line, column: 4 },
    label,
    rect: { x: 0, y: 0, width: 10, height: 10 },
  }
}

describe('annotate session state', () => {
  it('starts a current record from a clicked target and saves it into the records list', () => {
    const session = updateCurrentRecordNote(
      setCurrentRecordTarget(createEmptySession(), createTarget('t1', 12, 'Button.primary')),
      'Tighten the button label spacing.',
    )

    const next = saveCurrentRecord(session)

    expect(next.records).toHaveLength(1)
    expect(next.records[0]).toMatchObject({
      note: 'Tighten the button label spacing.',
      intent: 'review',
      target: {
        label: 'Button.primary',
      },
    })
    expect(next.current.target).toBeNull()
    expect(next.current.note).toBe('')
  })

  it('loads an existing record back into the composer when the same source location is picked again', () => {
    const saved = saveCurrentRecord(
      updateCurrentRecordNote(
        setCurrentRecordTarget(createEmptySession(), createTarget('t1', 12, 'Button.primary')),
        'Tighten the button label spacing.',
      ),
    )

    const next = setCurrentRecordTarget(saved, createTarget('t2', 12, 'Button.secondary'))

    expect(next.records).toHaveLength(0)
    expect(next.current.note).toBe('Tighten the button label spacing.')
    expect(next.current.target?.label).toBe('Button.primary')
  })

  it('removes and edits saved records independently', () => {
    const firstSaved = saveCurrentRecord(
      updateCurrentRecordNote(
        setCurrentRecordTarget(createEmptySession(), createTarget('t1', 12, 'Button.primary')),
        'Adjust button spacing.',
      ),
    )
    const secondSaved = saveCurrentRecord(
      updateCurrentRecordNote(
        setCurrentRecordTarget(firstSaved, createTarget('t2', 16, 'HelperText')),
        'Raise helper text.',
      ),
    )

    const edited = editRecord(secondSaved, secondSaved.records[0]!.id)
    expect(edited.current.note).toBe('Adjust button spacing.')
    expect(edited.records).toHaveLength(1)

    const removed = removeRecord(secondSaved, secondSaved.records[1]!.id)
    expect(removed.records).toHaveLength(1)
    expect(removed.records[0]?.note).toBe('Adjust button spacing.')
  })

  it('updates the current record intent independently', () => {
    const session = updateCurrentRecordIntent(createEmptySession(), 'redesign')
    expect(session.current.intent).toBe('redesign')
  })

  it('saves a selected target even when the note is empty', () => {
    const session = setCurrentRecordTarget(createEmptySession(), createTarget('t1', 20, 'ListItem'))

    const next = saveCurrentRecord(session)

    expect(next.records).toHaveLength(1)
    expect(next.records[0]).toMatchObject({
      note: '',
      target: {
        label: 'ListItem',
      },
    })
  })
})
