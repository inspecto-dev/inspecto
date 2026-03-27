import * as vscode from 'vscode'
import { execSync } from 'node:child_process'
import type { IdeType, AiTool } from '@inspecto/types'

/** Primary: uriScheme (most reliable). Fallback: appName heuristic. */
export function detectIde(): IdeType {
  const scheme = vscode.env.uriScheme
  if (scheme === 'vscode') return 'vscode'

  // Fallback: appName
  const name = vscode.env.appName.toLowerCase()
  if (name.includes('vscode')) return 'vscode'

  return 'vscode' // safe default
}

export function resolveAvailableTargets(ide: IdeType): AiTool[] {
  const targets: Set<AiTool> = new Set()

  if (isExtensionInstalled('github.copilot-chat')) targets.add('github-copilot')

  if (isExtensionInstalled('anthropic.claude-code') || isCliAvailable('claude'))
    targets.add('claude-code')

  if (isExtensionInstalled('google.geminicodeassist') || isCliAvailable('gemini'))
    targets.add('gemini')

  if (isExtensionInstalled('openai.chatgpt') || isCliAvailable('codex')) targets.add('codex')

  if (isCliAvailable('coco')) targets.add('coco')

  return Array.from(targets)
}

export function isExtensionInstalled(extensionId: string): boolean {
  return vscode.extensions.getExtension(extensionId) !== undefined
}

function isCliAvailable(bin: string): boolean {
  const cmd = process.platform === 'win32' ? `where ${bin}` : `which ${bin}`
  try {
    execSync(cmd, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}
