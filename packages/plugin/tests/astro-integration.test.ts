import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/server/index.js', () => ({
  startServer: vi.fn(async () => 6789),
}))

import { astroIntegration, getAstroInjectedScript } from '../src/astro.js'

describe('astroIntegration', () => {
  it('injects the Inspecto runtime script during astro config setup', async () => {
    const injectScript = vi.fn()
    const updateConfig = vi.fn()
    const integration = astroIntegration()

    await integration.hooks['astro:config:setup']?.({
      command: 'dev',
      config: {} as never,
      isRestart: false,
      injectScript,
      updateConfig,
      addRenderer: vi.fn(),
      addWatchFile: vi.fn(),
      addClientDirective: vi.fn(),
      addMiddleware: vi.fn(),
      addDevToolbarApp: vi.fn(),
      injectRoute: vi.fn(),
      logger: {} as never,
    })

    expect(injectScript).toHaveBeenCalledTimes(1)
    expect(injectScript).toHaveBeenCalledWith(
      'page',
      expect.stringContaining("import { mountInspector } from '@inspecto-dev/core';"),
    )
    expect(updateConfig).toHaveBeenCalledWith({
      vite: {
        plugins: [expect.any(Object)],
      },
    })
  })

  it('builds a runtime script with the negotiated server URL', () => {
    const script = getAstroInjectedScript(6789)

    expect(script).toContain("window.__AI_INSPECTOR_SERVER_URL__ = 'http://127.0.0.1:6789';")
    expect(script).toContain('mountInspector({')
  })
})
