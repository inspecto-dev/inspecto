import * as vscode from 'vscode'
import { execSync } from 'node:child_process'
import type { IdeType, Provider } from '@inspecto-dev/types'

/** AppName heuristic first for forks, then fallback to uriScheme. */
export function detectIde(): IdeType {
  const scheme = vscode.env.uriScheme?.toLowerCase() || ''
  const name = vscode.env.appName?.toLowerCase() || ''

  // Log to understand what exactly vscode.env.appName is returning
  console.log(`[Inspecto IDE Detection] uriScheme: '${scheme}', appName: '${name}'`)

  // Sometimes appName is something like "code", but the real giveaway is the URI scheme
  // Trae CN sets uriScheme to 'trae-cn' but might have an unpredictable appName sometimes
  if (scheme === 'trae-cn' || scheme === 'trae cn') return 'trae-cn'
  if (scheme === 'trae') return 'trae'
  if (scheme === 'cursor') return 'cursor'

  // App name is usually a stronger indicator for VS Code forks
  // because forks sometimes forget to change the uriScheme or leave it as 'vscode'.
  if (name.includes('trae cn') || name.includes('trae-cn')) return 'trae-cn'
  if (name.includes('trae')) return 'trae'
  if (name.includes('cursor')) return 'cursor'

  if (name.includes('vscode') || name.includes('visual studio code')) return 'vscode'
  if (scheme === 'vscode') return 'vscode'

  return 'vscode' // safe default
}

export function resolveAvailableTargets(ide: IdeType): Provider[] {
  const targets: Set<Provider> = new Set()

  if (ide === 'trae-cn' || ide === 'trae') {
    targets.add('trae')
  }

  if (ide === 'cursor') {
    targets.add('cursor')
  }

  if (isExtensionInstalled('github.copilot-chat')) targets.add('copilot')

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
    // When VS Code extension runs, its process.env.PATH might not include ~/.local/bin or other custom paths
    // where user-installed CLI tools typically reside (like coco).
    // In typical dev environments, we rely on the OS resolving the bin.
    const env = { ...process.env }

    if (process.platform !== 'win32') {
      // Append common bin directories to PATH if they aren't already there
      const home = process.env.HOME || process.env.USERPROFILE || ''
      const customPaths = [`${home}/.local/bin`, `/usr/local/bin`, `/opt/homebrew/bin`]

      const currentPaths = (env.PATH || '').split(':')
      const newPaths = customPaths.filter(p => !currentPaths.includes(p))

      if (newPaths.length > 0) {
        env.PATH = `${env.PATH}:${newPaths.join(':')}`
      }
    }

    execSync(cmd, { stdio: 'ignore', env })
    return true
  } catch {
    return false
  }
}
