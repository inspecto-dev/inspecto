import path from 'node:path'
import type { UnpluginOptions } from '@inspecto/types'
import { transformJsx } from './transform-jsx.js'
import { transformVue } from './transform-vue.js'
import { JSX_EXTENSIONS, type TransformResult } from './utils.js'

export interface RouterOptions {
  filePath: string
  source: string
  projectRoot: string
  pluginOptions: Required<UnpluginOptions>
}

/**
 * Route a file to the appropriate transform based on extension.
 * Returns null if no transform applies.
 */
export function transformRouter(options: RouterOptions): TransformResult | null {
  const { filePath, source, projectRoot, pluginOptions } = options
  const ext = path.extname(filePath).toLowerCase()

  if (JSX_EXTENSIONS.has(ext)) {
    return transformJsx({
      filePath,
      source,
      projectRoot,
      escapeTags: pluginOptions.escapeTags,
      pathType: pluginOptions.pathType,
      attributeName: pluginOptions.attributeName,
    })
  }

  // ── Vue SFC ──────────────────────────────────────────────────────────────
  if (ext === '.vue') {
    return transformVue({
      filePath,
      source,
      projectRoot,
      escapeTags: pluginOptions.escapeTags,
      pathType: pluginOptions.pathType,
      attributeName: pluginOptions.attributeName,
    })
  }

  return null
}
// Export transforms for testing
export { transformJsx, transformVue }
