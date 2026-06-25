import type { HotKeys } from '@inspecto-dev/types'
import { hotKeysHeld } from '../shared/component-utils.js'

export type ModeActiveInput = {
  disabled: boolean
  mode: 'inspect' | 'annotate'
  active: boolean
  hotKeys: HotKeys
  event: MouseEvent
}

export function isInspectorActiveForMode(input: ModeActiveInput): boolean {
  if (input.disabled) return false
  if (input.mode === 'annotate') return true
  if (input.active) return true
  if (input.hotKeys === false) return false
  return hotKeysHeld(input.event, input.hotKeys)
}
