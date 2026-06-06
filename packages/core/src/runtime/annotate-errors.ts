import type { AiErrorCode } from '@inspecto-dev/types'

export function toAnnotateErrorMessage(
  _ctx: unknown,
  errorCode?: AiErrorCode,
  fallback?: string,
): string {
  if (errorCode === 'FORBIDDEN_PATH') {
    return 'Some selected targets are outside the current project workspace.'
  }
  if (errorCode === 'INVALID_REQUEST') {
    return 'The current annotation batch is incomplete. Check your targets and try again.'
  }
  if (errorCode === 'SERVER_UNAVAILABLE') {
    return 'Inspecto could not reach the local dev server. Restart your dev server, then try again. If it still fails, run `inspecto doctor` or `npx @inspecto-dev/cli doctor` from the project root.'
  }
  return fallback ?? 'Request failed'
}
