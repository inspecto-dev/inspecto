import { transformRouter } from '../../transform/index'
import { shouldTransform } from '../../transform/utils'
import type { UnpluginOptions } from '@inspecto-dev/types'

const injectedClient = false

export default function legacyWebpack4Loader(this: any, source: string) {
  const id = this.resourcePath

  // In Webpack 4, loader-utils is typically used, or we read from this.query
  // since this.getOptions() is a Webpack 5+ API.
  let options: any = {}
  if (typeof this.getOptions === 'function') {
    options = this.getOptions()
  } else if (this.query) {
    if (typeof this.query === 'string') {
      // Very fallback query parsing
      options = {}
    } else {
      options = this.query
    }
  }

  // Give default include/exclude options
  const defaultOptions: Required<UnpluginOptions> = {
    include: options.include || [/\.[jt]sx?$/, /\.vue$/],
    exclude: options.exclude || [/node_modules/, /\.html$/],
    hotKey: options.hotKey || 'altKey',
    ...options,
  }

  if (!shouldTransform(id, defaultOptions)) {
    return source
  }

  const result = transformRouter({
    filePath: id,
    source,
    projectRoot: process.cwd(),
    pluginOptions: defaultOptions,
  })

  let finalSource = result?.changed ? result.code : source

  // Inject the client dynamically into the first source module we process
  // WARNING: We must NOT use process-level state like `let injectedClient = false`
  // because in webpack-dev-server, files are recompiled and the loader might hit
  // multiple entries or the same entry again on HMR.
  // Instead, we inject it conditionally based on a known module that acts as an entry
  // Webpack uses standard regex matching, so let's match any file that has `react-dom` rendering

  const isMainEntry =
    finalSource.includes('react-dom/client') ||
    finalSource.includes('react-dom') ||
    /[/\\](index|main)\.[jt]sx?$/.test(id)

  if (isMainEntry && finalSource.indexOf('window.InspectoClient') === -1) {
    const clientPath = options.clientPath || '@inspecto-dev/core'
    // For Webpack 4 and Babel environments, using require() is safer than prepending `import`
    // to a file that might be CommonJS, and it doesn't get hoisted irregularly.
    finalSource =
      `
if (typeof window !== 'undefined' && !window.InspectoClient) {
  try {
    var __inspecto_core__ = require('${clientPath.replace(/\\/g, '\\\\')}');
    window.InspectoClient = __inspecto_core__.default || __inspecto_core__;
  } catch (e) {
    console.error('[inspecto] core load error', e);
  }
}
` + finalSource
  }

  if (result && result.changed) {
    this.callback(null, finalSource, result.map)
    return
  }

  return finalSource
}
