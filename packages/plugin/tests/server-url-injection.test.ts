import { describe, expect, it } from 'vitest'
import { getViteVirtualModuleScript } from '../src/injectors/vite.js'
import { getWebpackAssetScript, getWebpackHtmlScript } from '../src/injectors/webpack.js'
import { getAstroInjectedScript } from '../src/astro.js'

describe('server URL injection', () => {
  it('uses the provided public server URL for vite runtime injection', () => {
    const script = getViteVirtualModuleScript(6789, 'http://127.0.0.1:6789')

    expect(script).toContain("window.__AI_INSPECTOR_SERVER_URL__ = 'http://127.0.0.1:6789';")
    expect(script).not.toContain('http://0.0.0.0:')
  })

  it('uses the provided public server URL for astro runtime injection', () => {
    const script = getAstroInjectedScript(6789, 'http://inspecto.devbox.test:6789')

    expect(script).toContain(
      "window.__AI_INSPECTOR_SERVER_URL__ = 'http://inspecto.devbox.test:6789';",
    )
    expect(script).not.toContain('http://0.0.0.0:')
  })

  it('uses the provided public server URL for webpack runtime injection', () => {
    const htmlScript = getWebpackHtmlScript(6789, 'http://localhost:6789')
    const assetScript = getWebpackAssetScript(6789, 'http://localhost:6789')

    expect(htmlScript).toContain("window.__AI_INSPECTOR_SERVER_URL__ = 'http://localhost:6789';")
    expect(assetScript).toContain("window.__AI_INSPECTOR_SERVER_URL__ = 'http://localhost:6789';")
    expect(htmlScript).not.toContain('http://0.0.0.0:')
    expect(assetScript).not.toContain('http://0.0.0.0:')
  })
})
