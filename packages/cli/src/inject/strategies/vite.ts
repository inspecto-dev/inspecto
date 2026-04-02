import { addVitePlugin } from 'magicast/helpers'
import type { InjectStrategy, InjectOptions } from './types.js'
import type { BuildTool, BuildToolDetection } from '../../types.js'

export class ViteStrategy implements InjectStrategy {
  name = 'Vite'

  supports(tool: BuildTool): boolean {
    return tool === 'vite'
  }

  inject({ mod, detection }: InjectOptions): void {
    addVitePlugin(mod, {
      from: '@inspecto-dev/plugin',
      constructor: 'inspecto',
      imported: 'vitePlugin',
    })
  }

  getManualInstructions(detection: BuildToolDetection, reason: string): string[] {
    return [
      `import { vitePlugin as inspecto } from '@inspecto-dev/plugin'`,
      '',
      '// Add to your plugins array:',
      `plugins: [`,
      `  process.env.NODE_ENV !== 'production' && inspecto(),`,
      `  ...otherPlugins`,
      `].filter(Boolean)`,
    ]
  }
}
