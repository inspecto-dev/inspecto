// ─────────────────────────────────────────────────────────────────────────────
// HotKey configuration — follows code-inspector pattern
// ─────────────────────────────────────────────────────────────────────────────

/** Modifier keys that can be used as inspector activation hotkeys */
export type HotKey = 'ctrlKey' | 'altKey' | 'metaKey' | 'shiftKey'

/**
 * Hotkey configuration.
 * - Array of HotKey: all specified keys must be held simultaneously to activate
 * - false: disable hotkey activation entirely (use programmatic toggle only)
 * @default ['altKey']
 * @example ['ctrlKey', 'shiftKey'] — Ctrl+Shift to activate
 */
export type HotKeys = HotKey[] | false

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

/** Configuration for the @inspecto/plugin build plugin */
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
}

// ─────────────────────────────────────────────────────────────────────────────
// IDE & AI Targets Types
// ─────────────────────────────────────────────────────────────────────────────

/** Supported IDEs */
export type IdeType = 'vscode' | 'unknown'

/** All supported AI tools */
export type AiTool =
  | 'github-copilot' // GitHub Copilot Chat
  | 'claude-code' // Anthropic Claude Code
  | 'gemini' // Google Gemini
  | 'codex' // Codex
  | 'coco' // Coco CLI

/** Backward compatibility alias */
export type AiTarget = AiTool

/** Whether the AI target is an editor plugin or a CLI tool */
export type ToolMode = 'plugin' | 'cli' | 'clipboard'

/** Backward compatibility alias */
export type AiTargetType = ToolMode

export interface ProviderConfig {
  type?: ToolMode
  autoSend?: boolean
  bin?: string
  args?: string[]
  cwd?: string
}

export interface InspectoSettings {
  ide?: IdeType
  prefer?: string
  hotKeys?: HotKeys
  providers?: Record<string, ProviderConfig>
  /**
   * Whether to inject the raw code snippet into the prompt.
   * Default is false (saves tokens, lets IDE AI read the file directly).
   */
  includeSnippet?: boolean
}

/** Legacy configuration structure (for backward compatibility during migration) */
export interface LegacyInspectoUserConfig {
  defaultTarget?: AiTool
  tools: Partial<
    Record<
      AiTool,
      {
        mode: ToolMode
        cliBinary?: string
        cliArgs?: string[]
      }
    >
  >
  menuOrder?: AiTool[]
}

/** Static mapping: target → type (DEPRECATED: Use config resolution instead) */
export const AI_TARGET_TYPE: Record<AiTool, ToolMode> = {
  'github-copilot': 'plugin',
  'claude-code': 'plugin',
  gemini: 'plugin',
  codex: 'plugin',
  coco: 'cli',
}

export const DEFAULT_TOOL_MODE: Record<AiTool, ToolMode> = {
  'github-copilot': 'plugin',
  'claude-code': 'plugin',
  gemini: 'plugin',
  codex: 'plugin',
  coco: 'cli',
}

/** Which modes each tool actually supports */
export const VALID_MODES: Record<AiTool, ToolMode[]> = {
  'github-copilot': ['plugin'],
  'claude-code': ['plugin', 'cli'],
  gemini: ['plugin', 'cli'],
  codex: ['plugin', 'cli'],
  coco: ['cli'],
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolOverrides {
  type?: ToolMode
  binaryPath?: string
  args?: string[]
  cwd?: string
  autoSend?: boolean
  coldStartDelay?: number
}

export interface AiPayload {
  ide: IdeType
  target: AiTarget
  targetType: AiTargetType
  prompt: string
  filePath?: string
  line?: number
  column?: number
  snippet?: string
  overrides?: ToolOverrides
}

export interface ChannelDef {
  type: ToolMode
  execute: (payload: AiPayload) => Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
export interface IntentLabels {
  copilot?: string
  claude?: string
  /** Label for the "copy to clipboard only" fallback */
  clipboard?: string
}

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

// ─────────────────────────────────────────────────────────────────────────────
// HTTP API — between browser client and local HTTP server
// ─────────────────────────────────────────────────────────────────────────────

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
  target?: string
}

export interface SendToAiResponse {
  success: boolean
  error?: string
  /** Error code for structured error handling in the browser */
  errorCode?: AiErrorCode
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
  mode: ToolMode
  installed: boolean
}

export interface IdeInfo {
  ide: IdeType
  scheme: string // The exact URI scheme registered by the IDE (e.g. 'vscode', 'vscode-insiders', 'cursor')
  providers: Record<AiTool, ProviderInfo>
}

/** GET /config response — browser-facing runtime configuration */
export interface InspectoConfig {
  ide: IdeType
  providers: Record<AiTool, ProviderInfo>
  providerOverrides?: Partial<Record<AiTool, ToolOverrides>>
  prompts?: InspectoPromptsConfig
  hotKeys?: HotKeys
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
