import type { IdeType, InspectoConfig, ServerState } from '@inspecto-dev/types'
import { loadPromptsConfig, loadUserConfigSync, resolveIntents } from '../config.js'

export async function buildClientConfig(
  serverState: ServerState,
): Promise<InspectoConfig & { autoSend: boolean }> {
  const userConfig = loadUserConfigSync(false, serverState.cwd, serverState.configRoot)
  const promptsConfig = await loadPromptsConfig(false, serverState.cwd, serverState.configRoot)
  const effectiveIde = (userConfig.ide ?? 'vscode') as IdeType

  let info: any
  if (!serverState.ideInfo) {
    info = { ide: effectiveIde }
  } else {
    const { scheme: _scheme, ...rest } = serverState.ideInfo as any
    info = rest
  }

  return {
    ...info,
    prompts: resolveIntents(promptsConfig),
    hotKeys: userConfig['inspector.hotKey'] ?? 'alt',
    theme: userConfig['inspector.theme'] ?? 'auto',
    includeSnippet: userConfig['prompt.includeSnippet'] ?? false,
    runtimeContext: {
      enabled: true,
      preview: true,
      maxRuntimeErrors: 3,
      maxFailedRequests: 2,
    },
    screenshotContext: {
      enabled: false,
    },
    annotationResponseMode: userConfig['prompt.annotationResponseMode'] ?? 'unified',
    autoSend: userConfig['prompt.autoSend'] ?? false,
  }
}
