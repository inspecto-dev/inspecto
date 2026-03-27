import * as vscode from 'vscode'
import type { AiPayload } from '@inspecto/types'

export async function executeClipboardFallback(payload: AiPayload): Promise<void> {
  await vscode.env.clipboard.writeText(payload.prompt)
  vscode.window.showInformationMessage(
    `inspecto: Prompt copied to clipboard — press ⌘V (or Ctrl+V) to paste into your AI assistant.`,
  )
}
