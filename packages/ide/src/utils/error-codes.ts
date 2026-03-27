import type { AiErrorCode } from '@inspecto/types'

export const ERROR_MESSAGES: Record<AiErrorCode, string> = {
  IDE_NOT_FOUND: 'VS Code could not be found. Make sure the `code` command is in your PATH.',
  EXTENSION_NOT_INSTALLED:
    'GitHub Copilot extension is not installed. Install it from the VS Code marketplace.',
  CLIPBOARD_WRITE_FAILED:
    'Could not write to clipboard. Please check your OS clipboard permissions.',
  SNIPPET_TOO_LARGE: 'The selected code snippet is too large for the AI context window.',
  FILE_NOT_FOUND: 'Source file not found. Is the development server running?',
  UNKNOWN: 'An unknown error occurred. Check the Inspecto output channel for details.',
}

export function toUserMessage(code: AiErrorCode, detail?: string): string {
  const base = ERROR_MESSAGES[code]
  return detail ? `${base}\n\nDetails: ${detail}` : base
}
