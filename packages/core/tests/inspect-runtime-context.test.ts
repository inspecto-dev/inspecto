import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountInspector, unmountInspector } from '../src/index.js'

function configResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({
      ide: 'vscode',
      prompts: [],
      runtimeContext: { enabled: true },
      ...overrides,
    }),
  }
}

describe('inspect runtime-context lifecycle', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    unmountInspector()
    document.body.innerHTML = ''
  })

  it('keeps runtime capture attached while inspect is paused or idle so later prompts can still use recent errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(configResponse()))

    await mountInspector({ defaultActive: true, runtimeContext: { enabled: true } })
    await new Promise(resolve => setTimeout(resolve, 0))

    const host = document.querySelector('inspecto-overlay') as HTMLElement & {
      runtimeContextCollector: { snapshot: () => { records: Array<unknown> } }
      setPaused: (value: boolean) => void
      setActive: (value: boolean) => void
    }

    window.dispatchEvent(new ErrorEvent('error', { message: 'active boom' }))
    expect(host.runtimeContextCollector.snapshot().records).toHaveLength(1)

    host.setPaused(true)
    expect(host.runtimeContextCollector.snapshot().records).toHaveLength(1)
    window.dispatchEvent(new ErrorEvent('error', { message: 'paused boom' }))
    expect(host.runtimeContextCollector.snapshot().records).toHaveLength(2)

    host.setPaused(false)
    expect(host.runtimeContextCollector.snapshot().records).toHaveLength(2)
    window.dispatchEvent(new ErrorEvent('error', { message: 'resumed boom' }))
    expect(host.runtimeContextCollector.snapshot().records).toHaveLength(3)

    host.setActive(false)
    expect(host.runtimeContextCollector.snapshot().records).toHaveLength(3)
    window.dispatchEvent(new ErrorEvent('error', { message: 'inactive boom' }))
    expect(host.runtimeContextCollector.snapshot().records).toHaveLength(4)
  })

  it('captures runtime errors even before inspect is manually activated', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(configResponse()))

    await mountInspector({ defaultActive: false, runtimeContext: { enabled: true } })
    await new Promise(resolve => setTimeout(resolve, 0))

    const host = document.querySelector('inspecto-overlay') as HTMLElement & {
      runtimeContextCollector: { snapshot: () => { records: Array<unknown> } }
    }

    window.dispatchEvent(new ErrorEvent('error', { message: 'idle boom' }))
    expect(host.runtimeContextCollector.snapshot().records).toHaveLength(1)
  })
})
