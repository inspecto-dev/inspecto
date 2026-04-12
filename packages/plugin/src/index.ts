import { createUnplugin } from 'unplugin'
import type { UnpluginOptions } from '@inspecto-dev/types'
import { extractTransformFilePath, shouldTransform } from './transform/utils.js'
import { transformRouter, transformJsx } from './transform/index.js'
import { startServer, serverState } from './server/index.js'
import { resolveClientModule } from './injectors/utils.js'
import { injectWebpack } from './injectors/webpack.js'
import { injectRspack } from './injectors/rspack.js'
import { setGlobalLogLevel } from './config.js'
import { createLogger } from './utils/logger.js'
import {
  getViteVirtualModuleScript,
  VITE_VIRTUAL_MODULE_ID,
  VITE_VIRTUAL_IMPORT_ID,
} from './injectors/vite.js'

import type { ViteDevServer } from 'vite'

export type { UnpluginOptions }

const DEFAULT_OPTIONS: Required<UnpluginOptions> = {
  include: [],
  exclude: [],
  escapeTags: [],
  pathType: 'absolute',
  attributeName: 'data-inspecto',
  logLevel: 'warn',
}

const DEFAULT_PORT = 5678

const InspectoPlugin = createUnplugin<UnpluginOptions | undefined>((userOptions = {}) => {
  const options: Required<UnpluginOptions> = {
    ...DEFAULT_OPTIONS,
    ...userOptions,
  }

  // Sync global log level based on user config
  setGlobalLogLevel(options.logLevel)
  const pluginLogger = createLogger('inspecto:plugin', { logLevel: options.logLevel })

  // Skip everything in production
  const isProduction = process.env['NODE_ENV'] === 'production'

  let projectRoot = process.cwd()
  let serverPort: number | null = null

  // Helper to ensure server is started
  const ensureServer = async () => {
    if (serverPort === null) {
      serverPort = await startServer()
    }
    return serverPort
  }

  return {
    name: 'inspecto-overlay',
    enforce: 'pre',

    buildStart() {
      if (isProduction) return
      projectRoot = serverState.cwd || process.cwd()

      // For pure bundlers (Rollup, Esbuild) that don't have devServer hooks
      // we need to ensure the server starts early enough.
      ensureServer().catch(err => pluginLogger.error('Failed to start server:', err))
    },

    buildEnd() {
      // Server cleanup is handled by process exit (server is unref'd, port file
      // removed via process.once('exit')). Calling stopServer() here would break
      // esbuild watch mode (which fires buildEnd after every incremental rebuild)
      // and is unnecessary for Vite/Rspack which manage their own lifecycles.
    },

    webpack: compiler => {
      if (isProduction) return
      injectWebpack(compiler, ensureServer, resolveClientModule)
    },

    rspack: compiler => {
      if (isProduction) return
      injectRspack(compiler, ensureServer, resolveClientModule)
    },

    vite: {
      config(config) {
        if (isProduction) return config
        return {
          ...config,
          define: {
            ...config.define,
            __AI_INSPECTOR_PORT__: JSON.stringify(DEFAULT_PORT), // Placeholder, rewritten in configureServer
          },
        }
      },

      resolveId(id) {
        if (id === 'virtual:inspecto-client') {
          return VITE_VIRTUAL_MODULE_ID
        }
        return null
      },

      load(id) {
        if (id === VITE_VIRTUAL_MODULE_ID) {
          // serverPort is guaranteed to be set by the time Vite requests this module
          // (configureServer awaits ensureServer before the dev server accepts requests)
          return getViteVirtualModuleScript(serverPort ?? DEFAULT_PORT)
        }
        return null
      },

      async configureServer(server: ViteDevServer) {
        if (isProduction) return
        const port = await ensureServer()
        if (!server.config.define) {
          ;(server.config as any).define = {}
        }
        ;(server.config as any).define['__AI_INSPECTOR_PORT__'] = JSON.stringify(port)
        // Invalidate the virtual module so load() re-runs with the correct port
        // (guards against the race where load() was called before configureServer resolved)
        const mod = server.moduleGraph.getModuleById(VITE_VIRTUAL_MODULE_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
      },

      transformIndexHtml(html) {
        if (isProduction || !serverPort) return html
        return {
          html,
          tags: [
            {
              tag: 'script',
              attrs: { type: 'module' },
              children: `import '${VITE_VIRTUAL_IMPORT_ID}';`,
            },
          ],
        }
      },
    },

    transformInclude(id) {
      if (isProduction || !id) return false
      return shouldTransform(id, options)
    },

    transform(code, id) {
      if (isProduction || !id) return null

      const { filePath } = extractTransformFilePath(id)

      const result = transformRouter({
        filePath,
        source: code,
        projectRoot,
        pluginOptions: options,
      })

      if (!result || !result.changed) return null

      return {
        code: result.code,
        map: result.map,
      }
    },
  }
})

export const unplugin = InspectoPlugin
export const vitePlugin = InspectoPlugin.vite
export const webpackPlugin: (options?: UnpluginOptions) => any = InspectoPlugin.webpack
export const rspackPlugin = InspectoPlugin.rspack
export const rollupPlugin = InspectoPlugin.rollup
export const esbuildPlugin = InspectoPlugin.esbuild
export { transformJsx }
export default InspectoPlugin
