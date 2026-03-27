import type { ChannelDef, AiPayload, AiTarget } from '@inspecto/types'

export interface IAiStrategy {
  readonly target: AiTarget
  readonly channels: ChannelDef[]
  /** Optional pre-processing (e.g. prompt formatting) */
  preparePayload?(payload: AiPayload): AiPayload
}
