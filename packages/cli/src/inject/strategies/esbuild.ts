import type { InjectStrategy, InjectOptions } from './types.js'
import type { BuildTool, BuildToolDetection } from '../../types.js'

export class EsbuildStrategy implements InjectStrategy {
  name = 'esbuild'

  supports(tool: BuildTool): boolean {
    return tool === 'esbuild'
  }

  inject(options: InjectOptions): void {
    throw new Error('Esbuild requires manual plugin configuration')
  }

  getManualInstructions(detection: BuildToolDetection, reason: string): string[] {
    return [
      `1. Update your esbuild config (${detection.configPath}):`,
      `import { esbuildPlugin as inspecto } from '@inspecto-dev/plugin'`,
      '',
      '// Add to your plugins array:',
      `plugins: [`,
      `  process.env.NODE_ENV !== 'production' && inspecto(),`,
      `  ...otherPlugins`,
      `].filter(Boolean)`,
      '',
      '2. Initialize the client in your app entry (e.g., main.js / index.js):',
      `import { mountInspector } from '@inspecto-dev/core'`,
      '',
      '// Call this before your app renders',
      `if (process.env.NODE_ENV !== 'production') {`,
      `  mountInspector()`,
      `}`,
    ]
  }
}
