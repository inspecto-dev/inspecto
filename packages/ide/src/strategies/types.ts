import type { ChannelDef, AiPayload, Provider } from '@inspecto-dev/types'

export interface IAiStrategy {
  readonly target: Provider
  readonly channels: ChannelDef[]
  /** Optional pre-processing (e.g. prompt formatting) */
  preparePayload?(payload: AiPayload): AiPayload
}
