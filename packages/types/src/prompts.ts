import type { HotKeys } from './common.js'
import type { RuntimeContextConfig, RuntimeContextEnvelope } from './runtime.js'
import type { SourceLocation } from './common.js'
import type { AiErrorCode } from './runtime.js'
import type { Provider } from './providers.js'

export type AiIntent = 'ask' | 'fix' | 'review' | 'redesign'
export type AnnotationIntent = AiIntent

export interface IntentConfigBase {
  id: string
  label?: string
  prependPrompt?: string
  appendPrompt?: string
  prompt?: string
  enabled?: boolean
}

export interface AiIntentConfig extends IntentConfigBase {
  aiIntent: AiIntent
}

export type IntentConfig = AiIntentConfig

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
  location: SourceLocation
  snippet: string
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
