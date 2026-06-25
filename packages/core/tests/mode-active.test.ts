import { describe, expect, it } from 'vitest'
import { isInspectorActiveForMode } from '../src/runtime/mode-active.js'

describe('mode active state', () => {
  it('does not activate when runtime is disabled', () => {
    expect(
      isInspectorActiveForMode({
        disabled: true,
        mode: 'inspect',
        active: true,
        hotKeys: 'alt',
        event: new MouseEvent('mousemove', { altKey: true }),
      }),
    ).toBe(false)
  })

  it('keeps annotate mode active regardless of inspect activation', () => {
    expect(
      isInspectorActiveForMode({
        disabled: false,
        mode: 'annotate',
        active: false,
        hotKeys: false,
        event: new MouseEvent('mousemove'),
      }),
    ).toBe(true)
  })

  it('keeps inspect mode active when explicitly active', () => {
    expect(
      isInspectorActiveForMode({
        disabled: false,
        mode: 'inspect',
        active: true,
        hotKeys: false,
        event: new MouseEvent('mousemove'),
      }),
    ).toBe(true)
  })

  it('uses hotkeys for inactive inspect mode', () => {
    expect(
      isInspectorActiveForMode({
        disabled: false,
        mode: 'inspect',
        active: false,
        hotKeys: 'alt',
        event: new MouseEvent('mousemove', { altKey: true }),
      }),
    ).toBe(true)
    expect(
      isInspectorActiveForMode({
        disabled: false,
        mode: 'inspect',
        active: false,
        hotKeys: false,
        event: new MouseEvent('mousemove', { altKey: true }),
      }),
    ).toBe(false)
  })
})
