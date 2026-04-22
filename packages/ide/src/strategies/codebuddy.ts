import * as vscode from 'vscode'
import type { IAiStrategy } from './types'
import type { AiPayload } from '@inspecto-dev/types'
import { executeClipboardFallback } from '../channels/clipboard-fallback'
import { RecoverableChannelError } from '../fallback-chain'
import { logInspecto } from '../output-channel'
import { executeRobustPaste, withClipboardGuard, ensureClipboardSuccess } from '../utils/clipboard'

const COMMANDS = {
  NEW_CHAT: 'tencentcloud.codingcopilot.chat.startNewChat',
  SEND_TO_CHAT: 'tencentcloud.codingcopilot.sendToChat',
  CHAT_SEND_MESSAGE: 'tencentcloud.codingcopilot.chat.sendMessage',
  FOCUS_CHAT: 'coding-copilot.webviews.chat.focus',
} as const

// Delay after opening a new chat so CodeBuddy can mount its chat view.
const FOCUS_SETTLE_MS = 500

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function executeLoggedCommand(command: string, ...args: unknown[]): Promise<void> {
  logInspecto('codebuddy', `Trying command: ${command}`)
  try {
    await vscode.commands.executeCommand(command, ...args)
    logInspecto('codebuddy', `Command succeeded: ${command}`)
  } catch (error) {
    logInspecto('codebuddy', `Command failed: ${command} -> ${String(error)}`)
    throw error
  }
}

async function sendPromptToCodeBuddy(prompt: string): Promise<void> {
  try {
    await executeLoggedCommand(COMMANDS.SEND_TO_CHAT, { prompt, mode: 'craft' })
    return
  } catch {
    // Fall back to the older chat send API.
  }

  await executeLoggedCommand(COMMANDS.CHAT_SEND_MESSAGE, {
    message: prompt,
    options: { mode: 'craft' },
  })
}

async function prefillPromptInCodeBuddy(prompt: string): Promise<void> {
  logInspecto('codebuddy', 'Prefilling prompt via focus + clipboard paste')
  const result = await withClipboardGuard(prompt, async () => {
    await executeLoggedCommand(COMMANDS.FOCUS_CHAT)
    await sleep(FOCUS_SETTLE_MS)
    await executeRobustPaste(prompt)
  })
  try {
    ensureClipboardSuccess(result)
    logInspecto('codebuddy', 'Clipboard prefill succeeded')
  } catch (error) {
    logInspecto('codebuddy', `Clipboard prefill failed -> ${String(error)}`)
    throw error
  }
}

async function executeCodeBuddyApi(payload: AiPayload): Promise<void> {
  const isCodeBuddy =
    vscode.env.uriScheme === 'codebuddycn' || vscode.env.appName.toLowerCase().includes('codebuddy')
  if (!isCodeBuddy) {
    throw new RecoverableChannelError('Not running in CodeBuddy IDE')
  }

  try {
    logInspecto('codebuddy', 'Opening native chat')
    await vscode.commands.executeCommand(COMMANDS.NEW_CHAT)
    await sleep(FOCUS_SETTLE_MS)
    if (payload.autoSend ?? false) {
      await sendPromptToCodeBuddy(payload.prompt)
    } else {
      await prefillPromptInCodeBuddy(payload.prompt)
    }
  } catch (error) {
    logInspecto('codebuddy', `Native chat dispatch failed: ${String(error)}`)
    if (error instanceof RecoverableChannelError) {
      throw error
    }
    throw new RecoverableChannelError(
      `Failed to send prompt through CodeBuddy chat: ${String(error)}`,
    )
  }
}

export const codebuddyStrategy: IAiStrategy = {
  target: 'codebuddy',
  channels: [
    { type: 'builtin', execute: executeCodeBuddyApi },
    { type: 'clipboard', execute: executeClipboardFallback },
  ],
}
