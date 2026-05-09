import type { RuntimeContextEnvelope, SourceLocation } from '@inspecto-dev/types'
import { appendCssContextToPrompt } from './css-context.js'
import { appendRuntimeContextToPrompt } from './fix-bug-prompt.js'
import { buildPrompt, CUSTOM_PROMPT_TEMPLATE } from './intents.js'
import { fetchSnippet, openFileWithDiagnostics, sendToAi } from './http.js'

export async function openAndSendInspectPrompt(input: {
  location: SourceLocation
  snippetText: string
  promptText: string
  runtimeContext?: RuntimeContextEnvelope | null
  onSuccess: () => void
  onRestore: () => void
  onError: (message: string, errorCode?: string) => void
}): Promise<void> {
  const openResult = await openFileWithDiagnostics(input.location)
  if (!openResult.success) {
    input.onRestore()
    input.onError('Unable to open the source file.', openResult.errorCode ?? 'IDE_UNAVAILABLE')
    return
  }

  await new Promise(r => setTimeout(r, 100))

  const result = await sendToAi({
    location: input.location,
    snippet: input.snippetText,
    prompt: input.promptText,
    ...(input.runtimeContext ? { runtimeContext: input.runtimeContext } : {}),
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
  targetLabel?: string
  includeSnippet: boolean
  maxSnippetLines: number
  runtimeContext?: RuntimeContextEnvelope | null
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
    appendRuntimeContextToPrompt(
      buildPrompt(
        buildCustomInspectPromptTemplate(input.ask.trim(), input.location, input.targetLabel),
        input.location,
        snippetResult,
      ),
      input.runtimeContext?.records ?? [],
    ),
    input.cssContextPrompt ?? null,
  )

  return {
    prompt,
    snippetText: snippetResult?.snippet || '',
  }
}

function buildCustomInspectPromptTemplate(
  ask: string,
  location: SourceLocation,
  targetLabel?: string,
): string {
  const sections = [CUSTOM_PROMPT_TEMPLATE(ask)]

  if (targetLabel?.trim()) {
    sections.push(`Selected component:\n- ${targetLabel.trim()}`)
  }

  sections.push(
    `Source location:\n- file: ${location.file}\n- location: ${location.line}:${location.column}`,
  )

  return sections.join('\n\n')
}
