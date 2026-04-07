import type { LogLevel } from '@inspecto-dev/types'

export interface Logger {
  info(msg: string, ...args: any[]): void
  warn(msg: string, ...args: any[]): void
  error(msg: string, ...args: any[]): void
  debug(msg: string, ...args: any[]): void
  setLevel?(level: LogLevel): void
}

const LOG_LEVELS: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
}

// Very simple implementation of a DEBUG matching string.
// Supports `DEBUG=inspecto:*` or `DEBUG=inspecto:server,inspecto:ast`
function isDebugEnabled(namespace: string): boolean {
  if (typeof process === 'undefined' || !process.env) return false
  const debugEnv = process.env.DEBUG
  if (!debugEnv) return false

  const namespaces = debugEnv.split(',').map(s => s.trim())
  for (const ns of namespaces) {
    if (ns === '*') return true
    if (ns.endsWith('*')) {
      const prefix = ns.slice(0, -1)
      if (namespace.startsWith(prefix)) return true
    } else if (ns === namespace) {
      return true
    }
  }
  return false
}

// Store global level locally to avoid circular dependency with config.ts
let globalLevel: LogLevel = 'warn'
const registeredLoggers: Set<Logger> = new Set()

export function setLoggerGlobalLevel(level: LogLevel) {
  globalLevel = level
  for (const logger of registeredLoggers) {
    if (logger.setLevel) {
      logger.setLevel(level)
    }
  }
}

export function createLogger(namespace: string, options?: { logLevel?: LogLevel }): Logger {
  let currentLevel = options?.logLevel ?? globalLevel
  let numericLevel = LOG_LEVELS[currentLevel] ?? 2
  const debugEnabled = isDebugEnabled(namespace)

  const logger: Logger = {
    setLevel(level: LogLevel) {
      currentLevel = level
      numericLevel = LOG_LEVELS[level] ?? 2
    },
    info(msg: string, ...args: any[]) {
      if (numericLevel >= LOG_LEVELS.info) {
        console.log(`\x1b[36m[inspecto]\x1b[0m ${msg}`, ...args)
      }
    },
    warn(msg: string, ...args: any[]) {
      if (numericLevel >= LOG_LEVELS.warn) {
        console.warn(`\x1b[33m[inspecto] WARN:\x1b[0m ${msg}`, ...args)
      }
    },
    error(msg: string, ...args: any[]) {
      if (numericLevel >= LOG_LEVELS.error) {
        console.error(`\x1b[31m[inspecto] ERROR:\x1b[0m ${msg}`, ...args)
      }
    },
    debug(msg: string, ...args: any[]) {
      if (debugEnabled) {
        console.log(`\x1b[90m[${namespace}]\x1b[0m ${msg}`, ...args)
      }
    },
  }

  registeredLoggers.add(logger)

  return logger
}
