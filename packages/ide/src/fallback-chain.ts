import type { ChannelDef, AiPayload, ProviderMode } from '@inspecto-dev/types'
import { logInspecto } from './output-channel'

export class AllChannelsFailedError extends Error {
  constructor(public readonly attempts: { type: string; error: unknown }[]) {
    super(`All ${attempts.length} channels failed`)
    this.name = 'AllChannelsFailedError'
  }
}

export class RecoverableChannelError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RecoverableChannelError'
  }
}

export function filterChannels(channels: ChannelDef[], forcedMode?: ProviderMode): ChannelDef[] {
  if (!forcedMode || forcedMode === 'clipboard') return channels
  // Force mode: only keep the specified type + clipboard fallback
  return channels.filter(c => c.type === forcedMode || c.type === 'clipboard')
}

/**
 * Execute channels in order. Fallback only on RecoverableChannelError.
 * Stop and throw immediately on other errors.
 */
export async function executeWithFallback(
  channels: ChannelDef[],
  payload: AiPayload,
): Promise<void> {
  const attempts: { type: string; error: unknown }[] = []
  logInspecto(
    'dispatch',
    `Executing channels for target=${payload.target}, targetType=${payload.targetType}, channels=${channels.map(ch => ch.type).join(', ')}`,
  )

  for (const ch of channels) {
    try {
      logInspecto('dispatch', `Trying channel: ${ch.type}`)
      await ch.execute(payload)
      logInspecto('dispatch', `Dispatched via ${ch.type}`)
      return
    } catch (err) {
      logInspecto('dispatch', `Channel failed: ${ch.type} -> ${String(err)}`)
      attempts.push({ type: ch.type, error: err })

      if (!(err instanceof RecoverableChannelError)) {
        throw err
      }
    }
  }

  throw new AllChannelsFailedError(attempts)
}
