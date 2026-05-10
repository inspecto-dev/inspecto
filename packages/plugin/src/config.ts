import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createDefu } from 'defu'
import type {
  InspectoSettings,
  InspectoPromptsConfig,
  Provider,
  ProviderMode,
  ToolOverrides,
  IdeType,
  LogLevel,
} from '@inspecto-dev/types'
import {
  DEFAULT_PROVIDER_MODE,
  VALID_MODES,
  DEFAULT_INTENTS,
  type IntentConfig,
  type WorkflowConfig,
  isWorkflowConfig,
} from '@inspecto-dev/types'
import { createLogger, setLoggerGlobalLevel } from './utils/logger.js'

const configLogger = createLogger('inspecto:config')

let loadedConfig: InspectoSettings | null = null
let loadedPrompts: InspectoPromptsConfig | null = null
let globalLogLevel: LogLevel = 'warn'
let isWatching = false

// Custom array merge behavior for defu: overwrite arrays instead of concatenating them
const arrayReplaceMerge = createDefu((obj, key, val) => {
  if (Array.isArray(val)) {
    obj[key] = val
    return true
  }
})

export function setGlobalLogLevel(level?: LogLevel) {
  if (level) {
    globalLogLevel = level
    setLoggerGlobalLevel(level)
  }
}

export function getGlobalLogLevel() {
  return globalLogLevel
}

/**
 * Walk from cwd up to boundaryRoot (inclusive) and return the nearest directory
 * that contains a .inspecto/ subdirectory. This keeps settings resolution scoped
 * to a single project root instead of implicitly merging every ancestor layer.
 *
 * If cwd is not under boundaryRoot, only cwd itself is checked.
 */
export function resolveConfigRoots(cwd: string, boundaryRoot: string): string[] {
  let current = cwd

  // Ensure we don't walk past boundaryRoot (handles cwd above boundaryRoot case)
  const isUnderOrEqual = current === boundaryRoot || current.startsWith(boundaryRoot + path.sep)
  if (!isUnderOrEqual) {
    // cwd is not under boundaryRoot — only check cwd
    return fs.existsSync(path.join(cwd, '.inspecto')) ? [cwd] : []
  }

  while (true) {
    if (fs.existsSync(path.join(current, '.inspecto'))) {
      return [current]
    }
    if (current === boundaryRoot) break
    const parent = path.dirname(current)
    if (parent === current) break // filesystem root guard
    current = parent
  }

  return []
}

/**
 * Load and merge user config from the selected project .inspecto/ layer:
 *
 * Priority (highest → lowest):
 *   <settingsRoot>/.inspecto/settings.local.json
 *   <settingsRoot>/.inspecto/settings.json
 *   ~/.inspecto/settings.json
 *
 * @param force    Bust cache and re-read from disk
 * @param cwd      Working directory to start resolution from (default: process.cwd())
 * @param gitRoot  Project/config boundary — upward traversal stops here (optional)
 */
export function loadUserConfigSync(
  force = false,
  cwd = process.cwd(),
  gitRoot?: string,
): InspectoSettings {
  if (loadedConfig && !force) return loadedConfig
  loadedConfig = null // force clear

  const layers: Partial<InspectoSettings>[] = []
  const roots = resolveConfigRoots(cwd, gitRoot ?? cwd)

  for (const root of roots) {
    layers.push(readJsonSafely(path.join(root, '.inspecto', 'settings.local.json')))
    layers.push(readJsonSafely(path.join(root, '.inspecto', 'settings.json')))
  }

  layers.push(readJsonSafely(path.join(os.homedir(), '.inspecto', 'settings.json')))
  layers.push({})

  const validLayers = layers.filter(l => l !== null)
  loadedConfig = arrayReplaceMerge(...(validLayers as [object, ...object[]])) as InspectoSettings
  return loadedConfig
}

/**
 * Load prompts config from the selected project .inspecto/ layer:
 *
 * Priority (highest → lowest):
 *   <settingsRoot>/.inspecto/prompts.local.json
 *   <settingsRoot>/.inspecto/prompts.json
 *   ~/.inspecto/prompts.json
 *
 * Highest-priority non-empty prompts config wins; prompts are not merged across layers.
 */
export async function loadPromptsConfig(
  force = false,
  cwd = process.cwd(),
  gitRoot?: string,
): Promise<InspectoPromptsConfig> {
  if (loadedPrompts && !force) return loadedPrompts

  const layers: any[] = []

  const roots = resolveConfigRoots(cwd, gitRoot ?? cwd)
  for (const root of roots) {
    const localPath = path.join(root, '.inspecto', 'prompts.local.json')
    const jsonPath = path.join(root, '.inspecto', 'prompts.json')
    layers.push(readJsonSafely(localPath))
    layers.push(readJsonSafely(jsonPath))
  }

  layers.push(readJsonSafely(path.join(os.homedir(), '.inspecto', 'prompts.json')))

  // Find the first layer that contains a valid prompts config (array or $replace object).
  // Highest-priority layer wins — no merging across layers for prompts.
  let finalPrompts: any = []
  for (const layer of layers) {
    if (Array.isArray(layer) && layer.length > 0) {
      finalPrompts = layer
      break
    }
    if (
      layer &&
      typeof layer === 'object' &&
      layer.$replace === true &&
      Array.isArray(layer.items)
    ) {
      finalPrompts = layer
      break
    }
  }

  loadedPrompts = finalPrompts as InspectoPromptsConfig
  return loadedPrompts
}

function readJsonSafely(filePath: string): any {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8').trim()
      if (!content) return null // Return null instead of [] so we know it's empty
      const parsed = JSON.parse(content)
      // Transition helper: if user still has {"prompts": [...]}, extract it
      if (!Array.isArray(parsed) && parsed.prompts && Array.isArray(parsed.prompts)) {
        return parsed.prompts
      }
      return parsed
    }
  } catch (e) {
    // Ignore JSON parsing errors for empty or malformed files during watch
    if (e instanceof SyntaxError) {
      configLogger.warn(`Failed to parse config at ${filePath}: Invalid JSON`)
    } else {
      configLogger.warn(`Failed to read config at ${filePath}:`, e)
    }
  }
  return null
}

/**
 * Resolve the exact target tool to dispatch to based on user config.
 */
export function resolveTargetTool(config: InspectoSettings, _ide: IdeType = 'vscode'): Provider {
  // Support "provider.default" (e.g., "claude-code.extension")
  const defaultProvider = config['provider.default'] as string | undefined
  if (defaultProvider) {
    const tool = defaultProvider.split('.')[0]
    return tool as Provider
  }

  // Fallback
  return 'copilot'
}

/**
 * Resolve the effective mode/type for a tool in the context of an IDE.
 */
export function resolveProviderMode(
  tool: Provider,
  ide: IdeType,
  config: InspectoSettings,
): ProviderMode {
  let requestedType: ProviderMode | undefined = undefined

  // V2 format: check provider.default for "tool.mode"
  const defaultProvider = config['provider.default'] as string | undefined
  if (defaultProvider && defaultProvider.startsWith(`${tool}.`)) {
    const mode = defaultProvider.split('.')[1]
    if (mode === 'extension') requestedType = 'extension'
    if (mode === 'cli') requestedType = 'cli'
  }

  requestedType = requestedType ?? DEFAULT_PROVIDER_MODE[tool]
  const valid = VALID_MODES[tool] || [DEFAULT_PROVIDER_MODE[tool]]
  return requestedType && valid.includes(requestedType) ? requestedType : valid[0]!
}

/**
 * Extract ToolOverrides (binaryPath, args, etc) for Extension consumption.
 */
export function extractToolOverrides(
  ide: IdeType,
  config: InspectoSettings,
): Partial<Record<Provider, ToolOverrides>> {
  const result: Partial<Record<Provider, ToolOverrides>> = {}

  if (!config) return result

  // Parse new flat `provider.*` format
  for (const [key, value] of Object.entries(config)) {
    if (!key.startsWith('provider.')) continue

    // We only process tool specific overrides, ignore `.default`
    if (key === 'provider.default') continue

    // Handle `provider.[tool].[mode]`
    const toolIndex = 1
    const modeIndex = 2
    const propIndex = 3

    const parts = key.split('.')

    if (parts.length >= propIndex + 1) {
      const tool = parts[toolIndex] as Provider
      const mode = parts[modeIndex] as ProviderMode
      const prop = parts[propIndex]

      if (!result[tool]) {
        result[tool] = { type: mode }
      }

      const overrides = result[tool]!

      // If we see config for a mode that differs from what we've initialized,
      // it means both modes have config. In v2, mode is determined by provider.default.
      // We will just accumulate the settings for now and let resolveProviderMode decide the active type.

      if (prop === 'bin') overrides.binaryPath = value as string
      if (prop === 'args') overrides.args = value as string[]
      if (prop === 'cwd') overrides.cwd = value as string
      if (prop === 'coldStartDelay') overrides.coldStartDelay = value as number
    }
  }

  return result
}

export function resolveIntents(serverPrompts?: InspectoPromptsConfig): IntentConfig[] {
  // Start with DEFAULT_INTENTS as base
  const baseMap = new Map<string, IntentConfig>()
  for (const intent of DEFAULT_INTENTS) {
    baseMap.set(intent.id, { ...intent } as IntentConfig)
  }

  const defaults = () => Array.from(baseMap.values())

  if (!serverPrompts) return defaults()

  const isReplace =
    !Array.isArray(serverPrompts) &&
    typeof serverPrompts === 'object' &&
    serverPrompts.$replace === true
  const promptsArray = Array.isArray(serverPrompts)
    ? serverPrompts
    : isReplace
      ? serverPrompts.items
      : []

  if (!promptsArray || promptsArray.length === 0) return defaults()

  if (isReplace) {
    // $replace: true — exact list, user controls everything
    const result: IntentConfig[] = []
    for (const item of promptsArray) {
      if (typeof item === 'string') {
        if (baseMap.has(item)) {
          result.push(baseMap.get(item)!)
        } else {
          configLogger.warn(
            `Unknown built-in intent id: "${item}". Available: ${[...baseMap.keys()].join(', ')}`,
          )
        }
      } else if (typeof item === 'object') {
        if (!item.id) {
          configLogger.warn('Intent object missing required "id" field, skipping.')
          continue
        }
        if (item.enabled === false) {
          configLogger.warn(
            `Intent "${item.id}" is listed in $replace but has enabled:false — it will be excluded.`,
          )
          continue
        }
        if (item.kind === 'workflow') {
          if (!item.prompt) {
            configLogger.warn(`Workflow "${item.id}" missing required "prompt", skipping`)
            continue
          }
          result.push({
            kind: 'workflow',
            id: item.id,
            label: item.label ?? item.id,
            prompt: item.prompt,
            confirm: item.confirm ?? false,
            enabled: item.enabled ?? true,
          } as WorkflowConfig)
        } else {
          if (!item.aiIntent) {
            configLogger.warn(`Intent "${item.id}" is missing required "aiIntent".`)
            continue
          }
          result.push(
            (baseMap.has(item.id) ? { ...baseMap.get(item.id)!, ...item } : item) as IntentConfig,
          )
        }
      }
    }
    return result
  }

  // Default: append / override mode.
  // - Objects with known id: merge over built-in (or remove if enabled:false)
  // - Objects with unknown id: append as new intent
  // - Strings: not meaningful in append mode (order is fixed to built-in order + appended)
  const merged = Array.from(baseMap.values())

  for (const item of promptsArray) {
    if (typeof item === 'string') {
      if (!baseMap.has(item)) {
        configLogger.warn(
          `Unknown built-in intent id: "${item}". In append mode, strings have no effect on ordering — use $replace to control order.`,
        )
      }
      // Known string ids are already in merged — nothing to do
      continue
    }

    if (typeof item === 'object') {
      if (!item.id) {
        configLogger.warn('Intent object missing required "id" field, skipping.')
        continue
      }
      if (item.kind === 'workflow') {
        if (!item.prompt) {
          configLogger.warn(`Workflow "${item.id}" missing required "prompt", skipping`)
          continue
        }
        const wfConfig: WorkflowConfig = {
          kind: 'workflow',
          id: item.id,
          label: item.label ?? item.id,
          prompt: item.prompt,
          confirm: item.confirm ?? false,
          enabled: item.enabled ?? true,
        }
        const existingIdx = merged.findIndex(i => i.id === item.id)
        if (existingIdx !== -1) {
          if (item.enabled === false) {
            merged.splice(existingIdx, 1)
          } else {
            merged[existingIdx] = wfConfig
          }
        } else {
          if (item.enabled !== false) {
            merged.push(wfConfig)
          }
        }
      } else {
        if (!item.aiIntent) {
          configLogger.warn(`Intent "${item.id}" is missing required "aiIntent".`)
          continue
        }
        const existingIdx = merged.findIndex(i => i.id === item.id)
        if (existingIdx !== -1) {
          if (item.enabled === false) {
            merged.splice(existingIdx, 1)
          } else {
            merged[existingIdx] = { ...merged[existingIdx], ...item } as IntentConfig
          }
        } else {
          if (item.enabled !== false) {
            merged.push(item as IntentConfig)
          }
        }
      }
    }
  }

  return merged
}

export function resolveWorkflowSlots(
  intents: IntentConfig[],
): import('@inspecto-dev/types').WorkflowSlotOption[] {
  return intents
    .filter(isWorkflowConfig)
    .filter(w => w.enabled !== false)
    .map(w => ({
      id: w.id,
      label: w.label ?? w.id,
      prompt: w.prompt,
      confirm: w.confirm ?? false,
    }))
}

let watchers: fs.FSWatcher[] = []

export function watchConfig(onReload: () => void, cwd = process.cwd(), gitRoot?: string): void {
  if (isWatching) return
  isWatching = true

  // Watch .inspecto/ directories rather than individual files so that newly
  // created files (e.g. prompts.local.json added after server start) are picked up.
  const watchDirs: string[] = [path.join(os.homedir(), '.inspecto')]
  const roots = resolveConfigRoots(cwd, gitRoot ?? cwd)
  for (const root of roots) {
    watchDirs.push(path.join(root, '.inspecto'))
  }

  const CONFIG_FILES = new Set([
    'settings.json',
    'settings.local.json',
    'prompts.json',
    'prompts.local.json',
  ])

  for (const dir of watchDirs) {
    if (!fs.existsSync(dir)) continue
    try {
      const watcher = fs.watch(dir, async (eventType, filename) => {
        if (!filename || !CONFIG_FILES.has(filename)) return
        loadedConfig = null
        loadedPrompts = null
        loadUserConfigSync(true, cwd, gitRoot)
        await loadPromptsConfig(true, cwd, gitRoot)
        onReload()
      })
      watcher.unref()
      watchers.push(watcher)
    } catch (_e) {
      // ignore watch errors (e.g. unsupported fs)
    }
  }
}

export function unwatchConfig(): void {
  for (const watcher of watchers) {
    watcher.close()
  }
  watchers = []
  isWatching = false
}
