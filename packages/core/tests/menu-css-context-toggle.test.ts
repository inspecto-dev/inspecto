import { describe, expect, it, vi } from 'vitest'
import {
  createInspectMenuCssContextToggle,
  resolveInspectMenuCssContextPrompt,
} from '../src/features/inspect/menu/css-context-toggle.js'

describe('inspect menu CSS context toggle', () => {
  it('syncs button state and toggles CSS context on click', () => {
    const button = document.createElement('button')
    const toggle = createInspectMenuCssContextToggle(button)

    expect(toggle.isEnabled()).toBe(false)
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.dataset.visualState).toBe('inactive')
    expect(button.title).toBe('Attach CSS context')

    button.click()

    expect(toggle.isEnabled()).toBe(true)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.dataset.visualState).toBe('active')
    expect(button.title).toBe('CSS context enabled')
  })

  it('resolves CSS context only when explicitly enabled or required by a fix-ui intent', () => {
    const captureCssContextPrompt = vi.fn(() => 'Relevant CSS context')

    expect(
      resolveInspectMenuCssContextPrompt({
        cssContextEnabled: false,
        captureCssContextPrompt,
      }),
    ).toBeNull()
    expect(captureCssContextPrompt).not.toHaveBeenCalled()

    expect(
      resolveInspectMenuCssContextPrompt({
        cssContextEnabled: false,
        captureCssContextPrompt,
        intent: { id: 'fix-ui', aiIntent: 'fix-ui' },
      }),
    ).toBe('Relevant CSS context')

    expect(
      resolveInspectMenuCssContextPrompt({
        cssContextEnabled: true,
        captureCssContextPrompt,
      }),
    ).toBe('Relevant CSS context')
    expect(captureCssContextPrompt).toHaveBeenCalledTimes(2)
  })

  it('returns null when CSS context capture is unavailable or throws', () => {
    expect(resolveInspectMenuCssContextPrompt({ cssContextEnabled: true })).toBeNull()
    expect(
      resolveInspectMenuCssContextPrompt({
        cssContextEnabled: true,
        captureCssContextPrompt: () => {
          throw new Error('capture failed')
        },
      }),
    ).toBeNull()
  })
})
