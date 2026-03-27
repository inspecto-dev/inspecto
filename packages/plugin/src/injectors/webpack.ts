export function getWebpackHtmlScript(serverPort: number) {
  return `
window.__AI_INSPECTOR_PORT__ = ${serverPort};
window.addEventListener('load', () => {
  if (window.InspectoClient) {
    window.InspectoClient.mountInspector({
      serverUrl: 'http://127.0.0.1:' + window.__AI_INSPECTOR_PORT__,
    });
  }
});
`
}

export function getWebpackAssetScript(serverPort: number) {
  return `
if (typeof window !== 'undefined') {
  window.__AI_INSPECTOR_PORT__ = ${serverPort};
  const _initInspecto = () => {
    if (window.InspectoClient) {
      window.InspectoClient.mountInspector({
        serverUrl: 'http://127.0.0.1:' + window.__AI_INSPECTOR_PORT__,
      });
    } else {
      setTimeout(_initInspecto, 100);
    }
  };
  if (document.readyState === 'complete') {
    _initInspecto();
  } else {
    window.addEventListener('load', _initInspecto);
  }
}
`
}

export function injectWebpack(
  compiler: any,
  serverPortFn: () => Promise<number>,
  resolveClientModule: () => string,
) {
  const inspectoClientPath = resolveClientModule()

  // Inject the client logic directly using the absolute path
  new compiler.webpack.EntryPlugin(compiler.context, inspectoClientPath, { name: undefined }).apply(
    compiler,
  )

  compiler.hooks.compilation.tap('inspecto-overlay', (compilation: any) => {
    // Find HtmlWebpackPlugin (standard Webpack)
    const HtmlWebpackPlugin = compiler.options.plugins.find(
      (p: any) => p && p.constructor && p.constructor.name === 'HtmlWebpackPlugin',
    )
    if (HtmlWebpackPlugin) {
      const hooks = (HtmlWebpackPlugin.constructor as any).getHooks(compilation)
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
    } else {
      // Fallback for frameworks like Next.js that don't use HtmlWebpackPlugin
      compilation.hooks.processAssets.tapPromise(
        {
          name: 'inspecto-overlay',
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        async (assets: any) => {
          const port = await serverPortFn()

          // Only inject into the main client entry chunks (e.g. main-app or main.js)
          const mainAssetKey = Object.keys(assets).find(
            key => key.endsWith('.js') && (key.includes('main') || key.includes('app')),
          )
          if (!mainAssetKey) return

          const originalSource = assets[mainAssetKey].source()
          assets[mainAssetKey] = new compiler.webpack.sources.RawSource(
            getWebpackAssetScript(port) + '\n' + originalSource,
          )
        },
      )
    }
  })
}
