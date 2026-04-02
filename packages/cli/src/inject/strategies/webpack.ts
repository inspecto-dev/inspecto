import type { InjectStrategy, InjectOptions } from './types.js'
import type { BuildTool, BuildToolDetection } from '../../types.js'

export class WebpackStrategy implements InjectStrategy {
  name = 'Webpack'

  supports(tool: BuildTool): boolean {
    return tool === 'webpack'
  }

  inject(options: InjectOptions): void {
    // AST manipulation for Webpack configs (often CommonJS or complex objects) is brittle in v1
    throw new Error('Webpack requires manual plugin configuration')
  }

  getManualInstructions(detection: BuildToolDetection, reason: string): string[] {
    const importPkg = detection.isLegacyWebpack
      ? '@inspecto-dev/plugin/legacy/webpack4'
      : '@inspecto-dev/plugin'
    const pluginName = detection.isLegacyWebpack ? 'webpack4Plugin' : 'webpackPlugin'

    const pluginCall = detection.isLegacyWebpack
      ? `process.env.NODE_ENV !== 'production' && inspecto({\n      pathType: 'absolute',\n      escapeTags: ['Transition', 'AnimatePresence'],\n    })`
      : `process.env.NODE_ENV !== 'production' && inspecto()`

    return [
      `import { ${pluginName} as inspecto } from '${importPkg}'`,
      '',
      '// Add to your plugins array:',
      `plugins: [`,
      `  ${pluginCall},`,
      `  ...otherPlugins`,
      `].filter(Boolean)`,
    ]
  }
}
