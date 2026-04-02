import * as vscode from 'vscode'
import type { IAiStrategy } from './types'
import type { AiPayload } from '@inspecto-dev/types'
import { executeClipboardFallback } from '../channels/clipboard-fallback'
import { executeRobustPaste, withClipboardGuard, ensureClipboardSuccess } from '../utils/clipboard'
import { RecoverableChannelError } from '../fallback-chain'

const COMMANDS = {
  FOCUS: 'composer.focusComposer',
} as const

const FOCUS_SETTLE_MS = 500

async function executeCursorApi(payload: AiPayload): Promise<void> {
  const isCursor =
    vscode.env.uriScheme === 'cursor' || vscode.env.appName.toLowerCase().includes('cursor')

  if (!isCursor) {
    throw new RecoverableChannelError('Not running in Cursor IDE')
  }

  const result = await withClipboardGuard(payload.prompt, async () => {
    try {
      // Common Cursor chat focus command
      await vscode.commands.executeCommand(COMMANDS.FOCUS)
      await new Promise(resolve => setTimeout(resolve, FOCUS_SETTLE_MS))
      await executeRobustPaste(payload.prompt)
    } catch (e) {
      // Fallback
      await vscode.commands.executeCommand('workbench.action.chat.open')
      await new Promise(resolve => setTimeout(resolve, FOCUS_SETTLE_MS))
      await executeRobustPaste(payload.prompt)
    }
  })

  ensureClipboardSuccess(result)
}

export const cursorStrategy: IAiStrategy = {
  target: 'cursor',
  channels: [
    { type: 'builtin', execute: executeCursorApi },
    { type: 'clipboard', execute: executeClipboardFallback },
  ],
}
