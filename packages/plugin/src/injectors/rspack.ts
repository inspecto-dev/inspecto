import { getWebpackHtmlScript } from './webpack.js'

export function injectRspack(
  compiler: any,
  serverPortFn: () => Promise<number>,
  resolveClientModule: () => string,
) {
  const inspectoClientPath = resolveClientModule()

  // Use the exact same entry injection strategy as Webpack
  new compiler.webpack.EntryPlugin(compiler.context, inspectoClientPath, {}).apply(compiler)

  compiler.hooks.compilation.tap('inspecto-overlay', (compilation: any) => {
    const HtmlRspackPlugin = compiler.options.plugins.find(
      (p: any) => p && p.constructor && p.constructor.name === 'HtmlRspackPlugin',
    )
    if (HtmlRspackPlugin) {
      const hooks = (HtmlRspackPlugin.constructor as any).getHooks(compilation)
      hooks.alterAssetTagGroups.tapPromise('inspecto-overlay', async (data: any) => {
        const port = await serverPortFn()

        data.headTags.unshift({
          tagName: 'script',
          voidTag: false,
          meta: { plugin: 'inspecto-overlay' },
          innerHTML: getWebpackHtmlScript(port),
        })
        return data
      })
    }
  })
}
