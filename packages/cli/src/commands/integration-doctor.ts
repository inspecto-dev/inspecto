import { describeIntegration, type InstallIntegrationOptions } from './integration-install.js'
import { runIntegrationAutomation } from './integration-automation.js'
import { log } from '../utils/logger.js'
import { writeCommandOutput } from '../utils/output.js'
import { exitProcess } from '../utils/process.js'

const INTEGRATION_DOCTOR_SCHEMA_VERSION = '1'

export interface IntegrationDoctorOptions extends Pick<
  InstallIntegrationOptions,
  'scope' | 'mode' | 'ide' | 'inspectoVsix' | 'json'
> {
  compact?: boolean
  failOnBlocked?: boolean
}

export interface IntegrationDoctorResult {
  schemaVersion: string
  status: 'ok' | 'blocked'
  assistant: string
  assets: string[]
  message: string
  nextStep?: string
  automation: Awaited<ReturnType<typeof runIntegrationAutomation>>
}

function printIntegrationDoctorResult(
  result: IntegrationDoctorResult,
  options: Pick<IntegrationDoctorOptions, 'compact'> = {},
): void {
  log.header('Inspecto Integration Doctor')
  log.info(`Assistant: ${result.assistant}`)
  const compact = options.compact ?? false

  if (!compact && result.assets.length > 0) {
    log.info('Asset targets:')
    for (const asset of result.assets) {
      log.hint(asset)
    }
  }

  const details = result.automation.details
  if (details?.hostIde?.id && details.hostIde.label) {
    const hostIdeDetail = details.hostIde.source
      ? `${details.hostIde.label} (${details.hostIde.source})`
      : details.hostIde.label
    log.info(`Host IDE: ${hostIdeDetail}`)
  }

  if (!compact && details?.inspectoExtension) {
    log.info(
      `Inspecto extension: ${details.inspectoExtension.source} (${details.inspectoExtension.reference})`,
    )
  }

  if (details?.runtime) {
    const mode = details.runtime.mode ?? 'default'
    const readiness = details.runtime.ready ? ` via ${mode}` : ' unavailable'
    log.info(`Runtime: ${details.runtime.assistant}${readiness}`)
  }

  if (details?.workspace?.path) {
    log.info(`Workspace: ${details.workspace.path}`)
  }

  if (!compact && details?.onboarding?.uri) {
    log.info(`Onboarding URI: ${details.onboarding.uri}`)
  }

  if (result.status === 'ok') {
    log.ready(result.message)
  } else {
    log.warn(result.message)
    if (result.nextStep) {
      log.hint(result.nextStep)
    }
  }
}

export async function integrationDoctor(
  assistant: string,
  options: IntegrationDoctorOptions = {},
): Promise<IntegrationDoctorResult> {
  const description = describeIntegration(assistant, options)
  const automation = await runIntegrationAutomation(
    assistant,
    {
      ...(options.ide ? { ide: options.ide } : {}),
      ...(options.inspectoVsix ? { inspectoVsix: options.inspectoVsix } : {}),
      preview: true,
      silent: true,
    },
    process.cwd(),
  )

  const result: IntegrationDoctorResult = {
    schemaVersion: INTEGRATION_DOCTOR_SCHEMA_VERSION,
    status: automation.status === 'preview' ? 'ok' : 'blocked',
    assistant,
    assets: description.targets,
    message: automation.message,
    ...(automation.nextStep ? { nextStep: automation.nextStep } : {}),
    automation,
  }

  const written = writeCommandOutput(result, options.json ?? false, value =>
    printIntegrationDoctorResult(value, {
      ...(options.compact !== undefined ? { compact: options.compact } : {}),
    }),
  )

  if (result.status === 'blocked' && options.failOnBlocked) {
    exitProcess(1)
  }

  return written
}
