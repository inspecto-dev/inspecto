import type { UnpluginOptions } from '@inspecto-dev/types'
import { startServer, serverState } from './server/index.js'
import { resolvePublicServerUrl } from './server/server-url.js'
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

export function getAstroInjectedScript(serverPort: number, publicServerUrl?: string): string {
  return `
import { mountInspector } from '@inspecto-dev/core';
window.__AI_INSPECTOR_SERVER_URL__ = '${publicServerUrl ?? `http://127.0.0.1:${serverPort}`}';
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
        injectScript(
          'page',
          getAstroInjectedScript(
            serverPort,
            resolvePublicServerUrl({
              cwd: serverState.cwd || process.cwd(),
              configRoot: serverState.configRoot || process.cwd(),
              port: serverPort,
            }),
          ),
        )
      },
    },
  }
}

export default astroIntegration
