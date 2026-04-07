import type {
  AnnotationTarget,
  AnnotationIntent,
  FeedbackRecord,
  FeedbackRecordDraft,
  FeedbackRecordSession,
} from '@inspecto-dev/types'

function sameLocation(a: AnnotationTarget, b: AnnotationTarget): boolean {
  return (
    a.location.file === b.location.file &&
    a.location.line === b.location.line &&
    a.location.column === b.location.column &&
    a.selector === b.selector
  )
}

function createId(prefix: string): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )
}

function createEmptyRecordDraft(): FeedbackRecordDraft {
  return {
    id: createId('record'),
    target: null,
    note: '',
    intent: 'review',
    cssContextEnabled: false,
  }
}

function getNextDisplayOrder(session: FeedbackRecordSession): number {
  return (
    session.records.reduce((maxOrder, record) => Math.max(maxOrder, record.displayOrder), 0) + 1
  )
}

export function createEmptySession(): FeedbackRecordSession {
  return {
    current: createEmptyRecordDraft(),
    records: [],
  }
}

export function setCurrentRecordTarget(
  session: FeedbackRecordSession,
  target: AnnotationTarget,
): FeedbackRecordSession {
  const existingRecord = session.records.find(record => sameLocation(record.target, target))
  if (existingRecord) {
    return {
      ...session,
      current: {
        id: existingRecord.id,
        displayOrder: existingRecord.displayOrder,
        target: existingRecord.target,
        note: existingRecord.note,
        intent: existingRecord.intent,
        cssContextEnabled: existingRecord.cssContextEnabled ?? false,
      },
      records: session.records.filter(record => record.id !== existingRecord.id),
    }
  }

  return {
    ...session,
    current: {
      ...session.current,
      target,
      cssContextEnabled: session.current.target
        ? (session.current.cssContextEnabled ?? false)
        : false,
    },
  }
}

export function updateCurrentRecordNote(
  session: FeedbackRecordSession,
  note: string,
): FeedbackRecordSession {
  return {
    ...session,
    current: {
      ...session.current,
      note,
    },
  }
}

export function updateCurrentRecordIntent(
  session: FeedbackRecordSession,
  intent: AnnotationIntent,
): FeedbackRecordSession {
  return {
    ...session,
    current: {
      ...session.current,
      intent,
    },
  }
}

export function updateCurrentRecordCssContextEnabled(
  session: FeedbackRecordSession,
  enabled: boolean,
): FeedbackRecordSession {
  return {
    ...session,
    current: {
      ...session.current,
      cssContextEnabled: enabled,
    },
  }
}

export function clearCurrentRecord(session: FeedbackRecordSession): FeedbackRecordSession {
  return {
    ...session,
    current: createEmptyRecordDraft(),
  }
}

export function saveCurrentRecord(session: FeedbackRecordSession): FeedbackRecordSession {
  const { current } = session
  if (!current.target) {
    return session
  }

  const record: FeedbackRecord = {
    id: current.id,
    displayOrder: current.displayOrder ?? getNextDisplayOrder(session),
    target: current.target,
    note: current.note,
    intent: current.intent,
    cssContextEnabled: current.cssContextEnabled ?? false,
  }

  return {
    ...session,
    current: createEmptyRecordDraft(),
    records: [...session.records, record],
  }
}

export function removeRecord(
  session: FeedbackRecordSession,
  recordId: string,
): FeedbackRecordSession {
  return {
    ...session,
    records: session.records.filter(record => record.id !== recordId),
  }
}

export function editRecord(
  session: FeedbackRecordSession,
  recordId: string,
): FeedbackRecordSession {
  const record = session.records.find(entry => entry.id === recordId)
  if (!record) return session

  return {
    ...session,
    current: {
      id: record.id,
      displayOrder: record.displayOrder,
      target: record.target,
      note: record.note,
      intent: record.intent,
      cssContextEnabled: record.cssContextEnabled ?? false,
    },
    records: session.records.filter(entry => entry.id !== recordId),
  }
}
