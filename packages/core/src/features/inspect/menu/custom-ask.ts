import type { RuntimeContextEnvelope } from '@inspecto-dev/types'
import { buildCustomInspectPrompt, openAndSendInspectPrompt } from './send.js'
import type { InspectMenuTargetContext } from './target.js'

export type CustomAskSubmitOptions = {
  input: HTMLInputElement
  sendIcon: HTMLElement
  target: InspectMenuTargetContext
  includeSnippet: boolean
  maxSnippetLines: number
  resolveRuntimeContext: () => RuntimeContextEnvelope | null
  resolveCssContextPrompt: () => string | null
  onSuccess: () => void
  onError: (message: string, errorCode?: string) => void
}

export function attachCustomAskSubmit(options: CustomAskSubmitOptions): void {
  const submitAsk = async (): Promise<void> => {
    if (!options.input.value.trim()) return
    options.input.disabled = true
    options.sendIcon.style.pointerEvents = 'none'

    try {
      const requestRuntimeContext = options.resolveRuntimeContext()
      const requestCssContextPrompt = options.resolveCssContextPrompt()
      const built = await buildCustomInspectPrompt({
        target: options.target,
        ask: options.input.value.trim(),
        includeSnippet: options.includeSnippet,
        maxSnippetLines: options.maxSnippetLines,
        runtimeContext: requestRuntimeContext,
        cssContextPrompt: requestCssContextPrompt,
      })
      await openAndSendInspectPrompt({
        target: options.target,
        promptText: built.prompt,
        snippetText: built.snippetText,
        runtimeContext: requestRuntimeContext,
        onSuccess: options.onSuccess,
        onRestore: () => {
          options.input.disabled = false
          options.sendIcon.style.pointerEvents = 'auto'
        },
        onError: options.onError,
      })
    } catch (err) {
      options.input.disabled = false
      options.sendIcon.style.pointerEvents = 'auto'
      options.onError((err as Error).message, (err as { errorCode?: string }).errorCode)
    }
  }

  options.input.addEventListener('keydown', event => {
    if (event.key === 'Enter') submitAsk()
  })
  options.sendIcon.addEventListener('click', submitAsk)
}
