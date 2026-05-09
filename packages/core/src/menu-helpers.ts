import type {
  AiIntentConfig,
  InspectorOptions,
  RuntimeContextEnvelope,
  RuntimeEvidenceRecord,
  SourceLocation,
} from '@inspecto-dev/types'
import { runtimeSummaryLabel, t } from './i18n.js'
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
  input.placeholder = placeholder ?? t('menu.ask.placeholder.default')
  input.setAttribute('aria-label', t('menu.ask.ariaLabel'))

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
  errEl.textContent = formatMenuErrorMessage(message, errorCode)
  menu.appendChild(errEl)
}

function formatMenuErrorMessage(message: string, errorCode?: string): string {
  if (errorCode === 'CLIENT_CONFIG_UNAVAILABLE') {
    return [
      'Inspecto is not connected to the local dev server or could not load its client config.',
      'Restart your dev server and confirm `@inspecto-dev/plugin` is installed in the active build config, then run `inspecto doctor` or `npx @inspecto-dev/cli doctor` if this continues.',
    ].join(' ')
  }

  if (errorCode === 'SERVER_UNAVAILABLE') {
    return 'Inspecto could not reach the local dev server. Restart your dev server, then try again. If it still fails, run `inspecto doctor` or `npx @inspecto-dev/cli doctor` from the project root.'
  }

  if (errorCode === 'FILE_NOT_FOUND') {
    return 'Source file not found. Restart the dev server or run `npx @inspecto-dev/cli doctor` from the project root.'
  }

  if (errorCode === 'IDE_UNAVAILABLE' || errorCode === 'IDE_NOT_FOUND') {
    return 'Unable to open the source file in your editor. Confirm the editor command or URI scheme is available, and set the `ide` field in `.inspecto/settings.local.json` if auto-detection chooses the wrong editor.'
  }

  if (errorCode === 'EXTENSION_NOT_INSTALLED') {
    return 'The target AI extension is not installed or not available in this editor. Install it, then run `npx @inspecto-dev/cli doctor` if dispatch still fails.'
  }

  if (errorCode === 'CLIPBOARD_WRITE_FAILED') {
    return 'Inspecto could not write the fallback prompt to the clipboard. Check browser clipboard permissions and try again.'
  }

  return `Error: ${message}`
}

export function isFixIntent(intent: Pick<AiIntentConfig, 'id' | 'aiIntent'>): boolean {
  return intent.aiIntent === 'fix'
}

export function isFixUiIntent(intent: Pick<AiIntentConfig, 'id'>): boolean {
  return intent.id === 'fix-ui'
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
  toggle.textContent = t('menu.preview.show')

  const preview = document.createElement('div')
  preview.className = menuContextPreviewClass
  preview.hidden = true
  preview.textContent = formatRuntimeContextPreview(runtimeContext.records)

  toggle.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    preview.hidden = !preview.hidden
    toggle.textContent = preview.hidden ? t('menu.preview.show') : t('menu.preview.hide')
  })

  container.append(toggle, preview)
  return container
}

export function formatRuntimeContextSummary(runtimeContext: RuntimeContextEnvelope): string {
  const parts: string[] = []
  const { runtimeErrorCount, failedRequestCount } = runtimeContext.summary

  if (runtimeErrorCount > 0) {
    parts.push(runtimeSummaryLabel('error', runtimeErrorCount))
  }

  if (failedRequestCount > 0) {
    parts.push(runtimeSummaryLabel('request', failedRequestCount))
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
