import * as vscode from 'vscode'
import path from 'path'
import type { IAiStrategy } from '../types'
import type { Provider, AiPayload } from '@inspecto-dev/types'
import { executeClipboardFallback } from '../../channels/clipboard-fallback'
import { withClipboardGuard, ensureClipboardSuccess } from '../../utils/clipboard'
import { substituteVariables } from '../../utils/variables'

const DEFAULT_COLD_START_DELAY_MS = 5000
const TERMINAL_FOCUS_DELAY_MS = 300
const PASTE_SEND_DELAY_MS = 200

interface CliStrategyOptions {
  target: Provider
  terminalName: string
  defaultBin: string
}

export function createCliExecutor(opts: Omit<CliStrategyOptions, 'target'>) {
  return async function executeCliTerminal(payload: AiPayload): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    const context = { workspaceRoot: workspaceRoot ?? '', filePath: payload.filePath ?? '' }

    let bin = payload.overrides?.binaryPath || opts.defaultBin
    bin = substituteVariables(bin, context)

    let args = payload.overrides?.args || []
    args = args.map(arg => substituteVariables(arg, context))

    const fullCommand = args.length > 0 ? `${bin} ${args.join(' ')}` : bin

    let configuredCwd = payload.overrides?.cwd
    if (configuredCwd) {
      configuredCwd = substituteVariables(configuredCwd, context)
    }

    const autoSend = payload.autoSend ?? false
    const coldStartDelay = payload.overrides?.coldStartDelay ?? DEFAULT_COLD_START_DELAY_MS

    // If a custom cwd is configured, always recreate the terminal to guarantee
    // it starts in the correct directory. VS Code offers no API to change an
    // existing terminal's cwd after creation.
    const existing = vscode.window.terminals.find(t => t.name === opts.terminalName)
    const isNewTerminal = !existing || !!configuredCwd

    if (isNewTerminal) {
      existing?.dispose()
      const cwd =
        configuredCwd || (payload.filePath ? path.dirname(payload.filePath) : workspaceRoot)
      vscode.window.createTerminal({ name: opts.terminalName, cwd: cwd ?? '' })
    }

    // Re-resolve after possible recreation
    const terminal = vscode.window.terminals.find(t => t.name === opts.terminalName)!
    terminal.show(true)

    if (isNewTerminal) {
      terminal.sendText(fullCommand, true)
      await new Promise(resolve => setTimeout(resolve, coldStartDelay))
    } else {
      await new Promise(resolve => setTimeout(resolve, TERMINAL_FOCUS_DELAY_MS))
    }

    const result = await withClipboardGuard(payload.prompt, async () => {
      await vscode.commands.executeCommand('workbench.action.terminal.paste')

      if (autoSend) {
        await new Promise(resolve => setTimeout(resolve, PASTE_SEND_DELAY_MS))
        terminal.sendText('', true)
      }
    })

    ensureClipboardSuccess(result)
  }
}

export function createCliStrategy(opts: CliStrategyOptions): IAiStrategy {
  return {
    target: opts.target,
    channels: [
      { type: 'cli', execute: createCliExecutor(opts) },
      { type: 'clipboard', execute: executeClipboardFallback },
    ],
  }
}
