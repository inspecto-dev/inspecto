import { log } from '../utils/logger.js'
import { writeCommandOutput } from '../utils/output.js'
import { buildOnboardingContext } from '../onboarding/context.js'
import { createPlanResult } from '../onboarding/planner.js'
import type { PlanResult } from '../types.js'

function printPlanResult(result: PlanResult): void {
  log.header('Inspecto Plan')
  log.info(`Status: ${result.status}`)
  log.info(`Strategy: ${result.strategy}`)

  if (result.defaults.provider) {
    log.info(`Default provider: ${result.defaults.provider}`)
  }
  if (result.defaults.ide) {
    log.info(`Default IDE: ${result.defaults.ide}`)
  }
  log.info(`Shared mode: ${result.defaults.shared ? 'enabled' : 'disabled'}`)
  log.info(`Extension mode: ${result.defaults.extension ? 'enabled' : 'disabled'}`)

  if (result.actions.length > 0) {
    log.blank()
    log.info('Actions:')
    for (const action of result.actions) {
      log.hint(`${action.type}: ${action.target} — ${action.description}`)
    }
  }

  for (const blocker of result.blockers) {
    log.error(blocker.message)
  }
  for (const warning of result.warnings) {
    log.warn(warning.message)
  }
}

export async function plan(json = false): Promise<PlanResult> {
  const context = await buildOnboardingContext(process.cwd())
  const result = createPlanResult(context)
  return writeCommandOutput(result, json, printPlanResult)
}
