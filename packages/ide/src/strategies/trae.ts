import * as vscode from 'vscode'
import type { IAiStrategy } from './types'
import type { AiPayload } from '@inspecto-dev/types'
import { executeClipboardFallback } from '../channels/clipboard-fallback'
import { executeRobustPaste, withClipboardGuard, ensureClipboardSuccess } from '../utils/clipboard'
import { RecoverableChannelError } from '../fallback-chain'

const COMMANDS = {
  FOCUS: 'workbench.action.chat.icube.open',
} as const

// Delay after focusing sidebar before pasting
const FOCUS_SETTLE_MS = 500

async function executeTraeApi(payload: AiPayload): Promise<void> {
  const isTrae =
    vscode.env.uriScheme === 'trae-cn' ||
    vscode.env.uriScheme === 'trae' ||
    vscode.env.appName.toLowerCase().includes('trae')
  if (!isTrae) {
    throw new RecoverableChannelError('Not running in Trae IDE')
  }

  const result = await withClipboardGuard(payload.prompt, async () => {
    try {
      await vscode.commands.executeCommand(COMMANDS.FOCUS)
      await new Promise(resolve => setTimeout(resolve, FOCUS_SETTLE_MS))
      await executeRobustPaste(payload.prompt)
    } catch (e) {
      // Fallback command if the primary one fails
      await vscode.commands.executeCommand('workbench.action.chat.open')
      await new Promise(resolve => setTimeout(resolve, FOCUS_SETTLE_MS))
      await executeRobustPaste(payload.prompt)
    }
  })

  ensureClipboardSuccess(result)
}

export const traeStrategy: IAiStrategy = {
  target: 'trae',
  channels: [
    { type: 'builtin', execute: executeTraeApi },
    { type: 'clipboard', execute: executeClipboardFallback },
  ],
}
