import type { IntentConfig, RuntimeContextEnvelope, SourceLocation } from '@inspecto-dev/types'
import { appendCssContextToPrompt } from './css-context.js'
import { buildPromptForIntent } from './fix-bug-prompt.js'
import { fetchSnippet } from './http.js'
import { t } from './i18n.js'
import { isFixUiIntent } from './menu-helpers.js'
import { menuItemClass } from './styles.js'

export function createIntentActionButtons(input: {
  intents: IntentConfig[]
  location: SourceLocation
  includeSnippet: boolean
  maxSnippetLines: number
  resolveRuntimeContext: (
    intent: Pick<IntentConfig, 'id' | 'aiIntent'>,
  ) => RuntimeContextEnvelope | null
  resolveCssContextPrompt: (intent?: Pick<IntentConfig, 'id'>) => string | null
  onSend: (payload: {
    label: string
    button: HTMLButtonElement
    prompt: string
    snippetText: string
    runtimeContext: RuntimeContextEnvelope | null
  }) => Promise<void>
  onError: (message: string, errorCode?: string) => void
}): HTMLButtonElement[] {
  return input.intents.map(intent => {
    const label = intent.label ?? intent.id
    const btn = document.createElement('button')
    btn.className = menuItemClass
    btn.dataset.role = 'ai-secondary'
    btn.textContent = label
    btn.addEventListener('click', async event => {
      event.stopPropagation()
      btn.disabled = true
      btn.textContent = t('menu.sending')

      try {
        let snippetResult = null
        if (input.includeSnippet) {
          snippetResult = await fetchSnippet(
            input.location.file,
            input.location.line,
            input.location.column,
            input.maxSnippetLines,
          )
        }

        const requestRuntimeContext = input.resolveRuntimeContext(intent)
        const requestCssContextPrompt = input.resolveCssContextPrompt(
          isFixUiIntent(intent) ? intent : undefined,
        )
        const prompt = appendCssContextToPrompt(
          buildPromptForIntent(intent, input.location, snippetResult, requestRuntimeContext),
          requestCssContextPrompt,
        )

        await input.onSend({
          label,
          button: btn,
          prompt,
          snippetText: snippetResult?.snippet || '',
          runtimeContext: requestRuntimeContext,
        })
      } catch (err) {
        btn.disabled = false
        btn.textContent = label
        input.onError((err as Error).message, (err as { errorCode?: string }).errorCode)
      }
    })

    return btn
  })
}
