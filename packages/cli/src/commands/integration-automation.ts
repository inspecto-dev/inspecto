import {
  installExtension,
  openIdeWorkspace,
  openUri,
  resolveHostIdeBinary,
} from '../inject/extension.js'
import {
  getDualModeAssistantCapability,
  getHostIdeLabel,
  getHostIdeResolutionSourceLabel,
  type SupportedHostIde,
} from '../integrations/capabilities.js'
import { exists } from '../utils/fs.js'
import { log } from '../utils/logger.js'
import { resolveIntegrationHostIde } from './integration-host-ide.js'
import { resolveIntegrationDispatchMode } from './integration-dispatch-mode.js'

const ONBOARDING_PROMPT = 'Set up Inspecto in this project'
const TOTAL_STEPS = 6
const EXTENSION_ID = 'inspecto.inspecto'

interface IntegrationAutomationOptions {
  ide?: string
  inspectoVsix?: string
  preview?: boolean
  silent?: boolean
}

interface IntegrationAutomationDetails {
  hostIde?: {
    id: string | null
    label?: string
    source?: string
    confidence: string
    candidates: string[]
  }
  inspectoExtension?: {
    source: 'marketplace' | 'local_vsix'
    reference: string
    binaryAvailable?: boolean
    binaryPath?: string | null
    status?: string
  }
  runtime?: {
    assistant: string
    ready: boolean
    mode: string | null
  }
  workspace?: {
    path?: string
    attempted: boolean
    opened?: boolean
  }
  onboarding?: {
    uri: string
    autoSend: boolean
  }
}

export interface IntegrationAutomationResult {
  status: 'launched' | 'partial' | 'blocked' | 'preview' | 'preview_blocked'
  message: string
  nextStep?: string
  details?: IntegrationAutomationDetails
}

function getPreviewReadyMessage(): string {
  return 'Preview complete. Inspecto did not write files or open IDE windows. Review the resolved setup below, then rerun without --preview to apply it.'
}

function getPreviewBlockedMessage(): string {
  return 'Preview blocked. Inspecto did not write files or open IDE windows because setup cannot continue until the blocking issue below is resolved.'
}

function getHostIdeBlockedMessage(): string {
  return 'Automatic setup stopped: Inspecto could not determine which IDE should receive onboarding.'
}

function getRuntimeBlockedMessage(assistant: string, ide: SupportedHostIde): string {
  return `Automatic setup stopped: Inspecto could not find a runnable ${getAssistantLabel(assistant)} target in ${getHostIdeLabel(ide)}.`
}

function getLaunchBlockedMessage(ide: SupportedHostIde): string {
  return `Automatic setup stopped: Inspecto could not open onboarding in ${getHostIdeLabel(ide)}.`
}

export async function runIntegrationAutomation(
  assistant: string,
  options: IntegrationAutomationOptions = {},
  cwd?: string,
): Promise<IntegrationAutomationResult> {
  const silent = options.silent ?? false
  const resolvedHostIde = await resolveIntegrationHostIde({
    ...(options.ide ? { explicitIde: options.ide } : {}),
    ...(cwd ? { cwd } : {}),
  })

  const details: IntegrationAutomationDetails = {
    hostIde: {
      id: resolvedHostIde.ide,
      confidence: resolvedHostIde.confidence,
      candidates: resolvedHostIde.candidates,
      ...(resolvedHostIde.ide
        ? {
            label: getHostIdeLabel(resolvedHostIde.ide),
            source: getHostIdeResolutionSourceLabel(resolvedHostIde.source),
          }
        : {}),
    },
  }

  if (!resolvedHostIde.ide || resolvedHostIde.confidence === 'low') {
    if (!silent) {
      log.warn(formatIntegrationStep(2, 'Could not confidently resolve the host IDE'))
    }
    if (resolvedHostIde.candidates.length > 0) {
      if (!silent) {
        log.hint(`Candidates: ${resolvedHostIde.candidates.join(', ')}`)
      }
    }
    if (!silent) {
      log.hint(
        'Re-run with --host-ide <vscode|cursor|trae|trae-cn> or run the command from the target IDE terminal to continue automatic setup.',
      )
    }
    return {
      status: 'blocked',
      message: getHostIdeBlockedMessage(),
      nextStep:
        'Re-run with --host-ide <vscode|cursor|trae|trae-cn> or run the command from the target IDE terminal to continue automatic setup.',
      details,
    }
  }

  const previewParams = new URLSearchParams()
  previewParams.set('target', assistant)
  previewParams.set('prompt', ONBOARDING_PROMPT)
  previewParams.set('autoSend', String(shouldAutoSend(assistant, resolvedHostIde.ide)))
  if (cwd) {
    previewParams.set('workspace', cwd)
  }

  const dispatchMode = await resolveIntegrationDispatchMode({
    assistant,
    hostIde: resolvedHostIde.ide,
  })

  if (dispatchMode.mode) {
    previewParams.set('overrides', JSON.stringify({ type: dispatchMode.mode }))
  }

  const launchUri = `${resolvedHostIde.ide}://inspecto.inspecto/send?${previewParams.toString()}`
  details.inspectoExtension = {
    source: options.inspectoVsix ? 'local_vsix' : 'marketplace',
    reference: options.inspectoVsix ?? EXTENSION_ID,
  }
  details.runtime = {
    assistant: getAssistantLabel(assistant),
    ready: dispatchMode.ready,
    mode: dispatchMode.mode,
  }
  details.workspace = {
    ...(cwd ? { path: cwd } : {}),
    attempted: Boolean(cwd),
  }
  details.onboarding = {
    uri: launchUri,
    autoSend: shouldAutoSend(assistant, resolvedHostIde.ide),
  }

  if (options.preview) {
    if (!silent) {
      log.info(formatIntegrationStep(2, 'Previewed host IDE resolution'))
      log.hint(
        `${getHostIdeLabel(resolvedHostIde.ide)} (${getHostIdeResolutionSourceLabel(resolvedHostIde.source)})`,
      )
    }

    const hostIdeBinary = await resolveHostIdeBinary(resolvedHostIde.ide)
    details.inspectoExtension.binaryAvailable = Boolean(hostIdeBinary)
    details.inspectoExtension.binaryPath = hostIdeBinary
    if (!hostIdeBinary) {
      const nextStep = `Install the ${getHostIdeLabel(resolvedHostIde.ide)} CLI binary or rerun the command from a shell where it is available, then rerun the command.`
      details.inspectoExtension.status = 'missing_host_ide_binary'
      if (!silent) {
        log.warn(
          formatIntegrationStep(
            3,
            `Could not verify Inspecto extension installation in ${getHostIdeLabel(resolvedHostIde.ide)}`,
          ),
        )
        log.hint(
          `No ${getHostIdeLabel(resolvedHostIde.ide)} CLI binary was found. Automatic extension install and workspace opening may not work.`,
        )
      }
      return {
        status: 'preview_blocked',
        message: getPreviewBlockedMessage(),
        nextStep,
        details,
      }
    }

    if (options.inspectoVsix && !(await exists(options.inspectoVsix))) {
      const nextStep = `Provide a valid local VSIX path for ${getHostIdeLabel(resolvedHostIde.ide)} or remove --inspecto-vsix, then rerun the command.`
      details.inspectoExtension.status = 'missing_local_vsix'
      if (!silent) {
        log.warn(
          formatIntegrationStep(
            3,
            `Could not verify the local Inspecto VSIX for ${getHostIdeLabel(resolvedHostIde.ide)}`,
          ),
        )
        log.hint(`The local VSIX path does not exist: ${options.inspectoVsix}`)
      }
      return {
        status: 'preview_blocked',
        message: getPreviewBlockedMessage(),
        nextStep,
        details,
      }
    }

    details.inspectoExtension.status = 'preview_ready'
    if (!silent) {
      log.info(formatIntegrationStep(3, 'Previewed Inspecto extension installation'))
      log.hint(
        options.inspectoVsix
          ? `Local VSIX (${options.inspectoVsix})`
          : `Marketplace install in ${getHostIdeLabel(resolvedHostIde.ide)}`,
      )
    }

    if (!dispatchMode.ready) {
      const nextStep = `Install the ${getAssistantLabel(assistant)} plugin in ${getHostIdeLabel(resolvedHostIde.ide)} or install the \`${getAssistantCliName(assistant)}\` CLI, then rerun the command.`
      if (!silent) {
        log.warn(
          formatIntegrationStep(
            4,
            `Could not resolve a runnable ${getAssistantLabel(assistant)} runtime`,
          ),
        )
        log.hint(nextStep)
      }
      return {
        status: 'preview_blocked',
        message: getPreviewBlockedMessage(),
        nextStep,
        details,
      }
    }

    if (!silent) {
      log.info(formatIntegrationStep(4, `Previewed ${getAssistantLabel(assistant)} runtime`))
      log.hint(getDispatchModeLabel(assistant, resolvedHostIde.ide, dispatchMode.mode))
    }

    if (cwd) {
      if (!silent) {
        log.info(
          formatIntegrationStep(
            5,
            `Previewed workspace routing in ${getHostIdeLabel(resolvedHostIde.ide)}`,
          ),
        )
        log.hint(cwd)
      }
    }

    if (!silent) {
      log.info(formatIntegrationStep(6, 'Previewed onboarding launch'))
      log.hint(launchUri)
    }
    return {
      status: 'preview',
      message: getPreviewReadyMessage(),
      nextStep:
        'Run the same command again without --preview to apply the integration and launch onboarding.',
      details,
    }
  }

  if (!silent) {
    log.success(formatIntegrationStep(2, 'Resolved host IDE'))
    log.hint(
      `${getHostIdeLabel(resolvedHostIde.ide)} (${getHostIdeResolutionSourceLabel(resolvedHostIde.source)})`,
    )
  }

  const installResult = await installExtension(
    false,
    resolvedHostIde.ide,
    true,
    options.inspectoVsix,
  )
  details.inspectoExtension.status = installResult?.description ?? 'not_prepared'
  if (!silent) {
    logInstallStep(resolvedHostIde.ide, installResult)
  }
  if (installResult?.type === 'extension_installed') {
    if (!silent) {
      if (installResult.manual_action_required) {
        log.hint('Complete the IDE install prompt before retrying if onboarding does not appear.')
      } else {
        log.hint('Waiting briefly for the IDE extension to finish activating...')
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1500))
  } else {
    if (!silent) {
      log.warn(
        formatIntegrationStep(
          3,
          `Could not prepare the Inspecto extension for ${getHostIdeLabel(resolvedHostIde.ide)}`,
        ),
      )
      log.hint('Automatic onboarding may fail until the Inspecto extension is installed.')
    }
  }

  if (cwd) {
    const openedWorkspace = await openIdeWorkspace(resolvedHostIde.ide, cwd)
    details.workspace.opened = openedWorkspace
    if (openedWorkspace) {
      if (!silent) {
        log.success(
          formatIntegrationStep(5, `Opened workspace in ${getHostIdeLabel(resolvedHostIde.ide)}`),
        )
        log.hint(cwd)
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    } else {
      if (!silent) {
        log.warn(
          formatIntegrationStep(
            5,
            `Could not open the workspace in ${getHostIdeLabel(resolvedHostIde.ide)}`,
          ),
        )
        log.hint(cwd)
      }
    }
  }

  if (!dispatchMode.ready) {
    const nextStep = `Install the ${getAssistantLabel(assistant)} plugin in ${getHostIdeLabel(resolvedHostIde.ide)} or install the \`${getAssistantCliName(assistant)}\` CLI, then rerun the command.`
    if (!silent) {
      log.warn(
        formatIntegrationStep(
          4,
          `Could not resolve a runnable ${getAssistantLabel(assistant)} runtime`,
        ),
      )
      log.hint(nextStep)
    }
    return {
      status: 'blocked',
      message: getRuntimeBlockedMessage(assistant, resolvedHostIde.ide),
      nextStep,
      details,
    }
  }

  if (!silent) {
    log.success(formatIntegrationStep(4, `Resolved ${getAssistantLabel(assistant)} runtime`))
    log.hint(getDispatchModeLabel(assistant, resolvedHostIde.ide, dispatchMode.mode))
  }

  const workspaceOpenFailed = Boolean(cwd) && details.workspace?.opened === false

  const launched = await openUri(launchUri)

  if (launched) {
    if (!silent) {
      log.success(
        formatIntegrationStep(6, `Launched onboarding in ${getHostIdeLabel(resolvedHostIde.ide)}`),
      )
      log.hint(`${getAssistantLabel(assistant)} via ${dispatchMode.mode ?? 'default'} mode`)
    }
    if (workspaceOpenFailed) {
      const nextStep = `If the wrong IDE window received onboarding, open ${cwd} in ${getHostIdeLabel(resolvedHostIde.ide)} and rerun the command from that project.`
      return {
        status: 'partial',
        message: `Onboarding opened in ${getHostIdeLabel(resolvedHostIde.ide)} for ${getAssistantLabel(assistant)}, but Inspecto could not open the target workspace first.`,
        nextStep,
        details,
      }
    }
    return {
      status: installResult ? 'launched' : 'partial',
      message: installResult
        ? `Onboarding opened in ${getHostIdeLabel(resolvedHostIde.ide)} for ${getAssistantLabel(assistant)}.`
        : `Onboarding opened in ${getHostIdeLabel(resolvedHostIde.ide)} for ${getAssistantLabel(assistant)}, but the Inspecto extension may still need manual setup.`,
      ...(installResult
        ? {}
        : {
            nextStep: `Install the Inspecto extension in ${getHostIdeLabel(resolvedHostIde.ide)} if IDE-side features are missing.`,
          }),
      details,
    }
  } else {
    if (!silent) {
      log.warn(
        formatIntegrationStep(
          6,
          `Could not launch onboarding in ${getHostIdeLabel(resolvedHostIde.ide)}`,
        ),
      )
      log.hint(launchUri)
    }
    return {
      status: 'blocked',
      message: getLaunchBlockedMessage(resolvedHostIde.ide),
      nextStep: launchUri,
      details,
    }
  }
}

function shouldAutoSend(assistant: string, ide: SupportedHostIde): boolean {
  if (assistant === 'copilot') return true
  if (assistant === 'codex') return true
  return false
}

function getAssistantLabel(assistant: string): string {
  return getDualModeAssistantCapability(assistant)?.label ?? assistant
}

function getAssistantCliName(assistant: string): string {
  return getDualModeAssistantCapability(assistant)?.cliBin ?? assistant
}

function formatIntegrationStep(step: number, text: string): string {
  return `Step ${step}/${TOTAL_STEPS}: ${text}`
}

function logInstallStep(
  ide: SupportedHostIde,
  installResult: Awaited<ReturnType<typeof installExtension>>,
): void {
  if (!installResult) {
    return
  }

  if (installResult.description === 'already_installed') {
    log.success(
      formatIntegrationStep(3, `Inspecto extension already installed in ${getHostIdeLabel(ide)}`),
    )
    log.hint(installResult.id ?? 'inspecto.inspecto')
    return
  }

  if (installResult.description === 'opened_install_page') {
    log.warn(
      formatIntegrationStep(
        3,
        `Opened the Inspecto extension install page in ${getHostIdeLabel(ide)}`,
      ),
    )
    log.hint('Finish the extension install in the IDE window, then rerun the command if needed.')
    return
  }

  log.success(
    formatIntegrationStep(3, `Installed the Inspecto extension in ${getHostIdeLabel(ide)}`),
  )
  log.hint(installResult.id ?? 'inspecto.inspecto')
}

function getDispatchModeLabel(
  assistant: string,
  ide: SupportedHostIde,
  mode: string | null,
): string {
  if (mode === 'cli') {
    return `CLI fallback (\`${getAssistantCliName(assistant)}\`)`
  }

  if (mode === 'extension') {
    return `${getAssistantLabel(assistant)} plugin in ${getHostIdeLabel(ide)}`
  }

  return 'Default runtime'
}
