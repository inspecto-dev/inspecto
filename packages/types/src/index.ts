// ─────────────────────────────────────────────────────────────────────────────
// HotKey configuration — follows code-inspector pattern
// ─────────────────────────────────────────────────────────────────────────────

/** Modifier keys that can be used as inspector activation hotkeys */
export type HotKey = 'ctrlKey' | 'altKey' | 'metaKey' | 'shiftKey'

/**
 * Hotkey configuration strings.
 * E.g. "alt", "cmd+shift", or false to disable.
 */
export type HotKeyString =
  | 'alt'
  | 'shift'
  | 'ctrl'
  | 'meta'
  | 'cmd'
  | 'alt+shift'
  | 'ctrl+shift'
  | 'meta+shift'
  | 'cmd+shift'

/**
 * Hotkey configuration.
 * - String: modifier key or combo (e.g., "alt", "cmd+shift")
 * - false: disable hotkey activation entirely
 */
export type HotKeys = HotKeyString | false

// ─────────────────────────────────────────────────────────────────────────────
// Source location — injected as data-inspecto attribute at compile time
// ─────────────────────────────────────────────────────────────────────────────

/** Parsed source location from the data-inspecto attribute */
export interface SourceLocation {
  /** Absolute or relative file path depending on pathType config */
  file: string
  /** 1-based line number */
  line: number
  /** 1-based column number */
  column: number
  /** Optional: component or element name for display */
  name?: string
}

/** Format of the data-inspecto attribute value: "filepath:line:col" */
export type SourceAttrValue = string

// ─────────────────────────────────────────────────────────────────────────────
// Plugin configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Path type injected into data-inspecto attributes.
 * - 'absolute': full filesystem path (default) — safe across monorepo aliases
 * - 'relative': path relative to project root — shorter, but may break with pnpm virtual store
 */
export type PathType = 'relative' | 'absolute'

/** Configuration for the @inspecto-dev/plugin build plugin */
export interface UnpluginOptions {
  /**
   * Additional file extensions to transform beyond .jsx/.tsx/.js/.ts
   * @default []
   */
  include?: string[]

  /**
   * File path patterns to exclude from transform
   * Matched against absolute file path using picomatch
   * node_modules and dist are always excluded
   * @default []
   */
  exclude?: string[]

  /**
   * Element tag names to skip source injection.
   * Useful for framework-internal elements that should not carry source data.
   * @default ['template', 'script', 'style', 'Transition', 'TransitionGroup',
   *           'KeepAlive', 'Teleport', 'Suspense', 'Fragment']
   */
  escapeTags?: string[]

  /**
   * Path type for the injected data-inspecto attribute value.
   * Use 'absolute' (default) to avoid issues with monorepo path aliases
   * and pnpm virtual store symlinks.
   * @default 'absolute'
   */
  pathType?: PathType

  /**
   * The attribute name injected on JSX elements.
   * Change only if 'data-inspecto' conflicts with another tool.
   * @default 'data-inspecto'
   */
  attributeName?: string

  /**
   * Console log level for the plugin.
   * - 'info': Print startup info, warnings, and errors
   * - 'warn': Print warnings and errors only
   * - 'error': Print errors only
   * - 'silent': Disable all console output
   * @default 'warn'
   */
  logLevel?: LogLevel
}

export type LogLevel = 'info' | 'warn' | 'error' | 'silent'

// ─────────────────────────────────────────────────────────────────────────────
// IDE & AI Targets Types
// ─────────────────────────────────────────────────────────────────────────────

/** Supported IDEs */
export type IdeType = 'vscode' | 'trae' | 'trae-cn' | 'cursor' | 'unknown'

/** All supported AI tool providers */
export type Provider =
  | 'copilot' // GitHub Copilot Chat
  | 'claude-code' // Anthropic Claude Code
  | 'gemini' // Google Gemini
  | 'codex' // Codex
  | 'coco' // Coco CLI
  | 'trae' // Trae AI Chat
  | 'cursor' // Cursor AI

/** Whether the AI provider is an editor extension, CLI tool, or clipboard fallback */
export type ProviderMode = 'extension' | 'cli' | 'clipboard' | 'builtin'

export interface InspectoSettings {
  ide?: IdeType
  /** Flat namespaced configuration (e.g. `provider.default`, `provider.claude-code.cli.bin`) */
  [key: `provider.${string}`]: string | string[] | boolean | undefined
  'inspector.hotKey'?: HotKeys
  /**
   * Theme for the inspector panel.
   */
  'inspector.theme'?: 'light' | 'dark' | 'auto'
  /**
   * Whether to inject the raw code snippet into the prompt.
   * Default is false (saves tokens, lets IDE AI read the file directly).
   */
  'prompt.includeSnippet'?: boolean
  /**
   * Whether to automatically send the prompt when opened in the AI tool.
   * Default is false (user must manually hit send).
   */
  'prompt.autoSend'?: boolean
}

/** Static mapping: which modes each tool actually supports */
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

// ─────────────────────────────────────────────────────────────────────────────
// Channel Types
// ─────────────────────────────────────────────────────────────────────────────

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
  overrides?: ToolOverrides
  autoSend?: boolean
  /** Added in v2: Unique ticket ID for the IDE to fetch this payload from the local server to bypass URI length limits */
  ticket?: string
}

export interface ChannelDef {
  type: ProviderMode
  execute: (payload: AiPayload) => Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
export type IntentLabels = Partial<Record<Provider | 'clipboard', string>>

/**
 * Configuration for a custom intent in the AI menu.
 */
export interface IntentConfig {
  /** Unique identifier for this intent */
  id?: string
  /** The text displayed on the intent button */
  label?: string
  /**
   * Prepend text to the prompt template.
   * Useful for extending built-in prompts without rewriting the whole template.
   */
  prependPrompt?: string
  /**
   * Append text to the prompt template.
   * Useful for extending built-in prompts (e.g. "Please reply in Chinese").
   */
  appendPrompt?: string
  prompt?: string
  /**
   * If true, this intent doesn't send a prompt to AI,
   * but rather triggers a built-in action (like 'open-in-editor').
   * @internal For built-in intents only.
   */
  isAction?: boolean
  /**
   * Enabled status.
   * If false, this item is explicitly hidden from the menu without having to remove its configuration.
   */
  enabled?: boolean
}

export type InspectoPromptsConfig =
  | (string | IntentConfig)[]
  | {
      $replace: true
      items: (string | IntentConfig)[]
    }

/** Configuration for the browser-side inspector component */
export interface InspectorOptions {
  /**
   * Hotkeys to hold while clicking to activate inspector.
   * Pass false to disable hotkey activation.
   * @default ['altKey']
   */
  hotKeys?: HotKeys

  /**
   * Custom labels for each AI target button.
   * Useful for localization or branding.
   */
  labels?: IntentLabels

  /**
   * Placeholder text for the "Ask AI" input box.
   */
  askPlaceholder?: string

  /**
   * Base URL of the local HTTP server spun up by the unplugin.
   * Usually auto-detected via the injected __AI_INSPECTOR_PORT__ global.
   * Override only if running in a non-standard setup.
   */
  serverUrl?: string

  /**
   * Maximum number of lines to include in the extracted code snippet.
   * Larger values provide more context but may hit AI token limits.
   * @default 100
   */
  maxSnippetLines?: number

  /**
   * Whether the inspector panel is visible/active on mount.
   * @default false
   */
  defaultActive?: boolean

  /**
   * Theme for the inspector panel.
   * If 'auto' or undefined, it relies on CSS media queries (prefers-color-scheme)
   * or inherits from the host environment if manually managed.
   */
  theme?: 'light' | 'dark' | 'auto'

  /**
   * Whether to inject the raw code snippet into the prompt.
   * Default is false (saves tokens, lets IDE AI read the file directly).
   */
  includeSnippet?: boolean
}

export * from './intents.js'

// ─────────────────────────────────────────────────────────────────────────────
// HTTP API — between browser client and local HTTP server
// ─────────────────────────────────────────────────────────────────────────────

export const INSPECTO_API_PATHS = {
  HEALTH: '/inspecto/api/v1/health',
  CLIENT_CONFIG: '/inspecto/api/v1/client/config',
  IDE_INFO: '/inspecto/api/v1/ide/info',
  IDE_OPEN: '/inspecto/api/v1/ide/open',
  PROJECT_SNIPPET: '/inspecto/api/v1/project/snippet',
  AI_DISPATCH: '/inspecto/api/v1/ai/dispatch',
  AI_TICKET: '/inspecto/api/v1/ai/ticket', // Usage: /inspecto/api/v1/ai/ticket/:id
} as const

/** POST /open — browser asks server to open file in IDE */
export interface OpenFileRequest {
  file: string
  line: number
  column: number
}

/** GET /snippet — browser asks server for source code context */
export interface SnippetRequest {
  file: string
  line: number
  column: number
  /** Max lines to return in snippet, default 100 */
  maxLines?: number
}

export interface SnippetResponse {
  /** Extracted code snippet (trimmed to maxSnippetLines) */
  snippet: string
  /** Actual start line of the returned snippet (1-based) */
  startLine: number
  /** File path echoed back */
  file: string
  /** Component or element name if detectable */
  name?: string
}

/** POST /send-to-ai — browser asks server to dispatch context to an AI tool */
export interface SendToAiRequest {
  location: SourceLocation
  snippet: string
  /** Prompt template. Server may override with its own template. */
  prompt?: string
  /** Target AI tool. If not provided, server will resolve it based on config */
  target?: Provider
}

export interface SendToAiResponse {
  success: boolean
  error?: string
  /** Error code for structured error handling in the browser */
  errorCode?: AiErrorCode
  /** Payload for client-side fallback (e.g. copying to clipboard if IDE fails to handle URI) */
  fallbackPayload?: {
    prompt: string
    file: string
  }
}

/** Standard error codes returned by the local HTTP server */
export type AiErrorCode =
  | 'IDE_NOT_FOUND'
  | 'EXTENSION_NOT_INSTALLED'
  | 'CLIPBOARD_WRITE_FAILED'
  | 'SNIPPET_TOO_LARGE'
  | 'FILE_NOT_FOUND'
  | 'UNKNOWN'

// ─────────────────────────────────────────────────────────────────────────────
// Server state — tracks port across restarts (RecordInfo pattern from code-inspector)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProviderInfo {
  mode: ProviderMode
  installed: boolean
}

export interface IdeInfo {
  ide: IdeType
  scheme: string // The exact URI scheme registered by the IDE (e.g. 'vscode', 'vscode-insiders', 'cursor')
  workspaceRoot?: string // Absolute path of the active workspace to prevent cross-project IDE hijacking
  providers: Record<Provider, ProviderInfo>
}

/** GET /config response — browser-facing runtime configuration */
export interface InspectoConfig {
  ide: IdeType
  /** List of AI targets available in the environment to show/enable in UI */
  providers?: Record<Provider, ProviderInfo>
  /** Fully resolved and merged list of intent configurations for the UI to display */
  prompts?: IntentConfig[]
  hotKeys?: HotKeys
  theme?: 'light' | 'dark' | 'auto'
  includeSnippet?: boolean
}

/** Shared mutable state managed by the local HTTP server module */
export interface ServerState {
  /** Port the HTTP server is currently listening on */
  port: number | null
  /** Whether the server is currently running */
  running: boolean
  /** Absolute path to project root (from git rev-parse or process.cwd()) */
  projectRoot: string
  /** Absolute path to the config root (where .inspecto lives) */
  configRoot: string
  /** The directory where the bundler is running (process.cwd()) */
  cwd: string
  /** Cached IDE info pushed from the extension */
  ideInfo?: IdeInfo | null
}

// ─────────────────────────────────────────────────────────────────────────────
// VS Code Extension — strategy interface
// ─────────────────────────────────────────────────────────────────────────────

/** Context passed to each AI strategy when sending code context */
export interface AiStrategyContext {
  location: SourceLocation
  snippet: string
  /** Resolved absolute file URI (file:///...) */
  fileUri: string
  /** Human-readable prompt constructed from location + snippet */
  prompt: string
}

/** Result of executing an AI strategy */
export interface AiStrategyResult {
  success: boolean
  error?: string
  errorCode?: AiErrorCode
}
