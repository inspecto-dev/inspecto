import { ViteStrategy } from './vite.js'
import { WebpackStrategy } from './webpack.js'
import { RspackStrategy } from './rspack.js'
import { RsbuildStrategy } from './rsbuild.js'
import { EsbuildStrategy } from './esbuild.js'
import { RollupStrategy } from './rollup.js'
import type { InjectStrategy } from './types.js'

export const STRATEGIES: InjectStrategy[] = [
  new ViteStrategy(),
  new WebpackStrategy(),
  new RspackStrategy(),
  new RsbuildStrategy(),
  new EsbuildStrategy(),
  new RollupStrategy(),
]
