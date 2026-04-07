import { log } from './logger.js'

interface ReportCommandErrorOptions {
  debug?: boolean
  json?: boolean
}

export function writeCommandOutput<T>(result: T, json: boolean, renderText: (value: T) => void): T {
  if (json) {
    console.log(JSON.stringify(result, null, 2))
    return result
  }

  renderText(result)
  return result
}

export function reportCommandError(error: unknown, options: ReportCommandErrorOptions = {}): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  if (options.json) {
    const payload = {
      status: 'error' as const,
      error: {
        message,
        ...(options.debug && stack ? { stack } : {}),
      },
    }

    console.error(JSON.stringify(payload, null, 2))
    return
  }

  log.error(message)

  if (options.debug && stack) {
    console.error(stack)
  }
}
