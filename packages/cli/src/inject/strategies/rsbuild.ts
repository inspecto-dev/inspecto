import type { InjectStrategy, InjectOptions } from './types.js'
import type { BuildTool, BuildToolDetection } from '../../types.js'

export class RsbuildStrategy implements InjectStrategy {
  name = 'Rsbuild'

  supports(tool: BuildTool): boolean {
    return tool === 'rsbuild'
  }

  inject(options: InjectOptions): void {
    throw new Error('Rsbuild requires manual plugin configuration due to nested structure')
  }

  getManualInstructions(detection: BuildToolDetection, reason: string): string[] {
    return [
      `import { rspackPlugin as inspecto } from '@inspecto-dev/plugin'`,
      '',
      '// Add to tools.rspack:',
      `tools: {`,
      `  rspack: {`,
      `    plugins: [`,
      `      process.env.NODE_ENV !== 'production' && inspecto(),`,
      `    ]`,
      `  }`,
      `}`,
    ]
  }
}
