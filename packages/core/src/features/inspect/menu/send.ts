import type { RuntimeContextEnvelope, SourceLocation } from '@inspecto-dev/types'
import { appendCssContextToPrompt } from '../../evidence/css-context/index.js'
import { buildTargetEvidencePrompt } from '../../evidence/target-context/index.js'
import { appendRuntimeContextToPrompt } from '../prompts/fix-bug-prompt.js'
import { buildPrompt, CUSTOM_PROMPT_TEMPLATE } from '../prompts/intents.js'
import { fetchSnippet, openFileWithDiagnostics, sendToAi } from '../../../transport/http-client.js'
import { getSourceLocation, hasSourceLocation, type InspectMenuTargetContext } from './target.js'

export async function openAndSendInspectPrompt(input: {
  target: InspectMenuTargetContext
  snippetText: string
  promptText: string
  runtimeContext?: RuntimeContextEnvelope | null
  onSuccess: () => void
  onRestore: () => void
  onError: (message: string, errorCode?: string) => void
}): Promise<void> {
  const location = getSourceLocation(input.target)
  if (location) {
    const openResult = await openFileWithDiagnostics(location)
    if (!openResult.success) {
      input.onRestore()
      input.onError('Unable to open the source file.', openResult.errorCode ?? 'IDE_UNAVAILABLE')
      return
    }

    await new Promise(r => setTimeout(r, 100))
  }

  const result = await sendToAi({
    ...(location ? { location } : {}),
    snippet: input.snippetText,
    prompt: input.promptText,
    ...(input.runtimeContext ? { runtimeContext: input.runtimeContext } : {}),
  })

  if (result.success) {
    if (result.fallbackPayload?.prompt) {
      await writePromptToClipboard(result.fallbackPayload.prompt).catch(() => undefined)
    }
    input.onSuccess()
    return
  }

  if (!location && result.errorCode === 'SERVER_UNAVAILABLE') {
    const copied = await writePromptToClipboard(input.promptText)
    if (copied) {
      input.onSuccess()
      return
    }

    input.onRestore()
    input.onError('Unable to copy the fallback prompt to the clipboard.', 'CLIPBOARD_WRITE_FAILED')
    return
  }

  input.onRestore()
  input.onError(result.error ?? 'Unknown error', result.errorCode)
}

export async function writePromptToClipboard(prompt: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(prompt)
    return true
  } catch {
    return false
  }
}

export async function buildCustomInspectPrompt(input: {
  target: InspectMenuTargetContext
  ask: string
  includeSnippet: boolean
  maxSnippetLines: number
  runtimeContext?: RuntimeContextEnvelope | null
  cssContextPrompt?: string | null
}) {
  let snippetResult = null
  if (input.includeSnippet && hasSourceLocation(input.target)) {
    snippetResult = await fetchSnippet(
      input.target.location.file,
      input.target.location.line,
      input.target.location.column,
      input.maxSnippetLines,
    )
  }

  const basePrompt = hasSourceLocation(input.target)
    ? buildPrompt(
        buildCustomInspectPromptTemplate(
          input.ask.trim(),
          input.target.location,
          input.target.targetLabel,
        ),
        input.target.location,
        snippetResult,
      )
    : buildCustomInspectEvidencePrompt(input.ask.trim(), input.target)

  const prompt = appendCssContextToPrompt(
    appendRuntimeContextToPrompt(basePrompt, input.runtimeContext?.records ?? []),
    input.cssContextPrompt ?? null,
  )

  return {
    prompt,
    snippetText: snippetResult?.snippet || '',
  }
}

function buildCustomInspectEvidencePrompt(ask: string, target: InspectMenuTargetContext): string {
  return buildTargetEvidencePrompt({
    prompt: CUSTOM_PROMPT_TEMPLATE(ask),
    ...(target.targetLabel ? { targetLabel: target.targetLabel } : {}),
    ...(target.targetEvidence ? { targetEvidence: target.targetEvidence } : {}),
  })
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
