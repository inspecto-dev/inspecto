export function getWebpackHtmlScript(serverPort: number, publicServerUrl?: string) {
  return `
window.__AI_INSPECTOR_PORT__ = ${serverPort};
window.__AI_INSPECTOR_SERVER_URL__ = '${publicServerUrl ?? `http://127.0.0.1:${serverPort}`}';
  window.addEventListener('load', () => {
    if (window.InspectoClient) {
      window.InspectoClient.mountInspector({
        serverUrl: window.__AI_INSPECTOR_SERVER_URL__,
      });
    }
  });
`
}

export function getWebpackAssetScript(serverPort: number, publicServerUrl?: string) {
  return `
if (typeof window !== 'undefined') {
  window.__AI_INSPECTOR_PORT__ = ${serverPort};
  window.__AI_INSPECTOR_SERVER_URL__ = '${publicServerUrl ?? `http://127.0.0.1:${serverPort}`}';
  const _initInspecto = () => {
    if (window.InspectoClient) {
      window.InspectoClient.mountInspector({
        serverUrl: window.__AI_INSPECTOR_SERVER_URL__,
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
  publicServerUrlFn: (port: number) => string,
  resolveClientModule: () => string,
) {
  const inspectoClientPath = resolveClientModule()

  // Inject the client logic directly using the absolute path
  if (compiler.webpack && compiler.webpack.EntryPlugin) {
    // Webpack 5+
    new compiler.webpack.EntryPlugin(compiler.context, inspectoClientPath, {
      name: undefined,
    }).apply(compiler)
  }

  compiler.hooks.compilation.tap('inspecto-overlay', (compilation: any) => {
    // Find HtmlWebpackPlugin (standard Webpack)
    const HtmlWebpackPlugin = compiler.options.plugins.find(
      (p: any) => p && p.constructor && p.constructor.name === 'HtmlWebpackPlugin',
    )
    if (HtmlWebpackPlugin) {
      const hooks = (HtmlWebpackPlugin.constructor as any).getHooks(compilation)
      hooks.alterAssetTagGroups.tapPromise('inspecto-overlay', async (data: any) => {
        const port = await serverPortFn()
        const publicServerUrl = publicServerUrlFn(port)
        data.headTags.unshift({
          tagName: 'script',
          voidTag: false,
          meta: { plugin: 'inspecto-overlay' },
          innerHTML: getWebpackHtmlScript(port, publicServerUrl),
        })
        return data
      })
    } else {
      // Fallback for frameworks like Next.js that don't use HtmlWebpackPlugin
      if (compilation.hooks.processAssets) {
        // Webpack 5+
        compilation.hooks.processAssets.tapPromise(
          {
            name: 'inspecto-overlay',
            stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
          },
          async (assets: any) => {
            const port = await serverPortFn()
            const publicServerUrl = publicServerUrlFn(port)

            // Only inject into the main client entry chunks (e.g. main-app, main.js, umi.js)
            const mainAssetKey = Object.keys(assets).find(
              key =>
                key.endsWith('.js') &&
                (key.includes('main') || key.includes('app') || key.includes('umi')),
            )
            if (!mainAssetKey) return

            const originalSource = assets[mainAssetKey].source()
            assets[mainAssetKey] = new compiler.webpack.sources.RawSource(
              getWebpackAssetScript(port, publicServerUrl) + '\n' + originalSource,
            )
          },
        )
      }
    }
  })
}
