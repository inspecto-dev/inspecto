import { getWebpackHtmlScript } from '../../injectors/webpack'
import { resolveClientModule } from '../../injectors/utils'
import { startServer } from '../../server'
import path from 'node:path'

export class InspectoWebpack4Plugin {
  private options: any

  constructor(options: any = {}) {
    this.options = options
  }

  apply(compiler: any) {
    const clientPath = resolveClientModule()

    // 1. Inject the loader dynamically so we don't have to require users to configure loaders manually
    compiler.hooks.afterEnvironment.tap('InspectoWebpack4Plugin', () => {
      const inspectoLoader = path.resolve(__dirname, 'loader.cjs')
      compiler.options.module.rules.push({
        test: /\.[jt]sx?$/,
        enforce: 'pre',
        exclude: /node_modules/,
        use: [
          {
            loader: inspectoLoader,
            options: {
              ...this.options,
              clientPath,
            },
          },
        ],
      })
    })

    // 2. Inject initialization script into HTML
    compiler.hooks.compilation.tap('InspectoWebpack4Plugin', (compilation: any) => {
      // Find HtmlWebpackPlugin from compiler plugins to ensure we get the same instance
      const htmlPlugin = compiler.options.plugins.find(
        (p: any) => p && p.constructor && p.constructor.name === 'HtmlWebpackPlugin',
      )

      const HtmlWebpackPlugin = htmlPlugin ? htmlPlugin.constructor : null

      if (HtmlWebpackPlugin && HtmlWebpackPlugin.getHooks) {
        HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups.tapAsync(
          'InspectoWebpack4Plugin',
          async (data: any, cb: any) => {
            const port = await startServer()
            data.headTags.unshift({
              tagName: 'script',
              voidTag: false,
              attributes: { 'data-plugin': 'inspecto-overlay' },
              innerHTML: getWebpackHtmlScript(port),
            })
            cb(null, data)
          },
        )
      } else if (compilation.hooks.htmlWebpackPluginAlterAssetTags) {
        // Fallback for html-webpack-plugin v3
        compilation.hooks.htmlWebpackPluginAlterAssetTags.tapAsync(
          'InspectoWebpack4Plugin',
          async (data: any, cb: any) => {
            const port = await startServer()
            data.head.unshift({
              tagName: 'script',
              voidTag: false,
              attributes: { 'data-plugin': 'inspecto-overlay' },
              innerHTML: getWebpackHtmlScript(port),
            })
            cb(null, data)
          },
        )
      }
    })
  }
}

export const webpack4Plugin = (options?: any) => new InspectoWebpack4Plugin(options)
