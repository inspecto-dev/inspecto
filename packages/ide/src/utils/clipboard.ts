import * as vscode from 'vscode'
import type { AiStrategyResult } from '@inspecto/types'

export async function withClipboardGuard(
  text: string,
  action: string | (() => Promise<void> | void),
  args?: unknown[],
): Promise<AiStrategyResult> {
  try {
    await vscode.env.clipboard.writeText(text)

    if (typeof action === 'string') {
      await vscode.commands.executeCommand(action, ...(args ?? []))
    } else {
      await action()
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: String(err),
      errorCode: 'CLIPBOARD_WRITE_FAILED',
    }
  }
}

/**
 * A robust fallback mechanism for pasting content into the active view.
 * It tries terminal paste, then editor paste, and finally falls back to typing.
 */
export async function executeRobustPaste(text: string): Promise<void> {
  const COMMANDS = {
    PASTE_TERMINAL: 'workbench.action.terminal.paste',
    PASTE_EDITOR: 'editor.action.clipboardPasteAction',
    TYPE: 'type',
  } as const

  try {
    await vscode.commands.executeCommand(COMMANDS.PASTE_EDITOR)
  } catch {
    try {
      await vscode.commands.executeCommand(COMMANDS.PASTE_TERMINAL)
    } catch {
      await vscode.commands.executeCommand(COMMANDS.TYPE, { text })
    }
  }
}
