import * as vscode from 'vscode'
import type { IAiStrategy } from './types'
import type { AiPayload } from '@inspecto/types'
import { executeClipboardFallback } from '../channels/clipboard-fallback'
import { withClipboardGuard, executeRobustPaste } from '../utils/clipboard'
import { createCliExecutor } from './utils/cli-strategy'
import { RecoverableChannelError } from '../fallback-chain'

const CLAUDE_EXTENSION_ID = 'anthropic.claude-code'

const COMMANDS = {
  FOCUS: 'claude-vscode.focus',
  PRIMARY_EDITOR_OPEN: 'claude-vscode.primaryEditor.open',
} as const

// Delay after focusing sidebar before pasting — allows webview to acquire focus.
const FOCUS_SETTLE_MS = 500

async function executeClaudePlugin(payload: AiPayload): Promise<void> {
  const claudeExt = vscode.extensions.getExtension(CLAUDE_EXTENSION_ID)
  if (!claudeExt) {
    throw new RecoverableChannelError(`Claude Code extension (${CLAUDE_EXTENSION_ID}) not found`)
  }

  if (!claudeExt.isActive) {
    await claudeExt.activate()
  }

  // Strategy:
  // 1. If autoSend is true, it is not currently supported (no implementation available).
  // 2. For autoSend false (or default): write to clipboard, check if it's the first time
  //    opening the panel. If first time, use claude-vscode.primaryEditor.open.
  //    Otherwise, use claude-vscode.focus to bring up the panel, then use fallback paste methods.
  const result = await withClipboardGuard(payload.prompt, async () => {
    //   await vscode.commands.executeCommand(COMMANDS.PRIMARY_EDITOR_OPEN, undefined, payload.prompt)
    await vscode.commands.executeCommand(COMMANDS.FOCUS)
    await new Promise(resolve => setTimeout(resolve, FOCUS_SETTLE_MS))
    await executeRobustPaste(payload.prompt)
  })

  if (!result.success) {
    throw new Error(result.error ?? 'Clipboard operation failed')
  }
}

export const claudeStrategy: IAiStrategy = {
  target: 'claude-code',
  channels: [
    { type: 'plugin', execute: executeClaudePlugin },
    {
      type: 'cli',
      execute: createCliExecutor({
        terminalName: 'Claude CLI',
        defaultBin: 'claude',
      }),
    },
    { type: 'clipboard', execute: executeClipboardFallback },
  ],
}
