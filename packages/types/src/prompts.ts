import type { HotKeys } from './common.js'
import type { RuntimeContextConfig, RuntimeContextEnvelope } from './runtime.js'
import type { SourceLocation } from './common.js'
import type { AiErrorCode } from './runtime.js'
import type { Provider } from './providers.js'

export type IntentKind = 'ai-prompt' | 'workflow'

export type AiIntent = 'ask' | 'fix' | 'review' | 'redesign'
export type AnnotationIntent = AiIntent

export interface AiIntentConfig {
  kind?: 'ai-prompt'
  id: string
  label?: string
  aiIntent: AiIntent
  prompt?: string
  prependPrompt?: string
  appendPrompt?: string
  enabled?: boolean
}

export interface WorkflowConfig {
  kind: 'workflow'
  id: string
  label?: string
  prompt: string
  confirm?: boolean
  enabled?: boolean
}

export type IntentConfig = AiIntentConfig | WorkflowConfig

export function isWorkflowConfig(c: IntentConfig): c is WorkflowConfig {
  return c.kind === 'workflow'
}

export function isAiIntentConfig(c: IntentConfig): c is AiIntentConfig {
  return c.kind !== 'workflow'
}

export type InspectoPromptsConfig =
  | (string | IntentConfig)[]
  | {
      $replace: true
      items: (string | IntentConfig)[]
    }

export type InspectoLocale = 'en' | 'zh-CN' | (string & {})
export type InspectoMessages = Partial<Record<string, string>>

export interface InspectorOptions {
  locale?: InspectoLocale
  messages?: InspectoMessages
  hotKeys?: HotKeys
  askPlaceholder?: string
  serverUrl?: string
  maxSnippetLines?: number
  defaultActive?: boolean
  theme?: 'light' | 'dark' | 'auto'
  includeSnippet?: boolean
  runtimeContext?: RuntimeContextConfig
}

export interface SendToAiRequest {
  location?: SourceLocation
  snippet?: string
  prompt?: string
  target?: Provider
  runtimeContext?: RuntimeContextEnvelope
}

export interface SendToAiResponse {
  success: boolean
  error?: string
  errorCode?: AiErrorCode
  fallbackPayload?: {
    prompt: string
    file: string
  }
}

export interface AiStrategyContext {
  location: SourceLocation
  snippet: string
  fileUri: string
  prompt: string
}

export interface AiStrategyResult {
  success: boolean
  error?: string
  errorCode?: AiErrorCode
}
