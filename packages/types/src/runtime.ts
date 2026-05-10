import type { SourceLocation } from './common.js'
import type { AnnotationIntent } from './prompts.js'

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

export type AnnotationSessionStatus =
  | 'pending'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'dismissed'

export type AnnotationThreadRole = 'user' | 'agent' | 'system'

export interface AnnotationThreadMessage {
  id: string
  role: AnnotationThreadRole
  text: string
  createdAt: number
}

export interface AnnotationWorkSession {
  id: string
  source?: 'annotation' | 'workflow'
  workflowId?: string
  instruction: string
  annotations: Annotation[]
  deliveryMode?: AnnotationDeliveryMode
  runtimeContext?: RuntimeContextEnvelope
  cssContextPrompt?: string
  pageUrl?: string
  route?: string
  status: AnnotationSessionStatus
  messages: AnnotationThreadMessage[]
  createdAt: number
  updatedAt: number
  acknowledgedAt?: number
  resolvedAt?: number
}

export interface AnnotationWorkSessionSummary {
  id: string
  status: AnnotationSessionStatus
  createdAt: number
  updatedAt: number
}

export interface CreateAnnotationWorkSessionInput {
  source?: 'annotation' | 'workflow'
  workflowId?: string
  instruction?: string
  annotations: Annotation[]
  deliveryMode?: AnnotationDeliveryMode
  runtimeContext?: RuntimeContextEnvelope
  cssContextPrompt?: string
  pageUrl?: string
  route?: string
  messages?: AnnotationThreadMessage[]
}

export interface AppendAnnotationThreadMessageInput {
  role: AnnotationThreadRole
  text: string
}

export interface AnnotationSessionReplyRequest {
  role: AnnotationThreadRole
  text: string
}

export interface AnnotationSessionResolveRequest {
  message?: string
}

export interface AnnotationSessionClaimRequest {
  timeoutMs?: number
}

export type AnnotationSessionEventType =
  | 'session-created'
  | 'session-message-appended'
  | 'session-status-updated'

export interface AnnotationSessionEvent {
  type: AnnotationSessionEventType
  session: AnnotationWorkSession
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

export type AnnotationDeliveryMode = 'ide' | 'mcp'

export interface SendAnnotationsToAiRequest {
  source?: 'annotation' | 'workflow'
  workflowId?: string
  instruction?: string
  annotations: AnnotationTransport[]
  runtimeContext?: RuntimeContextEnvelope
  cssContextPrompt?: string
  deliveryMode?: AnnotationDeliveryMode
}

export interface SendAnnotationsToAiResponse {
  success: boolean
  error?: string
  errorCode?: AiErrorCode
  session?: AnnotationWorkSessionSummary
  fallbackPayload?: {
    prompt: string
  }
}

export interface AnnotationSessionMutationResponse {
  success: boolean
  error?: string
  session?: AnnotationWorkSession
}

export type AiErrorCode =
  | 'INVALID_REQUEST'
  | 'FORBIDDEN_PATH'
  | 'IDE_UNAVAILABLE'
  | 'IDE_NOT_FOUND'
  | 'EXTENSION_NOT_INSTALLED'
  | 'CLIPBOARD_WRITE_FAILED'
  | 'SNIPPET_TOO_LARGE'
  | 'FILE_NOT_FOUND'
  | 'SERVER_UNAVAILABLE'
  | 'UNKNOWN'
