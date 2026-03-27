// TODO: Requires manual verification. Currently unable to test locally due to
// regional restrictions of the Gemini Code Assist extension for individuals.

import * as vscode from 'vscode'
import type { IAiStrategy } from './types'
import type { AiPayload } from '@inspecto/types'
import { executeClipboardFallback } from '../channels/clipboard-fallback'
import { withClipboardGuard, executeRobustPaste } from '../utils/clipboard'
import { createCliExecutor } from './utils/cli-strategy'
import { RecoverableChannelError } from '../fallback-chain'

const GEMINI_EXTENSION_ID = 'google.geminicodeassist'

const COMMANDS = {
  FOCUS: 'cloudcode.gemini.chatView.focus',
} as const

// Delay after focusing sidebar before pasting — allows webview to acquire focus.
const FOCUS_SETTLE_MS = 600

async function executeGeminiPlugin(payload: AiPayload): Promise<void> {
  const geminiExt = vscode.extensions.getExtension(GEMINI_EXTENSION_ID)
  if (!geminiExt) {
    throw new RecoverableChannelError(
      `Gemini Code Assist extension (${GEMINI_EXTENSION_ID}) not found`,
    )
  }

  if (!geminiExt.isActive) {
    await geminiExt.activate()
  }

  const result = await withClipboardGuard(payload.prompt, async () => {
    await vscode.commands.executeCommand(COMMANDS.FOCUS)
    await new Promise(resolve => setTimeout(resolve, FOCUS_SETTLE_MS))
    await executeRobustPaste(payload.prompt)
  })

  if (!result.success) {
    throw new Error(result.error ?? 'Clipboard write failed')
  }
}

export const geminiStrategy: IAiStrategy = {
  target: 'gemini',
  channels: [
    { type: 'plugin', execute: executeGeminiPlugin },
    {
      type: 'cli',
      execute: createCliExecutor({
        terminalName: 'Gemini CLI',
        defaultBin: 'gemini',
      }),
    },
    { type: 'clipboard', execute: executeClipboardFallback },
  ],
}
