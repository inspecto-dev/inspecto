import type { AiIntentConfig, RuntimeContextEnvelope } from '@inspecto-dev/types'
import { appendCssContextToPrompt } from '../../evidence/css-context/index.js'
import { buildTargetEvidencePrompt } from '../../evidence/target-context/index.js'
import { buildPromptForIntent } from '../prompts/fix-bug-prompt.js'
import { fetchSnippet } from '../../../transport/http-client.js'
import { t } from '../../../shared/i18n.js'
import { isFixUiIntent } from './helpers.js'
import { menuItemClass } from '../../../shared/styles/index.js'
import { hasSourceLocation, type InspectMenuTargetContext } from './target.js'

export function createIntentActionButtons(input: {
  intents: AiIntentConfig[]
  target: InspectMenuTargetContext
  includeSnippet: boolean
  maxSnippetLines: number
  resolveRuntimeContext: (
    intent: Pick<AiIntentConfig, 'id' | 'aiIntent'>,
  ) => RuntimeContextEnvelope | null
  resolveCssContextPrompt: (intent?: Pick<AiIntentConfig, 'id'>) => string | null
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
        if (input.includeSnippet && hasSourceLocation(input.target)) {
          snippetResult = await fetchSnippet(
            input.target.location.file,
            input.target.location.line,
            input.target.location.column,
            input.maxSnippetLines,
          )
        }

        const requestRuntimeContext = input.resolveRuntimeContext(intent)
        const requestCssContextPrompt = input.resolveCssContextPrompt(
          isFixUiIntent(intent) ? intent : undefined,
        )
        const sourcePrompt = hasSourceLocation(input.target)
          ? buildPromptForIntent(
              intent,
              input.target.location,
              snippetResult,
              requestRuntimeContext,
            )
          : buildTargetEvidencePrompt({
              prompt: buildPromptTemplateForTargetEvidence(intent),
              ...(input.target.targetEvidence
                ? { targetEvidence: input.target.targetEvidence }
                : {}),
            })
        const prompt = appendCssContextToPrompt(sourcePrompt, requestCssContextPrompt)

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

function buildPromptTemplateForTargetEvidence(
  intent: Pick<AiIntentConfig, 'id' | 'label' | 'prompt' | 'prependPrompt' | 'appendPrompt'>,
): string {
  const prompt = [
    intent.prependPrompt,
    intent.prompt ?? intent.label ?? intent.id,
    intent.appendPrompt,
  ]
    .filter(Boolean)
    .join('\n\n')
  return prompt
}
