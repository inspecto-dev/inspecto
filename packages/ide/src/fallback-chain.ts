import type { ChannelDef, AiPayload, ToolMode } from '@inspecto/types'

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

export function filterChannels(channels: ChannelDef[], forcedMode?: ToolMode): ChannelDef[] {
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

  for (const ch of channels) {
    try {
      await ch.execute(payload)
      console.log(`[inspecto] Dispatched via ${ch.type}`)
      return
    } catch (err) {
      console.warn(`[inspecto] Channel ${ch.type} failed: ${err}`)
      attempts.push({ type: ch.type, error: err })

      if (!(err instanceof RecoverableChannelError)) {
        throw err
      }
    }
  }

  throw new AllChannelsFailedError(attempts)
}
