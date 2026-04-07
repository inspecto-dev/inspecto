import * as vscode from 'vscode'
import type { IAiStrategy } from './types'
import { getDualModeProviderCapability, type AiPayload } from '@inspecto-dev/types'
import { executeClipboardFallback } from '../channels/clipboard-fallback'
import { executeRobustPaste, withClipboardGuard, ensureClipboardSuccess } from '../utils/clipboard'
import { createCliExecutor } from './utils/cli-strategy'
import { RecoverableChannelError } from '../fallback-chain'

const CODEX_EXTENSION_ID = getDualModeProviderCapability('codex')!.extensionId

const COMMANDS = {
  // Injects { comment } as prompt and submits immediately.
  IMPLEMENT_TODO: 'chatgpt.implementTodo',
  // VS Code native view focus — reveals sidebar without creating a new thread.
  FOCUS_SIDEBAR: 'chatgpt.sidebarSecondaryView.focus',
} as const

// Delay after focusing sidebar before pasting — allows webview to acquire focus.
const FOCUS_SETTLE_MS = 1000

async function executeCodexPlugin(payload: AiPayload): Promise<void> {
  const codexExt = vscode.extensions.getExtension(CODEX_EXTENSION_ID)
  if (!codexExt) {
    throw new RecoverableChannelError(`Codex extension (${CODEX_EXTENSION_ID}) not found`)
  }

  if (!codexExt.isActive) {
    await codexExt.activate()
  }

  const autoSend = payload.autoSend ?? false

  if (autoSend) {
    // chatgpt.implementTodo accepts { comment } and submits the prompt immediately.
    await vscode.commands.executeCommand(COMMANDS.IMPLEMENT_TODO, { comment: payload.prompt })
    return
  }

  // autoSend=false: write prompt to clipboard, focus sidebar, then paste into
  // the input field without submitting — user reviews before sending.
  const result = await withClipboardGuard(payload.prompt, async () => {
    await vscode.commands.executeCommand(COMMANDS.FOCUS_SIDEBAR)
    await new Promise(resolve => setTimeout(resolve, FOCUS_SETTLE_MS))
    await executeRobustPaste(payload.prompt)
  })

  ensureClipboardSuccess(result)
}

export const codexStrategy: IAiStrategy = {
  target: 'codex',
  channels: [
    { type: 'extension', execute: executeCodexPlugin },
    {
      type: 'cli',
      execute: createCliExecutor({
        terminalName: 'CodeX CLI',
        defaultBin: 'codex',
      }),
    },
    { type: 'clipboard', execute: executeClipboardFallback },
  ],
}
