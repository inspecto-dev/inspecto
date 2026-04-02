import type { ProxifiedModule } from 'magicast'
import type { BuildTool, BuildToolDetection } from '../../types.js'

export interface InjectOptions {
  /** The magicast proxified module */
  mod: ProxifiedModule<any>
  /** The build tool detection result */
  detection: BuildToolDetection
}

export interface InjectStrategy {
  /** Name of the strategy for logging */
  name: string

  /** Check if this strategy can handle the given build tool */
  supports(tool: BuildTool): boolean

  /**
   * Perform the AST injection.
   * Note: Some tools (like webpack) might throw an error here to trigger manual fallback
   * because AST manipulation for them is too complex/brittle in v1.
   */
  inject(options: InjectOptions): void

  /**
   * Perform the AST removal (for teardown).
   * Returns true if successful, false if it couldn't be removed automatically.
   */
  remove?(options: InjectOptions): boolean

  /**
   * Return manual fallback instructions if automatic injection fails or is unsupported.
   */
  getManualInstructions(detection: BuildToolDetection, reason: string): string[]
}
