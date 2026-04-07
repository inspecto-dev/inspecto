import type { HotKeys } from './common.js'
import type {
  RuntimeContextConfig,
  ScreenshotContext,
  ScreenshotContextConfig,
  RuntimeContextEnvelope,
} from './runtime.js'

export type IdeType = 'vscode' | 'trae' | 'trae-cn' | 'cursor' | 'unknown'

export type Provider = 'copilot' | 'claude-code' | 'gemini' | 'codex' | 'coco' | 'trae' | 'cursor'

export type ProviderMode = 'extension' | 'cli' | 'clipboard' | 'builtin'

export interface InspectoSettings {
  ide?: IdeType
  [key: `provider.${string}`]: string | string[] | boolean | undefined
  'inspector.hotKey'?: HotKeys
  'inspector.theme'?: 'light' | 'dark' | 'auto'
  'prompt.includeSnippet'?: boolean
  'prompt.autoSend'?: boolean
  'prompt.annotationResponseMode'?: 'unified' | 'per-annotation'
}

export const HOST_IDE_IDS = ['vscode', 'cursor', 'trae', 'trae-cn'] as const

export type SupportedHostIde = (typeof HOST_IDE_IDS)[number]

export const HOST_IDE_LABELS: Record<SupportedHostIde, string> = {
  vscode: 'VS Code',
  cursor: 'Cursor',
  trae: 'Trae',
  'trae-cn': 'Trae CN',
}

export const DUAL_MODE_PROVIDER_CAPABILITIES = {
  codex: {
    label: 'Codex',
    extensionId: 'openai.chatgpt',
    cliBin: 'codex',
  },
  'claude-code': {
    label: 'Claude Code',
    extensionId: 'anthropic.claude-code',
    cliBin: 'claude',
  },
  gemini: {
    label: 'Gemini',
    extensionId: 'google.geminicodeassist',
    cliBin: 'gemini',
  },
} as const

export type DualModeProvider = keyof typeof DUAL_MODE_PROVIDER_CAPABILITIES

export function isSupportedHostIde(value: string | undefined): value is SupportedHostIde {
  return Boolean(value && (HOST_IDE_IDS as readonly string[]).includes(value))
}

export function getHostIdeLabel(ide: SupportedHostIde): string {
  return HOST_IDE_LABELS[ide]
}

export function getDualModeProviderCapability(provider: string) {
  return DUAL_MODE_PROVIDER_CAPABILITIES[provider as keyof typeof DUAL_MODE_PROVIDER_CAPABILITIES]
}

export const VALID_MODES: Record<Provider, ProviderMode[]> = {
  copilot: ['extension'],
  'claude-code': ['extension', 'cli'],
  gemini: ['extension', 'cli'],
  codex: ['extension', 'cli'],
  coco: ['cli'],
  trae: ['builtin'],
  cursor: ['builtin'],
}

export const DEFAULT_PROVIDER_MODE: Record<Provider, ProviderMode> = {
  copilot: 'extension',
  'claude-code': 'extension',
  gemini: 'extension',
  codex: 'extension',
  coco: 'cli',
  trae: 'builtin',
  cursor: 'builtin',
}

export interface ToolOverrides {
  type?: ProviderMode
  binaryPath?: string
  args?: string[]
  cwd?: string
  coldStartDelay?: number
}

export interface AiPayload {
  ide: IdeType
  target: Provider
  targetType: ProviderMode
  prompt: string
  filePath?: string
  line?: number
  column?: number
  snippet?: string
  screenshotContext?: ScreenshotContext
  overrides?: ToolOverrides
  autoSend?: boolean
  ticket?: string
}

export interface ChannelDef {
  type: ProviderMode
  execute: (payload: AiPayload) => Promise<void>
}

export interface ProviderInfo {
  mode: ProviderMode
  installed: boolean
}

export interface IdeInfo {
  ide: IdeType
  scheme: string
  workspaceRoot?: string
  providers: Record<Provider, ProviderInfo>
}

export interface InspectoConfig {
  ide: IdeType
  providers?: Record<Provider, ProviderInfo>
  prompts?: import('./prompts.js').IntentConfig[]
  hotKeys?: HotKeys
  theme?: 'light' | 'dark' | 'auto'
  includeSnippet?: boolean
  annotationResponseMode?: 'unified' | 'per-annotation'
  runtimeContext?: RuntimeContextConfig
  screenshotContext?: ScreenshotContextConfig
}

export interface ServerState {
  port: number | null
  running: boolean
  projectRoot: string
  configRoot: string
  cwd: string
  ideInfo?: IdeInfo | null
}
