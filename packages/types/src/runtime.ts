import type { SourceLocation } from './common.js'
import type { AiIntent, AnnotationIntent } from './prompts.js'

export type RuntimeEvidenceKind =
  | 'runtime-error'
  | 'promise-rejection'
  | 'console-error'
  | 'failed-request'

export type RuntimeEvidenceLevel = 'high' | 'medium' | 'low'

export interface RuntimeEvidenceRecord {
  id: string
  kind: RuntimeEvidenceKind
  timestamp: number
  message: string
  stack?: string
  sourceUrl?: string
  sourceFile?: string
  route?: string
  componentHints?: string[]
  occurrenceCount: number
  relevanceScore: number
  relevanceLevel: RuntimeEvidenceLevel
  relevanceReasons: string[]
  request?: {
    method?: string
    url?: string
    pathname?: string
    status?: number
    responseSummary?: string
  }
}

export interface RuntimeContextSummary {
  runtimeErrorCount: number
  failedRequestCount: number
  includedRecordIds: string[]
}

export interface RuntimeContextEnvelope {
  summary: RuntimeContextSummary
  records: RuntimeEvidenceRecord[]
}

export interface RuntimeContextConfig {
  enabled?: boolean
  preview?: boolean
  maxRuntimeErrors?: number
  maxFailedRequests?: number
}

export interface ScreenshotContext {
  enabled: boolean
  capturedAt: string
  mimeType: string
  imageDataUrl?: string
  imageAssetId?: string
}

export interface ScreenshotContextConfig {
  enabled?: boolean
}

export interface OpenFileRequest {
  file: string
  line: number
  column: number
}

export interface SnippetRequest {
  file: string
  line: number
  column: number
  maxLines?: number
}

export interface SnippetResponse {
  snippet: string
  startLine: number
  file: string
  name?: string
}

export interface AnnotationTarget {
  id: string
  location: SourceLocation
  label: string
  selector?: string
  rect: {
    x: number
    y: number
    width: number
    height: number
  }
  snippet?: string
}

export interface FeedbackRecord {
  id: string
  displayOrder: number
  target: AnnotationTarget
  note: string
  intent: AnnotationIntent
  cssContextEnabled?: boolean
}

export interface FeedbackRecordDraft {
  id: string
  displayOrder?: number
  target: AnnotationTarget | null
  note: string
  intent: AnnotationIntent
  cssContextEnabled?: boolean
}

export interface FeedbackRecordSession {
  current: FeedbackRecordDraft
  records: FeedbackRecord[]
}

export interface Annotation {
  id: string
  note: string
  intent: AnnotationIntent
  targets: AnnotationTarget[]
}

export interface AnnotationSession {
  current: Annotation | null
  queue: Annotation[]
}

export interface AnnotationTransportTarget {
  location: SourceLocation
  label?: string
  selector?: string
  snippet?: string
}

export interface AnnotationTransport {
  note: string
  intent: AnnotationIntent
  targets: AnnotationTransportTarget[]
}

export interface SendAnnotationsToAiRequest {
  instruction?: string
  annotations: AnnotationTransport[]
  responseMode?: 'unified' | 'per-annotation'
  runtimeContext?: RuntimeContextEnvelope
  screenshotContext?: ScreenshotContext
  cssContextPrompt?: string
}

export interface SendAnnotationsToAiResponse {
  success: boolean
  error?: string
  errorCode?: AiErrorCode
  fallbackPayload?: {
    prompt: string
  }
}

export type AiErrorCode =
  | 'INVALID_REQUEST'
  | 'FORBIDDEN_PATH'
  | 'IDE_NOT_FOUND'
  | 'EXTENSION_NOT_INSTALLED'
  | 'CLIPBOARD_WRITE_FAILED'
  | 'SNIPPET_TOO_LARGE'
  | 'FILE_NOT_FOUND'
  | 'UNKNOWN'
