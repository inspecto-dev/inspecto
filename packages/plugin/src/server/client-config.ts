import type { IdeType, InspectoConfig, ServerState } from '@inspecto-dev/types'
import { isAiIntentConfig } from '@inspecto-dev/types'
import {
  loadPromptsConfig,
  loadUserConfigSync,
  resolveIntents,
  resolveWorkflowSlots,
} from '../config.js'

export async function buildClientConfig(
  serverState: ServerState,
): Promise<InspectoConfig & { autoSend: boolean }> {
  const userConfig = loadUserConfigSync(false, serverState.cwd, serverState.configRoot)
  const promptsConfig = await loadPromptsConfig(false, serverState.cwd, serverState.configRoot)
  const effectiveIde = (userConfig.ide ?? 'vscode') as IdeType

  let info: any
  if (effectiveIde === 'none') {
    info = { ide: 'none', providers: {} }
  } else if (!serverState.ideInfo) {
    info = { ide: effectiveIde }
  } else {
    const { scheme: _scheme, ...rest } = serverState.ideInfo as any
    info = rest
  }

  const allIntents = resolveIntents(promptsConfig)

  return {
    ...info,
    ideConnected: effectiveIde !== 'none' && Boolean(serverState.ideInfo),
    prompts: allIntents.filter(isAiIntentConfig),
    workflows: resolveWorkflowSlots(allIntents),
    hotKeys: userConfig['inspector.hotKey'] ?? 'alt',
    annotateChannel: userConfig['annotate.channel'] ?? 'mcp',
    includeSnippet: userConfig['prompt.includeSnippet'] ?? false,
    runtimeContext: {
      enabled: true,
      preview: true,
      maxRuntimeErrors: 3,
      maxFailedRequests: 2,
    },
    autoSend: userConfig['prompt.autoSend'] ?? false,
  }
}
