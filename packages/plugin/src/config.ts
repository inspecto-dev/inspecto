import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createDefu } from 'defu'
import type {
  InspectoSettings,
  InspectoPromptsConfig,
  AiTool,
  ToolMode,
  ToolOverrides,
  IdeType,
} from '@inspecto/types'
import { DEFAULT_TOOL_MODE, VALID_MODES } from '@inspecto/types'

let loadedConfig: InspectoSettings | null = null
let loadedPrompts: InspectoPromptsConfig | null = null
let isWatching = false

// Custom array merge behavior for defu: overwrite arrays instead of concatenating them
const arrayReplaceMerge = createDefu((obj, key, val) => {
  if (Array.isArray(val)) {
    obj[key] = val
    return true
  }
})

/**
 * Walk from cwd up to gitRoot (inclusive), collecting directories that contain
 * a .inspecto/ subdirectory. Returns them ordered highest-priority first
 * (closest to cwd first).
 *
 * If cwd is not under gitRoot, only cwd itself is checked.
 */
export function resolveConfigRoots(cwd: string, gitRoot: string): string[] {
  const roots: string[] = []
  let current = cwd

  // Ensure we don't walk past gitRoot (handles cwd above gitRoot case)
  const isUnderOrEqual = current === gitRoot || current.startsWith(gitRoot + path.sep)
  if (!isUnderOrEqual) {
    // cwd is not under gitRoot — only check cwd
    if (fs.existsSync(path.join(cwd, '.inspecto'))) roots.push(cwd)
    return roots
  }

  while (true) {
    if (fs.existsSync(path.join(current, '.inspecto'))) {
      roots.push(current)
    }
    if (current === gitRoot) break
    const parent = path.dirname(current)
    if (parent === current) break // filesystem root guard
    current = parent
  }

  return roots
}

/**
 * Load and merge user config from all discovered .inspecto/ layers:
 *
 * Priority (highest → lowest):
 *   <cwd>/.inspecto/settings.local.json
 *   <cwd>/.inspecto/settings.json
 *   ...intermediate dirs...
 *   <gitRoot>/.inspecto/settings.local.json
 *   <gitRoot>/.inspecto/settings.json
 *   ~/.inspecto/settings.json
 *
 * @param force    Bust cache and re-read from disk
 * @param cwd      Working directory to start resolution from (default: process.cwd())
 * @param gitRoot  Git repository root — upward traversal stops here (optional)
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
  layers.push({ providers: {} })

  const validLayers = layers.filter(l => l !== null)
  loadedConfig = arrayReplaceMerge(...(validLayers as [object, ...object[]])) as InspectoSettings
  return loadedConfig
}

/**
 * Load and merge prompts config from all discovered .inspecto/ layers:
 *
 * Priority (highest → lowest):
 *   <cwd>/.inspecto/prompts.local.json
 *   <cwd>/.inspecto/prompts.json
 *   ...intermediate dirs...
 *   <gitRoot>/.inspecto/prompts.local.json
 *   <gitRoot>/.inspecto/prompts.json
 *   ~/.inspecto/prompts.json
 *
 * Arrays in custom configurations are replaced instead of merged.
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
      console.warn(`[inspecto] Failed to parse config at ${filePath}: Invalid JSON`)
    } else {
      console.warn(`[inspecto] Failed to read config at ${filePath}:`, e)
    }
  }
  return null
}

/**
 * Resolve the exact target tool to dispatch to based on user config.
 */
export function resolveTargetTool(config: InspectoSettings): AiTool {
  if (config.prefer) {
    return config.prefer as AiTool
  }
  if (config.providers && Object.keys(config.providers).length > 0) {
    return Object.keys(config.providers)[0] as AiTool
  }
  return 'github-copilot'
}

/**
 * Resolve the effective mode/type for a tool in the context of an IDE.
 */
export function resolveToolMode(tool: AiTool, ide: IdeType, config: InspectoSettings): ToolMode {
  let requestedType: ToolMode | undefined = undefined

  // Check providers config
  if (config.providers && config.providers[tool] && config.providers[tool].type) {
    const type = config.providers[tool].type
    if (type === 'plugin' || type === 'cli') {
      requestedType = type
    }
  }

  requestedType = requestedType ?? DEFAULT_TOOL_MODE[tool]
  const valid = VALID_MODES[tool] || [DEFAULT_TOOL_MODE[tool]]
  return requestedType && valid.includes(requestedType) ? requestedType : valid[0]!
}

/**
 * Extract ToolOverrides (binaryPath, args, etc) for Extension consumption.
 */
export function extractToolOverrides(
  ide: IdeType,
  config: InspectoSettings,
): Partial<Record<AiTool, ToolOverrides>> {
  const result: Partial<Record<AiTool, ToolOverrides>> = {}

  if (!config.providers) return result

  for (const [tool, cfg] of Object.entries(config.providers)) {
    if (!cfg) continue

    const overrides: ToolOverrides = {
      type: cfg.type || DEFAULT_TOOL_MODE[tool as AiTool] || 'plugin',
    }
    if (cfg.bin) overrides.binaryPath = cfg.bin
    if (cfg.args) overrides.args = cfg.args
    if (cfg.cwd) overrides.cwd = cfg.cwd
    if (cfg.autoSend !== undefined) overrides.autoSend = cfg.autoSend

    result[tool as AiTool] = overrides
  }

  return result
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
    } catch (e) {
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
