import type { HotKeys } from '@inspecto-dev/types'
import { hotKeysHeld } from '../shared/component-utils.js'

export type HotKeySource = {
  options: { hotKeys?: HotKeys }
  serverHotKeys: HotKeys | null
}

export type HotKeyLabelEnvironment = {
  platform?: string
}

export function getEffectiveHotKeys(source: HotKeySource): HotKeys {
  if (source.options.hotKeys !== undefined) return source.options.hotKeys
  if (source.serverHotKeys !== null) return source.serverHotKeys
  return 'alt'
}

export function formatHotKeyLabel(
  hotKeys: HotKeys,
  environment: HotKeyLabelEnvironment = {},
): string {
  if (hotKeys === false) return 'Disabled'

  const platform =
    environment.platform ?? (typeof navigator !== 'undefined' ? navigator.platform : '')
  const isMac = /Mac|iPod|iPhone|iPad/.test(platform)
  const keys = hotKeys.split('+').map(key => key.trim().toLowerCase())
  const displayKeys = keys.map(key => {
    if (key === 'alt' || key === 'option') return isMac ? '⌥' : 'Alt'
    if (key === 'cmd' || key === 'meta' || key === 'win' || key === 'command') {
      return isMac ? '⌘' : 'Win'
    }
    if (key === 'ctrl' || key === 'control') return isMac ? '⌃' : 'Ctrl'
    if (key === 'shift') return isMac ? '⇧' : 'Shift'
    return key.charAt(0).toUpperCase() + key.slice(1)
  })

  return displayKeys.join(' + ')
}

export function shouldQuickJumpOnTrigger(input: {
  mode: 'inspect' | 'annotate'
  hotKeys: HotKeys
  event: MouseEvent
}): boolean {
  if (input.mode !== 'inspect') return false
  if (input.event.type !== 'click') return false
  if (input.hotKeys === false) return false
  return hotKeysHeld(input.event, input.hotKeys)
}
