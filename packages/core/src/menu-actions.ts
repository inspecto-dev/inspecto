import type {
  IntentConfig,
  RuntimeContextEnvelope,
  ScreenshotContext,
  SourceLocation,
} from '@inspecto-dev/types'
import { appendCssContextToPrompt } from './css-context.js'
import { appendScreenshotContextToPrompt, buildPromptForIntent } from './fix-bug-prompt.js'
import { fetchSnippet } from './http.js'
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
  resolveScreenshotContext: () => Promise<ScreenshotContext | null>
  resolveCssContextPrompt: (intent?: Pick<IntentConfig, 'id'>) => string | null
  onSend: (payload: {
    label: string
    button: HTMLButtonElement
    prompt: string
    snippetText: string
    runtimeContext: RuntimeContextEnvelope | null
    screenshotContext: ScreenshotContext | null
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
      btn.textContent = 'Sending...'

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
        const requestScreenshotContext = await input.resolveScreenshotContext()
        const requestCssContextPrompt = input.resolveCssContextPrompt(
          isFixUiIntent(intent) ? intent : undefined,
        )
        const prompt = appendCssContextToPrompt(
          appendScreenshotContextToPrompt(
            buildPromptForIntent(intent, input.location, snippetResult, requestRuntimeContext),
            requestScreenshotContext,
          ),
          requestCssContextPrompt,
        )

        await input.onSend({
          label,
          button: btn,
          prompt,
          snippetText: snippetResult?.snippet || '',
          runtimeContext: requestRuntimeContext,
          screenshotContext: requestScreenshotContext,
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
