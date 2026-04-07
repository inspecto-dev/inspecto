import type {
  IdeType,
  Provider,
  ProviderMode,
  ScreenshotContext,
  ServerState,
  ToolOverrides,
} from '@inspecto-dev/types'
import {
  extractToolOverrides,
  loadUserConfigSync,
  resolveProviderMode,
  resolveTargetTool,
} from '../config.js'
import { createTicket, launchURI } from './dispatch-transport.js'

export interface PromptDispatchRuntime {
  resolvedTarget: Provider
  finalIde: string
  mode: ProviderMode
  overrides?: ToolOverrides
  autoSend?: boolean
}

export interface PromptDispatchPayload {
  prompt: string
  filePath?: string
  line?: number
  column?: number
  snippet?: string
  screenshotContext?: ScreenshotContext
}

export interface PromptDispatchResult {
  success: true
  fallbackPayload: {
    prompt: string
    file?: string
  }
}

export function resolvePromptDispatchRuntime(
  state: Pick<ServerState, 'projectRoot' | 'cwd' | 'ideInfo'>,
): PromptDispatchRuntime {
  const userConfig = loadUserConfigSync(false, state.cwd, state.projectRoot)
  const resolvedTarget = resolveTargetTool(userConfig)
  const finalIde = resolveFinalIde(userConfig.ide, state.ideInfo?.ide, state.ideInfo?.scheme)
  const mode = resolveProviderMode(resolvedTarget, finalIde as IdeType, userConfig)
  const overrides =
    extractToolOverrides(finalIde as IdeType, userConfig)[resolvedTarget] || undefined

  return {
    resolvedTarget,
    finalIde,
    mode,
    ...(hasOverrides(overrides) ? { overrides } : {}),
    ...(userConfig['prompt.autoSend'] !== undefined
      ? { autoSend: Boolean(userConfig['prompt.autoSend']) }
      : {}),
  }
}

export function dispatchPromptThroughIde(
  runtime: PromptDispatchRuntime,
  payload: PromptDispatchPayload,
): PromptDispatchResult {
  const ticketId = createTicket({
    ide: runtime.finalIde,
    target: runtime.resolvedTarget,
    targetType: runtime.mode,
    prompt: payload.prompt,
    filePath: payload.filePath,
    line: payload.line,
    column: payload.column,
    snippet: payload.snippet,
    ...(payload.screenshotContext ? { screenshotContext: payload.screenshotContext } : {}),
    overrides: runtime.overrides,
    autoSend: runtime.autoSend,
  })

  const params = new URLSearchParams()
  params.set('ticket', ticketId)
  params.set('target', runtime.resolvedTarget)

  launchURI(`${runtime.finalIde}://inspecto.inspecto/send?${params.toString()}`)

  return {
    success: true,
    fallbackPayload: {
      prompt: payload.prompt,
      ...(payload.filePath ? { file: payload.filePath } : {}),
    },
  }
}

function resolveFinalIde(
  configuredIde: string | undefined,
  activeIde: string | undefined,
  activeIdeScheme: string | undefined,
): string {
  if (configuredIde && activeIdeScheme && !activeIdeScheme.includes(configuredIde)) {
    return configuredIde
  }

  return configuredIde || activeIdeScheme || activeIde || 'vscode'
}

function hasOverrides(overrides: ToolOverrides | undefined): overrides is ToolOverrides {
  return Boolean(overrides && Object.keys(overrides).length > 0)
}
