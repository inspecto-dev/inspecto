import type { FeedbackRecord } from '@inspecto-dev/types'
import {
  annotateSidebarEmptyClass,
  annotateSidebarQueueItemClass,
  annotateSidebarQueueMetaClass,
} from '../../../shared/styles/index.js'
import { t } from '../../../shared/i18n.js'

type IncludedRecordsOptions = {
  onEditRecord?: (id: string) => void
}

export function renderIncludedRecords(
  records: FeedbackRecord[],
  recordsList: HTMLElement,
  options: IncludedRecordsOptions,
): void {
  recordsList.replaceChildren()

  if (records.length === 0) {
    const empty = document.createElement('div')
    empty.className = annotateSidebarEmptyClass
    empty.textContent = t('annotate.records.none')
    recordsList.appendChild(empty)
    return
  }

  for (const record of records) {
    recordsList.appendChild(createIncludedRecordItem(record, options))
  }
}

function createIncludedRecordItem(
  record: FeedbackRecord,
  options: IncludedRecordsOptions,
): HTMLDivElement {
  const item = document.createElement('div')
  item.className = annotateSidebarQueueItemClass
  item.tabIndex = 0
  item.setAttribute('role', 'button')
  item.setAttribute('aria-pressed', 'false')
  item.addEventListener('click', () => options.onEditRecord?.(record.id))
  item.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      options.onEditRecord?.(record.id)
    }
  })

  const label = document.createElement('div')
  label.textContent = record.target.label || t('annotate.target.unknown')

  const meta = document.createElement('div')
  meta.className = annotateSidebarQueueMetaClass
  meta.textContent = record.note.trim().length > 0 ? record.note : t('annotate.note.optionalEmpty')

  item.append(label, meta)
  return item
}
