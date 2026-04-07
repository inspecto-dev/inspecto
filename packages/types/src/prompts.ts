import type { HotKeys } from './common.js'
import type { Provider, IdeType } from './providers.js'
import type {
  RuntimeContextConfig,
  RuntimeContextEnvelope,
  ScreenshotContext,
  ScreenshotContextConfig,
} from './runtime.js'
import type { SourceLocation } from './common.js'
import type { AiErrorCode } from './runtime.js'

export type AiIntent = 'ask' | 'fix' | 'review' | 'redesign'
export type AnnotationIntent = AiIntent
export type IntentLabels = Partial<Record<Provider | 'clipboard', string>>

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

export interface InspectorOptions {
  hotKeys?: HotKeys
  labels?: IntentLabels
  askPlaceholder?: string
  serverUrl?: string
  maxSnippetLines?: number
  defaultActive?: boolean
  theme?: 'light' | 'dark' | 'auto'
  includeSnippet?: boolean
  annotationResponseMode?: 'unified' | 'per-annotation'
  runtimeContext?: RuntimeContextConfig
  screenshotContext?: ScreenshotContextConfig
}

export interface SendToAiRequest {
  location: SourceLocation
  snippet: string
  prompt?: string
  target?: Provider
  runtimeContext?: RuntimeContextEnvelope
  screenshotContext?: ScreenshotContext
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
