import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { launchIDE } from 'launch-ide'
import { createLogger } from '../utils/logger.js'
import { getGlobalLogLevel } from '../config.js'

const serverLogger = createLogger('inspecto:server', { logLevel: getGlobalLogLevel() })

const payloadTickets = new Map<string, string>()

export function createTicket(payload: unknown): string {
  const ticketId = crypto.randomUUID()
  payloadTickets.set(ticketId, JSON.stringify(payload))

  setTimeout(
    () => {
      payloadTickets.delete(ticketId)
    },
    5 * 60 * 1000,
  )

  return ticketId
}

export function readTicket(ticketId: string): string | undefined {
  return payloadTickets.get(ticketId)
}

export function launchURI(uri: string): void {
  try {
    if (process.platform === 'darwin') {
      execFileSync('open', [uri])
    } else if (process.platform === 'win32') {
      execFileSync('cmd', ['/c', 'start', '""', uri])
    } else {
      execFileSync('xdg-open', [uri])
    }
  } catch (e) {
    serverLogger.error('Failed to launch URI via execFileSync, falling back to launchIDE:', e)
    launchIDE({ file: uri })
  }
}
