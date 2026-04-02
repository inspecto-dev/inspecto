// ============================================================
// src/detect/provider.ts — AI Provider detection (v1)
//
// Detects installed AI providers via PATH (CLI) or IDE extensions (Extension).
// ============================================================
import path from 'node:path'
import { exists, readJSON } from '../utils/fs.js'
import { which } from '../utils/exec.js'
import type { Provider, ProviderMode } from '@inspecto-dev/types'

export interface ProviderDetection {
  id: Provider
  label: string
  supported: boolean
  providerModes: Array<'cli' | 'extension'>
  // The primary mode that will be written to settings if selected
  preferredMode: 'cli' | 'extension'
}

const KNOWN_CLI_TOOLS: { id: Provider; bin: string; label: string; supported: boolean }[] = [
  { id: 'claude-code', bin: 'claude', label: 'Claude Code', supported: true },
  { id: 'coco', bin: 'coco', label: 'Trae CLI (Coco)', supported: true },
  { id: 'codex', bin: 'codex', label: 'Codex CLI', supported: true },
  { id: 'gemini', bin: 'gemini', label: 'Gemini CLI', supported: true },
]

const KNOWN_IDE_PLUGINS: { id: Provider; extId: string; label: string; supported: boolean }[] = [
  { id: 'claude-code', extId: 'anthropic.claude-code', label: 'Claude Code', supported: true },
  { id: 'copilot', extId: 'github.copilot', label: 'GitHub Copilot', supported: true },
  { id: 'codex', extId: 'openai.chatgpt', label: 'Codex (ChatGPT)', supported: true },
  { id: 'gemini', extId: 'google.geminicodeassist', label: 'Gemini Code Assist', supported: true },
]

export interface ProviderProbeResult {
  detected: ProviderDetection[]
}

/**
 * Detect all installed AI tools by checking PATH binaries and IDE extensions.
 */
export async function detectProviders(root: string): Promise<ProviderProbeResult> {
  // Use a map to merge duplicate CLI/Plugin detections for the same AI tool
  const detectedMap = new Map<Provider, ProviderDetection>()

  // 1. Detect CLI tools concurrently
  const cliChecks = KNOWN_CLI_TOOLS.map(async tool => {
    if (await which(tool.bin)) {
      detectedMap.set(tool.id, {
        id: tool.id,
        label: tool.label,
        supported: tool.supported,
        providerModes: ['cli'],
        preferredMode: 'cli',
      })
    }
  })
  await Promise.all(cliChecks)

  // 2. Detect IDE plugins (VS Code extensions)
  // Check the local workspace .vscode/extensions.json first (recommendations)
  const extensionsJsonPath = path.join(root, '.vscode', 'extensions.json')
  let recommendedExts: string[] = []
  if (await exists(extensionsJsonPath)) {
    try {
      const extData = await readJSON<{ recommendations?: string[] }>(extensionsJsonPath)
      if (extData && Array.isArray(extData.recommendations)) {
        recommendedExts = extData.recommendations.map(e => e.toLowerCase())
      }
    } catch {
      // ignore JSON parse errors here
    }
  }

  // Check user's global VS Code extensions folder once
  const homeDir = process.env.HOME || process.env.USERPROFILE || ''
  const globalExtDir = path.join(homeDir, '.vscode', 'extensions')
  const globalExtExists = await exists(globalExtDir)
  let installedExtensionFolders: string[] = []

  if (globalExtExists) {
    try {
      const { readdir } = await import('node:fs/promises')
      installedExtensionFolders = await readdir(globalExtDir)

      // Filter out obsolete extensions
      const obsoletePath = path.join(globalExtDir, '.obsolete')
      if (await exists(obsoletePath)) {
        try {
          const obsoleteData = await readJSON<Record<string, boolean>>(obsoletePath)
          if (obsoleteData) {
            const obsoleteKeys = Object.keys(obsoleteData)
            installedExtensionFolders = installedExtensionFolders.filter(folder => {
              // The folder name usually contains the version, e.g., 'github.copilot-1.2.3'
              // but the obsolete key might just be the exact folder name
              return !obsoleteKeys.includes(folder)
            })
          }
        } catch {
          // Ignore parse errors for .obsolete
        }
      }
    } catch {
      // Fallback or ignore
    }
  }

  // Check all IDE plugins
  for (const plugin of KNOWN_IDE_PLUGINS) {
    let isInstalled = false

    // Check if it's explicitly recommended in the workspace
    if (recommendedExts.includes(plugin.extId.toLowerCase())) {
      isInstalled = true
    }
    // Otherwise check our pre-fetched global extensions list
    else if (
      installedExtensionFolders.some(f => {
        const lower = f.toLowerCase()
        return (
          lower === plugin.extId.toLowerCase() || lower.startsWith(plugin.extId.toLowerCase() + '-')
        )
      })
    ) {
      // NOTE: We used to just check if the folder exists, but when a VS Code extension
      // is uninstalled, the folder is not immediately removed. Instead, VS Code creates
      // an `.obsolete` file in the `.vscode/extensions` directory containing the keys of
      // uninstalled extensions, or it renames the extension folder.
      isInstalled = true
    }

    if (isInstalled) {
      // If we already detected the CLI version of this tool, we append 'extension' to the modes
      // and set the preferredMode to 'extension' since extension integration is generally more seamless.
      const existing = detectedMap.get(plugin.id)
      if (existing) {
        existing.providerModes.push('extension')
        existing.preferredMode = 'extension'
      } else {
        detectedMap.set(plugin.id, {
          id: plugin.id,
          label: plugin.label,
          supported: plugin.supported,
          providerModes: ['extension'],
          preferredMode: 'extension',
        })
      }
    }
  }

  return { detected: Array.from(detectedMap.values()) }
}
