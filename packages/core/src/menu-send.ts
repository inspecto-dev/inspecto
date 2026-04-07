import type { RuntimeContextEnvelope, ScreenshotContext, SourceLocation } from '@inspecto-dev/types'
import { appendCssContextToPrompt } from './css-context.js'
import { appendRuntimeContextToPrompt, appendScreenshotContextToPrompt } from './fix-bug-prompt.js'
import { buildPrompt, CUSTOM_PROMPT_TEMPLATE } from './intents.js'
import { fetchSnippet, openFile, sendToAi } from './http.js'

export async function openAndSendInspectPrompt(input: {
  location: SourceLocation
  snippetText: string
  promptText: string
  runtimeContext?: RuntimeContextEnvelope | null
  screenshotContext?: ScreenshotContext | null
  onSuccess: () => void
  onRestore: () => void
  onError: (message: string, errorCode?: string) => void
}): Promise<void> {
  const opened = await openFile(input.location)
  if (!opened) {
    input.onRestore()
    input.onError('Unable to open file in the IDE.', 'IDE_UNAVAILABLE')
    return
  }

  await new Promise(r => setTimeout(r, 100))

  const result = await sendToAi({
    location: input.location,
    snippet: input.snippetText,
    prompt: input.promptText,
    ...(input.runtimeContext ? { runtimeContext: input.runtimeContext } : {}),
    ...(input.screenshotContext ? { screenshotContext: input.screenshotContext } : {}),
  })

  if (result.success) {
    if (result.fallbackPayload?.prompt) {
      try {
        await navigator.clipboard.writeText(result.fallbackPayload.prompt)
      } catch {
        // ignore clipboard fallback failures
      }
    }
    input.onSuccess()
    return
  }

  input.onRestore()
  input.onError(result.error ?? 'Unknown error', result.errorCode)
}

export async function buildCustomInspectPrompt(input: {
  location: SourceLocation
  ask: string
  includeSnippet: boolean
  maxSnippetLines: number
  runtimeContext?: RuntimeContextEnvelope | null
  screenshotContext?: ScreenshotContext | null
  cssContextPrompt?: string | null
}) {
  let snippetResult = null
  if (input.includeSnippet) {
    snippetResult = await fetchSnippet(
      input.location.file,
      input.location.line,
      input.location.column,
      input.maxSnippetLines,
    )
  }

  const prompt = appendCssContextToPrompt(
    appendScreenshotContextToPrompt(
      appendRuntimeContextToPrompt(
        buildPrompt(CUSTOM_PROMPT_TEMPLATE(input.ask.trim()), input.location, snippetResult),
        input.runtimeContext?.records ?? [],
      ),
      input.screenshotContext ?? null,
    ),
    input.cssContextPrompt ?? null,
  )

  return {
    prompt,
    snippetText: snippetResult?.snippet || '',
  }
}
