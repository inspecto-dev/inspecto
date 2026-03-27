import type { UnpluginOptions } from '@inspecto/types'
import { startServer, serverState } from '../../server/index.js'
import { resolveClientModule } from '../../injectors/utils.js'
import { getWebpackHtmlScript } from '../../injectors/webpack.js'
import path from 'node:path'

// Get current directory securely in both ESM and CJS via tsup shims
const _dirname = typeof __dirname !== 'undefined' ? __dirname : __dirname

const DEFAULT_OPTIONS: Required<UnpluginOptions> = {
  include: [],
  exclude: [],
  escapeTags: [],
  pathType: 'absolute',
  attributeName: 'data-inspecto',
}

let serverPort: number | null = null

const ensureServer = async () => {
  if (serverPort === null) {
    serverPort = await startServer()
  }
  return serverPort
}

export class InspectoRspackLegacyPlugin {
  options: Required<UnpluginOptions>

  constructor(options: UnpluginOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  apply(compiler: any) {
    if (process.env['NODE_ENV'] === 'production') return

    // Ensure server starts
    compiler.hooks.beforeCompile.tapPromise('inspecto-overlay', async () => {
      await ensureServer().catch(console.error)
    })

    // 1. Inject client module
    const clientPath = resolveClientModule()
    new compiler.webpack.EntryPlugin(compiler.context, clientPath, {}).apply(compiler)

    // 2. Inject HTML
    compiler.hooks.compilation.tap('inspecto-overlay', (compilation: any) => {
      // First try HtmlRspackPlugin (modern)
      const HtmlRspackPlugin = compiler.options.plugins.find(
        (p: any) => p && p.constructor && p.constructor.name === 'HtmlRspackPlugin',
      )

      if (HtmlRspackPlugin && HtmlRspackPlugin.constructor.getHooks) {
        const hooks = HtmlRspackPlugin.constructor.getHooks(compilation)
        hooks.alterAssetTagGroups.tapPromise('inspecto-overlay', async (data: any) => {
          const port = await ensureServer()

          data.headTags.unshift({
            tagName: 'script',
            voidTag: false,
            meta: { plugin: 'inspecto-overlay' },
            innerHTML: getWebpackHtmlScript(port),
          })
          return data
        })
      } else {
        // Fallback for Rspack 0.3.x with builtins.html
        compilation.hooks.processAssets.tapPromise(
          {
            name: 'inspecto-overlay',
            stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
          },
          async (assets: any) => {
            const port = await ensureServer()
            const scriptTag = `<script>${getWebpackHtmlScript(port)}</script>`

            for (const filename of Object.keys(assets)) {
              if (filename.endsWith('.html')) {
                const source = assets[filename].source()
                if (typeof source === 'string') {
                  const newSource = source.replace('</head>', `${scriptTag}</head>`)
                  assets[filename] = new compiler.webpack.sources.RawSource(newSource)
                } else if (Buffer.isBuffer(source)) {
                  const sourceStr = source.toString('utf-8')
                  const newSource = sourceStr.replace('</head>', `${scriptTag}</head>`)
                  assets[filename] = new compiler.webpack.sources.RawSource(newSource)
                }
              }
            }
          },
        )
      }
    })

    // 3. Inject AST Transform Loader
    const loaderPath = path.resolve(_dirname, './loader.cjs')
    compiler.options.module.rules.push({
      test: /\.[jt]sx?$/,
      use: [
        {
          loader: loaderPath,
          options: this.options,
        },
      ],
    })
  }
}

export const rspackPlugin = (options?: UnpluginOptions) => new InspectoRspackLegacyPlugin(options)
export default rspackPlugin
