import { log } from '../utils/logger.js'
import { writeCommandOutput } from '../utils/output.js'
import { createDetectionResult } from '../onboarding/planner.js'
import type { DetectionResult } from '../types.js'

function printDetectionResult(result: DetectionResult): void {
  const suppressedCodes = new Set([
    'unsupported-build-tool',
    'unsupported-build-tool-present',
    'unsupported-framework',
    'unsupported-framework-present',
  ])

  log.header('Inspecto Detect')
  log.info(`Status: ${result.status}`)
  log.info(`Root: ${result.project.root}`)
  log.info(`Package manager: ${result.project.packageManager}`)

  if (result.environment.frameworks.length > 0) {
    log.success(`Supported frameworks: ${result.environment.frameworks.join(', ')}`)
  }
  if (result.environment.unsupportedFrameworks.length > 0) {
    log.warn(`Unsupported frameworks: ${result.environment.unsupportedFrameworks.join(', ')}`)
  }
  if (result.environment.buildTools.length > 0) {
    log.success(
      `Supported build tools: ${result.environment.buildTools.map(tool => tool.label).join(', ')}`,
    )
  }
  if (result.environment.unsupportedBuildTools.length > 0) {
    log.warn(`Unsupported build tools: ${result.environment.unsupportedBuildTools.join(', ')}`)
  }

  const supportedIdes = result.environment.ides.filter(ide => ide.supported).map(ide => ide.ide)
  if (supportedIdes.length > 0) {
    log.success(`Supported IDEs: ${supportedIdes.join(', ')}`)
  }

  const supportedProviders = result.environment.providers
    .filter(provider => provider.supported)
    .map(provider => provider.label)
  if (supportedProviders.length > 0) {
    log.success(`Supported providers: ${supportedProviders.join(', ')}`)
  }

  for (const blocker of result.blockers) {
    if (suppressedCodes.has(blocker.code)) continue
    log.error(blocker.message)
  }
  for (const warning of result.warnings) {
    if (suppressedCodes.has(warning.code)) continue
    log.warn(warning.message)
  }
}

export async function detect(json = false): Promise<DetectionResult> {
  const result = await createDetectionResult(process.cwd())
  return writeCommandOutput(result, json, printDetectionResult)
}
