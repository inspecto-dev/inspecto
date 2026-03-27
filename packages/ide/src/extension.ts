import * as vscode from 'vscode'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import type { IdeInfo } from '@inspecto/types'
import { InspectoUriHandler } from './uri-handler'
import { detectIde, resolveAvailableTargets, isExtensionInstalled } from './ide-detector'

const MAX_RETRIES = 5
const RETRY_BASE_MS = 1000

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('Inspecto')
  context.subscriptions.push(outputChannel)
  outputChannel.appendLine('Inspecto extension activated')
  outputChannel.appendLine(`IDE: ${vscode.env.uriScheme} / ${vscode.env.appName}`)

  // Detect IDE once — shared by URI handler and server push
  const ide = detectIde()
  const targets = resolveAvailableTargets(ide)

  context.subscriptions.push(vscode.window.registerUriHandler(new InspectoUriHandler(ide)))

  context.subscriptions.push(
    vscode.commands.registerCommand('inspecto.help', () => {
      vscode.window.showInformationMessage('inspecto: Use the browser overlay to inspect elements.')
    }),
  )

  let retryTimeoutId: NodeJS.Timeout | undefined

  const pushInfoWithRetry = async (attempt = 1): Promise<boolean> => {
    const success = await pushIdeInfoToServer({
      ide,
      scheme: vscode.env.uriScheme,
      providers: {
        'github-copilot': { mode: 'plugin', installed: targets.includes('github-copilot') },
        'claude-code': { mode: 'plugin', installed: targets.includes('claude-code') },
        gemini: { mode: 'plugin', installed: targets.includes('gemini') },
        codex: { mode: 'plugin', installed: targets.includes('codex') },
        coco: { mode: 'cli', installed: targets.includes('coco') },
      },
    })

    if (success) return true

    if (attempt < MAX_RETRIES) {
      // Exponential backoff: 2s, 4s, 8s, 16s
      const delay = Math.pow(2, attempt) * RETRY_BASE_MS
      if (retryTimeoutId) clearTimeout(retryTimeoutId)
      retryTimeoutId = setTimeout(() => pushInfoWithRetry(attempt + 1), delay)
    } else {
      outputChannel.appendLine(
        '[inspecto] Could not reach dev server after 5 attempts. Start your dev server and run "Inspecto: Push IDE Info" to retry.',
      )
    }

    return false
  }

  // Push immediately on activation
  pushInfoWithRetry()

  context.subscriptions.push(
    vscode.commands.registerCommand('inspecto.reportIde', async () => {
      if (retryTimeoutId) clearTimeout(retryTimeoutId)
      const success = await pushInfoWithRetry()
      if (success) {
        vscode.window.showInformationMessage('inspecto: Pushed IDE info to local dev server.')
      } else {
        vscode.window.showWarningMessage('inspecto: Could not reach dev server. Is it running?')
      }
    }),
  )

  context.subscriptions.push({
    dispose: () => {
      if (retryTimeoutId) clearTimeout(retryTimeoutId)
    },
  })
}

async function pushIdeInfoToServer(info: IdeInfo): Promise<boolean> {
  const ports = resolveServerPorts()
  for (const port of ports) {
    try {
      const res = await fetch(`http://localhost:${port}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      })
      if (res.ok) return true
    } catch {
      continue
    }
  }
  return false
}

/** Returns candidate ports to try, preferring the port file written by the plugin. */
function resolveServerPorts(): number[] {
  const portFile = path.join(os.tmpdir(), 'inspecto.port')
  try {
    const raw = fs.readFileSync(portFile, 'utf-8').trim()
    const port = parseInt(raw, 10)
    if (!isNaN(port) && port > 0 && port < 65536) {
      return [port]
    }
  } catch {
    // File not present — fall through to scan range
  }
  // Scan range fallback: covers portfinder's typical allocation window
  return Array.from({ length: 23 }, (_, i) => 5678 + i)
}

export function deactivate(): void {
  // Disposables registered via context.subscriptions are cleaned up automatically.
  // deactivate() is kept as the required VS Code lifecycle hook.
}
