import * as vscode from 'vscode'
import type { IAiStrategy } from './types'
import type { AiPayload } from '@inspecto/types'
import { executeClipboardFallback } from '../channels/clipboard-fallback'
import { executeRobustPaste, withClipboardGuard } from '../utils/clipboard'
import { RecoverableChannelError } from '../fallback-chain'

const COMMANDS = {
  FOCUS: 'workbench.panel.chat.view.copilot.focus',
  OPEN: 'workbench.action.chat.open',
} as const

// Delay after focusing sidebar before pasting — allows webview to acquire focus.
const FOCUS_SETTLE_MS = 500

async function executeCopilotApi(payload: AiPayload): Promise<void> {
  const copilotExt = vscode.extensions.getExtension('github.copilot-chat')
  if (!copilotExt) {
    throw new RecoverableChannelError('GitHub Copilot Chat extension not found')
  }

  if (!copilotExt.isActive) {
    await copilotExt.activate()
  }

  const autoSend = payload.overrides?.autoSend ?? false

  if (autoSend) {
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: payload.prompt,
      isPartialQuery: false,
    })
    return
  }

  const result = await withClipboardGuard(payload.prompt, async () => {
    await vscode.commands.executeCommand(COMMANDS.FOCUS)
    await new Promise(resolve => setTimeout(resolve, FOCUS_SETTLE_MS))
    await executeRobustPaste(payload.prompt)
  })

  if (!result.success) {
    throw new Error(result.error ?? 'Clipboard operation failed')
  }
}

export const copilotStrategy: IAiStrategy = {
  target: 'github-copilot',
  channels: [
    { type: 'plugin', execute: executeCopilotApi },
    { type: 'clipboard', execute: executeClipboardFallback },
  ],
}
