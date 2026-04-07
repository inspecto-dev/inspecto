import type {
  IntentConfig,
  SnippetResponse,
  RuntimeContextEnvelope,
  RuntimeEvidenceRecord,
  ScreenshotContext,
  SourceLocation,
} from '@inspecto-dev/types'
import { buildPrompt } from './intents.js'

type BuildFixBugPromptInput = {
  template: string
  location: SourceLocation
  snippet?: string
  records: RuntimeEvidenceRecord[]
}

const MAX_EVIDENCE_RECORDS = 5
const LEVEL_WEIGHT: Record<RuntimeEvidenceRecord['relevanceLevel'], number> = {
  high: 3,
  medium: 2,
  low: 1,
}

export function selectFixBugEvidence(records: RuntimeEvidenceRecord[]): RuntimeEvidenceRecord[] {
  return records
    .filter(record => record.relevanceLevel !== 'low')
    .slice()
    .sort((a, b) => {
      const levelDiff = LEVEL_WEIGHT[b.relevanceLevel] - LEVEL_WEIGHT[a.relevanceLevel]
      if (levelDiff !== 0) return levelDiff

      const scoreDiff = b.relevanceScore - a.relevanceScore
      if (scoreDiff !== 0) return scoreDiff

      const occurrenceDiff = b.occurrenceCount - a.occurrenceCount
      if (occurrenceDiff !== 0) return occurrenceDiff

      return b.timestamp - a.timestamp
    })
    .slice(0, MAX_EVIDENCE_RECORDS)
}

export function buildFixBugPrompt(input: BuildFixBugPromptInput): string {
  const evidence = selectFixBugEvidence(input.records)
  const templateGuidance = normalizeTemplateGuidance(input.template)

  return [
    'You are fixing a bug for the currently inspected UI target.',
    buildSourceContextSection(input.location, input.snippet),
    buildEvidenceSection(evidence),
    'Guardrails:',
    '- Prioritize evidence-backed conclusions.',
    '- Separate confirmed evidence from hypotheses.',
    '- Avoid strong claims when the runtime evidence is weak or unrelated.',
    '- Ask follow-up questions if the evidence is insufficient for a safe fix.',
    'Response contract:',
    '1. Most likely root cause',
    '2. Confirmed evidence',
    '3. Hypotheses',
    '4. Minimal fix',
    '5. Follow-up questions (only if needed)',
    templateGuidance
      ? `Configured intent guidance (reference only):\n${indentBlock(templateGuidance)}`
      : '',
  ].join('\n\n')
}

export function buildPromptForIntent(
  intent: Pick<IntentConfig, 'id' | 'prompt' | 'prependPrompt' | 'appendPrompt'>,
  location: SourceLocation,
  snippetResult?: SnippetResponse | null,
  runtimeContext?: RuntimeContextEnvelope | null,
): string {
  const fullPromptTemplate = assembleIntentPromptTemplate(intent)
  if (intent.id === 'fix-bug') {
    return buildFixBugPrompt({
      template: fullPromptTemplate,
      location,
      snippet: snippetResult?.snippet || '',
      records: runtimeContext?.records ?? [],
    })
  }

  return appendRuntimeContextToPrompt(
    buildPrompt(fullPromptTemplate, location, snippetResult),
    runtimeContext?.records ?? [],
  )
}

function buildSourceContextSection(location: SourceLocation, snippet?: string): string {
  const parts = [
    'Target source context:',
    `- file: ${location.file}`,
    `- location: ${location.line}:${location.column}`,
  ]

  if (snippet) {
    parts.push(`- snippet:\n${indentBlock(snippet)}`)
  }

  return parts.join('\n')
}

function assembleIntentPromptTemplate(
  intent: Pick<IntentConfig, 'prompt' | 'prependPrompt' | 'appendPrompt'>,
): string {
  let fullPromptTemplate = intent.prompt ?? ''
  if (intent.prependPrompt) {
    fullPromptTemplate = `${intent.prependPrompt}\n\n${fullPromptTemplate}`
  }
  if (intent.appendPrompt) {
    fullPromptTemplate = `${fullPromptTemplate}\n\n${intent.appendPrompt}`
  }
  return fullPromptTemplate
}

function buildEvidenceSection(records: RuntimeEvidenceRecord[]): string {
  if (records.length === 0) {
    return [
      'High-confidence runtime evidence:',
      '- None selected. Do not treat unrelated logs as proof.',
    ].join('\n')
  }

  return ['High-confidence runtime evidence:', ...records.map(formatEvidenceRecord)].join('\n')
}

export function appendRuntimeContextToPrompt(
  prompt: string,
  records: RuntimeEvidenceRecord[],
): string {
  if (records.length === 0) return prompt
  return `${prompt}\n\n${buildGenericRuntimeContextSection(records)}`
}

export function appendScreenshotContextToPrompt(
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
    ...(screenshotContext.imageAssetId ? [`- imageAssetId=${screenshotContext.imageAssetId}`] : []),
  ]

  return `${prompt}\n\n${lines.join('\n')}`
}

function buildGenericRuntimeContextSection(records: RuntimeEvidenceRecord[]): string {
  return ['Relevant runtime context:', ...records.map(formatEvidenceRecord)].join('\n')
}

function formatEvidenceRecord(record: RuntimeEvidenceRecord): string {
  const requestSummary =
    record.kind === 'failed-request'
      ? formatRequestSummary(record)
      : `occurrences=${record.occurrenceCount}`
  const reasonSummary = record.relevanceReasons.length
    ? record.relevanceReasons.join('; ')
    : 'timing-based'
  const stackSummary = record.stack ? `\n  stack=${truncateStack(record.stack)}` : ''

  return [
    `- [${record.kind}] ${record.message}`,
    `  relevance=${record.relevanceLevel} (${reasonSummary})`,
    `  ${requestSummary}`,
    stackSummary,
  ]
    .filter(Boolean)
    .join('\n')
}

function formatRequestSummary(record: RuntimeEvidenceRecord): string {
  const method = record.request?.method ?? 'GET'
  const path = record.request?.pathname ?? record.request?.url ?? 'unknown'
  const status = record.request?.status ?? 'unknown'
  return `request=${method} ${path} status=${status}`
}

function truncateStack(stack: string): string {
  return stack.split('\n').slice(0, 5).join(' | ')
}

function normalizeTemplateGuidance(template: string): string {
  return template.trim()
}

function indentBlock(text: string): string {
  return text
    .split('\n')
    .map(line => `  ${line}`)
    .join('\n')
}
