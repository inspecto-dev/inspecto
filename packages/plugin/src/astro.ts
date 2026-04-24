import type { UnpluginOptions } from '@inspecto-dev/types'
import { startServer } from './server/index.js'
import { vitePlugin } from './index.js'

type AstroCommand = 'dev' | 'build' | 'preview' | 'sync'

interface AstroConfigSetupContext {
  command: AstroCommand
  injectScript: (
    stage: 'page' | 'head-inline' | 'before-hydration' | 'page-ssr',
    content: string,
  ) => void
  updateConfig: (newConfig: Record<string, unknown>) => unknown
}

export function getAstroInjectedScript(serverPort: number): string {
  return `
import { mountInspector } from '@inspecto-dev/core';
window.__AI_INSPECTOR_SERVER_URL__ = 'http://127.0.0.1:${serverPort}';
mountInspector({
  serverUrl: window.__AI_INSPECTOR_SERVER_URL__,
});
`
}

export function astroIntegration(options?: UnpluginOptions) {
  return {
    name: 'inspecto-astro',
    hooks: {
      async 'astro:config:setup'({ command, injectScript, updateConfig }: AstroConfigSetupContext) {
        updateConfig({
          vite: {
            plugins: [vitePlugin(options)],
          },
        })

        if (command !== 'dev') {
          return
        }

        const serverPort = await startServer()
        injectScript('page', getAstroInjectedScript(serverPort))
      },
    },
  }
}

export default astroIntegration
