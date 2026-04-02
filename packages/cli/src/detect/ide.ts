// ============================================================
// src/detect/ide.ts — IDE detection
//
// Detects ALL known IDEs, but only VS Code, Cursor, and Trae are fully supported.
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
    detected.set('Cursor', { ide: 'cursor', supported: true })
  }

  // Trae
  if (
    process.env.TRAE_APP_DIR ||
    process.env.__CFBundleIdentifier === 'com.byteocean.trae' ||
    process.env.COCO_IDE_PLUGIN_TYPE === 'Trae' ||
    (process.env.npm_config_user_agent && process.env.npm_config_user_agent.includes('trae'))
  ) {
    detected.set('Trae', { ide: 'trae', supported: true })
  }

  // Zed
  if (process.env.ZED_TERM) {
    detected.set('Zed', { ide: 'Zed', supported: false })
  }

  // Windsurf
  if (
    process.env.WINDSURF_APP_DIR ||
    process.env.WINDSURF_CHANNEL ||
    process.env.__CFBundleIdentifier === 'com.codeium.windsurf' ||
    (process.env.npm_config_user_agent && process.env.npm_config_user_agent.includes('windsurf'))
  ) {
    detected.set('Windsurf', { ide: 'Windsurf', supported: false })
  }

  // VS Code
  // We cannot rely purely on TERM_PROGRAM === 'vscode' because Cursor and Trae also use it.
  // We should ONLY use it as a fallback if no other specific variables were found, and we'll do that at the end.
  // if (process.env.TERM_PROGRAM === 'vscode') { ... }

  // 2. Check Directory Artifacts (Indicates project has been opened in these IDEs)
  const [hasTrae, hasCursor, hasVscode, hasIdea] = await Promise.all([
    exists(path.join(root, '.trae')),
    exists(path.join(root, '.cursor')),
    exists(path.join(root, '.vscode')),
    exists(path.join(root, '.idea')),
  ])

  // If a directory artifact exists, add it to the detection list.
  // This allows us to surface multiple options (e.g. if you are in Cursor but also have a .vscode folder).
  if (hasTrae && !detected.has('Trae')) {
    detected.set('Trae', { ide: 'trae', supported: true })
  }
  if (hasCursor && !detected.has('Cursor')) {
    detected.set('Cursor', { ide: 'cursor', supported: true })
  }

  // Only add vscode based on .vscode directory if it wasn't already added.
  if (hasVscode && !detected.has('vscode')) {
    detected.set('vscode', { ide: SUPPORTED_IDE, supported: true })
  }

  if (hasIdea && !detected.has('JetBrains IDE')) {
    detected.set('JetBrains IDE', { ide: 'JetBrains IDE', supported: false })
  }

  // Fallback: If we still don't have ANY IDE detected, but we are in a terminal that identifies as 'vscode'
  // (which could be Cursor without its specific env vars, though rare), we fallback to 'vscode'
  if (detected.size === 0 && process.env.TERM_PROGRAM === 'vscode') {
    detected.set('vscode', { ide: SUPPORTED_IDE, supported: true })
  }

  return {
    detected: Array.from(detected.values()),
  }
}
