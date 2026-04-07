import type { InjectStrategy, InjectOptions } from './types.js'
import type { BuildTool, BuildToolDetection } from '../../types.js'

export class RspackStrategy implements InjectStrategy {
  name = 'Rspack'

  supports(tool: BuildTool): boolean {
    return tool === 'rspack'
  }

  inject(options: InjectOptions): void {
    throw new Error('Rspack requires manual plugin configuration')
  }

  getManualInstructions(detection: BuildToolDetection, reason: string): string[] {
    const importPkg = detection.isLegacyRspack
      ? '@inspecto-dev/plugin/legacy/rspack'
      : '@inspecto-dev/plugin'

    const pluginCall = detection.isLegacyRspack
      ? `process.env.NODE_ENV !== 'production' && inspecto({\n      pathType: 'absolute',\n      escapeTags: ['Transition', 'AnimatePresence'],\n    })`
      : `process.env.NODE_ENV !== 'production' && inspecto()`

    return [
      `import { rspackPlugin as inspecto } from '${importPkg}'`,
      '',
      '// Add to your plugins array:',
      `plugins: [`,
      `  ${pluginCall},`,
      `  ...otherPlugins`,
      `].filter(Boolean)`,
    ]
  }
}
