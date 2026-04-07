import type {
  InspectorOptions,
  IntentConfig,
  RuntimeContextEnvelope,
  RuntimeEvidenceRecord,
  SourceLocation,
} from '@inspecto-dev/types'
import {
  errorMsgClass,
  menuContextPreviewClass,
  menuContextSummaryClass,
  menuContextToggleClass,
  menuInputClass,
  menuInputIconClass,
  menuInputWrapperClass,
  menuSectionClass,
} from './styles.js'

export function formatSourceAnchor(location: SourceLocation): string {
  const fileName = location.file.split('/').pop() || location.file
  return `${fileName}:${location.line}:${location.column}`
}

export function formatRuntimeErrorCount(count: number): string {
  if (count > 99) return '99+'
  return String(count)
}

export function createMenuSection(): HTMLDivElement {
  const section = document.createElement('div')
  section.className = menuSectionClass
  return section
}

export function createAskInput(placeholder?: string) {
  const inputWrapper = document.createElement('div')
  inputWrapper.className = menuInputWrapperClass

  const input = document.createElement('input')
  input.className = menuInputClass
  input.type = 'text'
  input.placeholder = placeholder ?? 'Add a custom ask or extra instruction...'
  input.setAttribute('aria-label', 'Custom ask')

  const sendIcon = document.createElement('div')
  sendIcon.className = menuInputIconClass
  sendIcon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`
  sendIcon.style.cursor = 'pointer'

  inputWrapper.appendChild(input)
  inputWrapper.appendChild(sendIcon)

  return { input, inputWrapper, sendIcon }
}

export function showError(menu: HTMLElement, message: string, errorCode?: string): void {
  menu.querySelector(`.${errorMsgClass}`)?.remove()

  const errEl = document.createElement('div')
  errEl.className = errorMsgClass
  errEl.textContent =
    errorCode === 'FILE_NOT_FOUND'
      ? 'Source file not found. Is the server running?'
      : `Error: ${message}`
  menu.appendChild(errEl)
}

export function isFixIntent(intent: Pick<IntentConfig, 'id' | 'aiIntent'>): boolean {
  return intent.aiIntent === 'fix'
}

export function createRuntimeContextUi(
  runtimeContext: RuntimeContextEnvelope | null,
  options: InspectorOptions,
): HTMLDivElement | null {
  if (!runtimeContext) return null

  const summary = formatRuntimeContextSummary(runtimeContext)
  if (!summary) return null

  const container = document.createElement('div')
  container.style.display = 'flex'
  container.style.flexDirection = 'column'
  container.style.gap = '4px'

  const summaryEl = document.createElement('div')
  summaryEl.className = menuContextSummaryClass
  summaryEl.textContent = summary
  container.appendChild(summaryEl)

  if (options.runtimeContext?.preview !== true || runtimeContext.records.length === 0) {
    return container
  }

  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = menuContextToggleClass
  toggle.textContent = 'Show preview'

  const preview = document.createElement('div')
  preview.className = menuContextPreviewClass
  preview.hidden = true
  preview.textContent = formatRuntimeContextPreview(runtimeContext.records)

  toggle.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    preview.hidden = !preview.hidden
    toggle.textContent = preview.hidden ? 'Show preview' : 'Hide preview'
  })

  container.append(toggle, preview)
  return container
}

export function formatRuntimeContextSummary(runtimeContext: RuntimeContextEnvelope): string {
  const parts: string[] = []
  const { runtimeErrorCount, failedRequestCount } = runtimeContext.summary

  if (runtimeErrorCount > 0) {
    parts.push(
      `${runtimeErrorCount} ${runtimeErrorCount === 1 ? 'runtime error' : 'runtime errors'}`,
    )
  }

  if (failedRequestCount > 0) {
    parts.push(
      `${failedRequestCount} ${failedRequestCount === 1 ? 'failed request' : 'failed requests'}`,
    )
  }

  return parts.join(' • ')
}

export function formatRuntimeContextPreview(records: RuntimeEvidenceRecord[]): string {
  return records
    .slice(0, 3)
    .map(record => {
      const details =
        record.kind === 'failed-request'
          ? `${record.request?.method ?? 'GET'} ${record.request?.pathname ?? record.request?.url ?? ''}`.trim()
          : `${record.occurrenceCount}x`
      return `[${record.kind}] ${record.message}\n${details}`
    })
    .join('\n\n')
}
