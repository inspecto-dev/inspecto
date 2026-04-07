import type {
  AnnotationIntent,
  AiErrorCode,
  RuntimeContextEnvelope,
  RuntimeEvidenceRecord,
  ScreenshotContext,
  SendAnnotationsToAiRequest,
  SendAnnotationsToAiResponse,
  ServerState,
} from '@inspecto-dev/types'
import { dispatchPromptThroughIde, resolvePromptDispatchRuntime } from './dispatch-runtime.js'
import { assertPathWithinProject, resolveWorkspacePath } from './path-guards.js'

export interface NormalizedAnnotationTarget {
  file: string
  line: number
  column: number
  label?: string
  selector?: string
  snippet?: string
}

export interface NormalizedAnnotation {
  index: number
  note: string
  intent: AnnotationIntent
  targets: NormalizedAnnotationTarget[]
}

export interface NormalizedAnnotationBatch {
  instruction: string
  responseMode: 'unified' | 'per-annotation'
  annotations: NormalizedAnnotation[]
  runtimeContext?: RuntimeContextEnvelope
  screenshotContext?: ScreenshotContext
  cssContextPrompt?: string
}

class AnnotationDispatchError extends Error {
  readonly errorCode: AiErrorCode

  constructor(message: string, errorCode: AiErrorCode) {
    super(message)
    this.name = 'AnnotationDispatchError'
    this.errorCode = errorCode
  }
}

export async function dispatchAnnotationsToAi(
  req: SendAnnotationsToAiRequest,
  state: Pick<ServerState, 'projectRoot' | 'cwd' | 'ideInfo'>,
): Promise<SendAnnotationsToAiResponse> {
  try {
    validateAnnotationDispatchRequest(req, state)
    const batch = normalizeAnnotationBatch(req)
    const prompt = buildAnnotationBatchPrompt(batch)
    const representativeTarget = batch.annotations[0]?.targets[0]
    const runtime = resolvePromptDispatchRuntime(state)

    return dispatchPromptThroughIde(runtime, {
      prompt,
      ...(representativeTarget?.file ? { filePath: representativeTarget.file } : {}),
      ...(representativeTarget?.line ? { line: representativeTarget.line } : {}),
      ...(representativeTarget?.column ? { column: representativeTarget.column } : {}),
      ...(batch.screenshotContext ? { screenshotContext: batch.screenshotContext } : {}),
    })
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorCode: getAnnotationDispatchErrorCode(error),
    }
  }
}

export function validateAnnotationDispatchRequest(
  req: SendAnnotationsToAiRequest,
  state: Pick<ServerState, 'projectRoot' | 'cwd'>,
): void {
  if (!req.annotations.length) {
    throw new AnnotationDispatchError('At least one annotation is required.', 'INVALID_REQUEST')
  }

  for (const annotation of req.annotations) {
    if (!annotation.targets.length) {
      throw new AnnotationDispatchError(
        'Each annotation must include at least one target.',
        'INVALID_REQUEST',
      )
    }

    for (const target of annotation.targets) {
      const absolutePath = resolveWorkspacePath(target.location.file, state.cwd)
      assertPathWithinProject(absolutePath, state.projectRoot)
    }
  }
}

export function normalizeAnnotationBatch(
  req: SendAnnotationsToAiRequest,
): NormalizedAnnotationBatch {
  return {
    instruction: req.instruction?.trim() ?? '',
    responseMode: req.responseMode ?? 'unified',
    ...(req.runtimeContext ? { runtimeContext: req.runtimeContext } : {}),
    ...(req.screenshotContext ? { screenshotContext: req.screenshotContext } : {}),
    ...(req.cssContextPrompt?.trim() ? { cssContextPrompt: req.cssContextPrompt.trim() } : {}),
    annotations: req.annotations.map((annotation, index) => ({
      index: index + 1,
      note: annotation.note.trim(),
      intent: annotation.intent,
      targets: annotation.targets.map(target => ({
        file: target.location.file,
        line: target.location.line,
        column: target.location.column,
        ...(target.label ? { label: target.label } : {}),
        ...(target.selector ? { selector: target.selector } : {}),
        ...(target.snippet ? { snippet: target.snippet } : {}),
      })),
    })),
  }
}

export function buildAnnotationBatchPrompt(batch: NormalizedAnnotationBatch): string {
  const body = buildSelectedElementsPrompt(batch.annotations)
  const prompt = batch.instruction ? `${batch.instruction}\n\n${body}` : body

  return appendScreenshotContextSection(
    appendCssContextSection(
      appendRuntimeContextSection(prompt, batch.runtimeContext),
      batch.cssContextPrompt,
    ),
    batch.screenshotContext,
  )
}

function appendCssContextSection(prompt: string, cssContextPrompt: string | undefined): string {
  if (!cssContextPrompt) return prompt
  return `${prompt}\n\n${cssContextPrompt}`
}

function buildSelectedElementsPrompt(annotations: NormalizedAnnotation[]): string {
  const lines = ['Selected elements:']

  for (const annotation of annotations) {
    const trimmedNote = annotation.note.trim()
    for (const target of annotation.targets) {
      const targetLabel = (target.label || 'Unknown target').trim() || 'Unknown target'
      lines.push(`- ${targetLabel}`)
      lines.push(`file=${target.file}:${target.line}:${target.column}`)
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

function appendScreenshotContextSection(
  prompt: string,
  screenshotContext: ScreenshotContext | undefined,
): string {
  if (!screenshotContext || (!screenshotContext.imageDataUrl && !screenshotContext.imageAssetId)) {
    return prompt
  }

  const lines = [
    'Visual screenshot context attached:',
    `- capturedAt=${screenshotContext.capturedAt}`,
    `- mimeType=${screenshotContext.mimeType}`,
    ...(screenshotContext.imageAssetId ? [`- imageAssetId=${screenshotContext.imageAssetId}`] : []),
  ]

  return `${prompt}\n\n${lines.join('\n')}`
}

function appendRuntimeContextSection(
  prompt: string,
  runtimeContext: RuntimeContextEnvelope | undefined,
): string {
  if (!runtimeContext?.records.length) {
    return prompt
  }

  return `${prompt}\n\n${buildRuntimeContextSection(runtimeContext.records)}`
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

function getAnnotationDispatchErrorCode(error: unknown): AiErrorCode {
  if (error instanceof AnnotationDispatchError) return error.errorCode
  if (error instanceof Error && error.message.includes('outside of project workspace')) {
    return 'FORBIDDEN_PATH'
  }
  return 'UNKNOWN'
}
