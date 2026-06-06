import { describe, expect, it } from 'vitest'
import {
  formatHotKeyLabel,
  getEffectiveHotKeys,
  shouldQuickJumpOnTrigger,
} from '../src/runtime/launcher-hotkeys.js'

describe('launcher hotkeys', () => {
  it('prefers explicit options over server defaults and falls back to alt', () => {
    expect(getEffectiveHotKeys({ options: { hotKeys: 'ctrl+shift' }, serverHotKeys: 'meta' })).toBe(
      'ctrl+shift',
    )
    expect(getEffectiveHotKeys({ options: {}, serverHotKeys: 'meta' })).toBe('meta')
    expect(getEffectiveHotKeys({ options: {}, serverHotKeys: null })).toBe('alt')
  })

  it('formats hotkey labels for Mac and non-Mac platforms', () => {
    expect(formatHotKeyLabel('ctrl+shift+alt', { platform: 'MacIntel' })).toBe('⌃ + ⇧ + ⌥')
    expect(formatHotKeyLabel('cmd+alt', { platform: 'Win32' })).toBe('Win + Alt')
    expect(formatHotKeyLabel(false, { platform: 'MacIntel' })).toBe('Disabled')
  })

  it('detects inspect quick jump triggers from matching click modifiers', () => {
    const event = new MouseEvent('click', { altKey: true })

    expect(
      shouldQuickJumpOnTrigger({
        mode: 'inspect',
        hotKeys: 'alt',
        event,
      }),
    ).toBe(true)
    expect(
      shouldQuickJumpOnTrigger({
        mode: 'annotate',
        hotKeys: 'alt',
        event,
      }),
    ).toBe(false)
    expect(
      shouldQuickJumpOnTrigger({
        mode: 'inspect',
        hotKeys: false,
        event,
      }),
    ).toBe(false)
  })
})
