import { transformRouter } from '../../transform/index.js'
import { shouldTransform } from '../../transform/utils.js'
import type { UnpluginOptions } from '@inspecto-dev/types'

export default function legacyRspackLoader(this: any, source: string) {
  const id = this.resourcePath
  const options = this.getOptions() as Required<UnpluginOptions>

  if (!shouldTransform(id, options)) {
    return source
  }

  const result = transformRouter({
    filePath: id,
    source,
    projectRoot: process.cwd(),
    pluginOptions: options,
  })

  if (result && result.changed) {
    this.callback(null, result.code, result.map)
    return
  }

  return source
}
