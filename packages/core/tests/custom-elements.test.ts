import { describe, expect, it, vi } from 'vitest'

describe('custom element registration', () => {
  it('does not throw when the overlay module is evaluated more than once', async () => {
    vi.resetModules()
    await import('../src/runtime/inspecto-element.js')

    vi.resetModules()

    await expect(import('../src/runtime/inspecto-element.js')).resolves.toBeDefined()
    expect(customElements.get('inspecto-overlay')).toBeDefined()
  })
})
