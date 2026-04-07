import type {
  AnnotationTransport,
  RuntimeContextEnvelope,
  RuntimeEvidenceRecord,
  ScreenshotContext,
} from '@inspecto-dev/types'
import { appendCssContextToPrompt } from './css-context.js'

export function buildAnnotateFullPrompt(input: {
  instruction: string
  annotations: AnnotationTransport[]
  responseMode: 'unified' | 'per-annotation'
  runtimeContext?: RuntimeContextEnvelope | null
  screenshotContext?: ScreenshotContext | null
  cssContextPrompt?: string | null
}): string {
  const instruction = input.instruction.trim()
  const body = buildSelectedElementsPrompt(input.annotations)

  const prompt = instruction ? `${instruction}\n\n${body}` : body
  return appendScreenshotContextSection(
    appendCssContextToPrompt(
      appendRuntimeContextSection(prompt, input.runtimeContext),
      input.cssContextPrompt,
    ),
    input.screenshotContext,
  )
}

function buildSelectedElementsPrompt(annotations: AnnotationTransport[]): string {
  const lines = ['Selected elements:']

  for (const annotation of annotations) {
    const trimmedNote = annotation.note.trim()
    for (const target of annotation.targets) {
      const targetLabel = (target.label || 'Unknown target').trim() || 'Unknown target'
      lines.push(`- ${targetLabel}`)
      lines.push(
        `file=${formatLocation(target.location.file, target.location.line, target.location.column)}`,
      )
      if (trimmedNote) {
        lines.push(`note=${trimmedNote}`)
      }
    }
  }

  if (lines.length === 1) {
    lines.push('- None')
  }

  return lines.join('\n')
}

function formatLocation(file: string, line: number, column: number): string {
  return `${file}:${line}:${column}`
}

function appendRuntimeContextSection(
  prompt: string,
  runtimeContext: RuntimeContextEnvelope | null | undefined,
): string {
  if (!runtimeContext?.records.length) return prompt
  return `${prompt}\n\n${buildRuntimeContextSection(runtimeContext.records)}`
}

function appendScreenshotContextSection(
  prompt: string,
  screenshotContext: ScreenshotContext | null | undefined,
): string {
  if (!screenshotContext || (!screenshotContext.imageDataUrl && !screenshotContext.imageAssetId)) {
    return prompt
  }

  const lines = [
    'Visual screenshot context attached:',
    `- capturedAt=${screenshotContext.capturedAt}`,
    `- mimeType=${screenshotContext.mimeType}`,
  ]

  if (screenshotContext.imageAssetId) {
    lines.push(`- imageAssetId=${screenshotContext.imageAssetId}`)
  }

  return `${prompt}\n\n${lines.join('\n')}`
}

function buildRuntimeContextSection(records: RuntimeEvidenceRecord[]): string {
  return ['Relevant runtime context:', ...records.map(formatRuntimeRecord)].join('\n')
}

function formatRuntimeRecord(record: RuntimeEvidenceRecord): string {
  const requestSummary =
    record.kind === 'failed-request'
      ? `request=${record.request?.method ?? 'GET'} ${record.request?.pathname ?? record.request?.url ?? 'unknown'} status=${record.request?.status ?? 'unknown'}`
      : `occurrences=${record.occurrenceCount}`
  const reasonSummary = record.relevanceReasons.length
    ? record.relevanceReasons.join('; ')
    : 'timing-based'
  const stackSummary = record.stack
    ? `\n  stack=${record.stack.split('\n').slice(0, 5).join(' | ')}`
    : ''

  return [
    `- [${record.kind}] ${record.message}`,
    `  relevance=${record.relevanceLevel} (${reasonSummary})`,
    `  ${requestSummary}`,
    stackSummary,
  ]
    .filter(Boolean)
    .join('\n')
}
