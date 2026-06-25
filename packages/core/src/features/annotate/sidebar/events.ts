import { t } from '../../../shared/i18n.js'
import type { AnnotateSidebarDom } from './dom.js'
import type { AnnotateSidebarOptions } from './types.js'

export type AttachAnnotateSidebarEventsOptions = {
  dom: AnnotateSidebarDom
  getOptions(): AnnotateSidebarOptions
  toggleLatestSessionTimeline(): void
  handleInstructionInput(): void
}

const copiedIconSvg =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'

export function attachAnnotateSidebarEvents({
  dom,
  getOptions,
  toggleLatestSessionTimeline,
  handleInstructionInput,
}: AttachAnnotateSidebarEventsOptions): void {
  const {
    latestSessionRefreshButton,
    latestSessionTimelineToggle,
    previewButton,
    previewFloat,
    setRawPromptPreviewVisible,
    copyContextButton,
    quickAskButton,
    createTaskButton,
    instructionInput,
    cssContextButton,
    runtimeContextButton,
    exitButton,
    quickCaptureButton,
    modeButton,
  } = dom

  latestSessionRefreshButton.addEventListener('click', event => {
    event.preventDefault()
    getOptions().onRefreshLatestSession?.()
  })

  latestSessionTimelineToggle.addEventListener('click', event => {
    event.preventDefault()
    toggleLatestSessionTimeline()
  })

  previewButton.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    setRawPromptPreviewVisible(previewFloat.style.display !== 'block')
  })

  const originalCopyHtml = copyContextButton.innerHTML
  copyContextButton.addEventListener('click', event => {
    event.preventDefault()

    const promise = getOptions().onCopyContext?.()
    if (!promise) return

    copyContextButton.innerHTML = copiedIconSvg
    copyContextButton.title = t('annotate.copyContext.copied')
    promise
      .then(() => {
        setTimeout(() => {
          copyContextButton.innerHTML = originalCopyHtml
          copyContextButton.title = t('annotate.copyContext')
        }, 1500)
      })
      .catch(() => {
        copyContextButton.innerHTML = originalCopyHtml
        copyContextButton.title = t('annotate.copyContext')
      })
  })

  quickAskButton.addEventListener('click', event => {
    event.preventDefault()
    getOptions().onQuickAsk()
  })

  createTaskButton.addEventListener('click', event => {
    event.preventDefault()
    getOptions().onCreateTask()
  })

  cssContextButton.addEventListener('click', () => getOptions().onToggleCssContext?.())
  runtimeContextButton.addEventListener('click', () => getOptions().onToggleRuntimeContext?.())
  exitButton.addEventListener('click', () => getOptions().onExit())
  quickCaptureButton.addEventListener('click', () => getOptions().onToggleQuickCapture?.())
  modeButton.addEventListener('click', () => {
    const options = getOptions()
    if (options.mode === 'capture-enabled') {
      options.onPauseCapture()
    } else {
      options.onResumeCapture()
    }
  })

  instructionInput.addEventListener('input', handleInstructionInput)
}
