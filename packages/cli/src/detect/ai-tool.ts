// ============================================================
// src/detect/ai-tool.ts — AI Tool detection (v1)
//
// Detects installed AI tools via PATH (CLI) or IDE extensions (Plugin).
// ============================================================
import path from 'node:path'
import { exists, readJSON } from '../utils/fs.js'
import { which } from '../utils/exec.js'
import type { AiTool } from '@inspecto/types'

export interface AIToolDetection {
  id: AiTool
  label: string
  supported: boolean
  toolModes: Array<'cli' | 'plugin'>
  // The primary mode that will be written to settings if selected
  preferredMode: 'cli' | 'plugin'
}

const KNOWN_CLI_TOOLS: { id: AiTool; bin: string; label: string; supported: boolean }[] = [
  { id: 'claude-code', bin: 'claude', label: 'Claude Code', supported: true },
  { id: 'coco', bin: 'coco', label: 'Trae CLI (Coco)', supported: true },
  { id: 'codex', bin: 'codex', label: 'Codex CLI', supported: true },
  { id: 'gemini', bin: 'gemini', label: 'Gemini CLI', supported: true },
]

const KNOWN_IDE_PLUGINS: { id: AiTool; extId: string; label: string; supported: boolean }[] = [
  { id: 'claude-code', extId: 'anthropic.claude-code', label: 'Claude Code', supported: true },
  { id: 'github-copilot', extId: 'github.copilot', label: 'GitHub Copilot', supported: true },
  { id: 'codex', extId: 'openai.chatgpt', label: 'Codex (ChatGPT)', supported: true },
  { id: 'gemini', extId: 'google.geminicodeassist', label: 'Gemini Code Assist', supported: true },
]

export interface AIToolProbeResult {
  detected: AIToolDetection[]
}

/**
 * Detect all installed AI tools by checking PATH binaries and IDE extensions.
 */
export async function detectAITools(root: string): Promise<AIToolProbeResult> {
  // Use a map to merge duplicate CLI/Plugin detections for the same AI tool
  const detectedMap = new Map<AiTool, AIToolDetection>()

  // 1. Detect CLI tools
  for (const tool of KNOWN_CLI_TOOLS) {
    if (await which(tool.bin)) {
      detectedMap.set(tool.id, {
        id: tool.id,
        label: tool.label,
        supported: tool.supported,
        toolModes: ['cli'],
        preferredMode: 'cli',
      })
    }
  }

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

  // Check user's global VS Code extensions folder
  const homeDir = process.env.HOME || process.env.USERPROFILE || ''
  const globalExtDir = path.join(homeDir, '.vscode', 'extensions')
  const globalExtExists = await exists(globalExtDir)

  // Wait for all plugin checks to resolve
  for (const plugin of KNOWN_IDE_PLUGINS) {
    let isInstalled = false

    // Check if it's explicitly recommended in the workspace
    if (recommendedExts.includes(plugin.extId.toLowerCase())) {
      isInstalled = true
    }
    // Otherwise try to find it in the global extensions folder by prefix
    else if (globalExtExists) {
      try {
        const { readdir } = await import('node:fs/promises')
        const folders = await readdir(globalExtDir)
        if (
          folders.some(f => {
            const lower = f.toLowerCase()
            return (
              lower === plugin.extId.toLowerCase() ||
              lower.startsWith(plugin.extId.toLowerCase() + '-')
            )
          })
        ) {
          isInstalled = true
        }
      } catch {
        // Fallback or ignore
      }
    }

    if (isInstalled) {
      // If we already detected the CLI version of this tool, we append 'plugin' to the modes
      // and set the preferredMode to 'plugin' since plugin integration is generally more seamless.
      const existing = detectedMap.get(plugin.id)
      if (existing) {
        existing.toolModes.push('plugin')
        existing.preferredMode = 'plugin'
      } else {
        detectedMap.set(plugin.id, {
          id: plugin.id,
          label: plugin.label,
          supported: plugin.supported,
          toolModes: ['plugin'],
          preferredMode: 'plugin',
        })
      }
    }
  }

  return { detected: Array.from(detectedMap.values()) }
}
