// ============================================================
// src/detect/ide.ts — IDE detection (v1: VS Code only)
//
// Detects ALL known IDEs, but only VS Code is fully supported.
// Others are recognized and surfaced as unsupported.
// ============================================================
import path from 'node:path'
import { exists } from '../utils/fs.js'

export type IDEDetection = {
  ide: string
  supported: boolean
}

export type IDEProbeResult = {
  detected: IDEDetection[]
}

const SUPPORTED_IDE = 'vscode'

/**
 * Detect all installed IDEs based on directory artifacts and environment.
 */
export async function detectIDE(root: string): Promise<IDEProbeResult> {
  const detected: Map<string, IDEDetection> = new Map()

  // 1. Check Terminal Environment (Highest confidence for current session)

  // Cursor
  if (process.env.CURSOR_TRACE_DIR || process.env.CURSOR_CHANNEL) {
    detected.set('Cursor', { ide: 'Cursor', supported: false })
  }

  // Trae
  if (
    process.env.TRAE_APP_DIR ||
    process.env.__CFBundleIdentifier === 'com.byteocean.trae' ||
    process.env.COCO_IDE_PLUGIN_TYPE === 'Trae' ||
    (process.env.npm_config_user_agent && process.env.npm_config_user_agent.includes('trae'))
  ) {
    detected.set('Trae', { ide: 'Trae', supported: false })
  }

  // Zed
  if (process.env.ZED_TERM) {
    detected.set('Zed', { ide: 'Zed', supported: false })
  }

  // VS Code
  // Must ensure we haven't already flagged it as Trae/Cursor since they share this variable
  if (process.env.TERM_PROGRAM === 'vscode') {
    if (!detected.has('Trae') && !detected.has('Cursor')) {
      detected.set('vscode', { ide: SUPPORTED_IDE, supported: true })
    }
  }

  // 2. Check Directory Artifacts (Indicates project has been opened in these IDEs)
  if (await exists(path.join(root, '.trae'))) {
    detected.set('Trae', { ide: 'Trae', supported: false })
  }
  if (await exists(path.join(root, '.cursor'))) {
    detected.set('Cursor', { ide: 'Cursor', supported: false })
  }
  if (await exists(path.join(root, '.vscode'))) {
    // Only add vscode if it wasn't already caught by terminal,
    // or if the terminal is something else but .vscode exists.
    if (!detected.has('vscode')) {
      detected.set('vscode', { ide: SUPPORTED_IDE, supported: true })
    }
  }
  if (await exists(path.join(root, '.idea'))) {
    detected.set('JetBrains IDE', { ide: 'JetBrains IDE', supported: false })
  }

  return {
    detected: Array.from(detected.values()),
  }
}
