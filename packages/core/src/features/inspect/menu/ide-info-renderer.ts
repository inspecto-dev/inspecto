import type {
  AiIntentConfig,
  InspectoConfig,
  InspectorOptions,
  RuntimeContextEnvelope,
  SourceLocation,
} from '@inspecto-dev/types'
import { openFileWithDiagnostics } from '../../../transport/http-client.js'
import { t } from '../../../shared/i18n.js'
import { isAiIntentConfig } from '@inspecto-dev/types'
import { isFixIntent } from './helpers.js'
import { createIntentActionButtons } from './actions.js'
import { syncRuntimeToggleButton } from './header-actions.js'
import type { RuntimeContextDefaultMode } from './runtime-toggle.js'

type RuntimeContextController = {
  render(): void
  resolve(intent?: Pick<AiIntentConfig, 'id' | 'aiIntent'>): RuntimeContextEnvelope | null
  setCanAttachRuntimeContext(canAttachRuntimeContext: boolean): void
  setDefaultMode(runtimeContextDefaultMode: RuntimeContextDefaultMode): void
}

type OpenFileResult = Awaited<ReturnType<typeof openFileWithDiagnostics>>

type RenderInspectMenuIdeInfoInput = {
  ideInfo: InspectoConfig
  input: HTMLInputElement
  loadingElement: HTMLElement
  actionsSection: HTMLElement
  headerActions: HTMLElement
  runtimeToggleButton: HTMLButtonElement
  openButton: HTMLButtonElement
  location: SourceLocation
  includeSnippet: boolean
  maxSnippetLines: number
  options: InspectorOptions
  hasRuntimeContextProvider: boolean
  runtimeContextController: RuntimeContextController
  resolveCssContextPrompt: (intent?: Pick<AiIntentConfig, 'id'>) => string | null
  onSend: (payload: {
    label: string
    button: HTMLButtonElement
    prompt: string
    snippetText: string
    runtimeContext: RuntimeContextEnvelope | null
  }) => Promise<void>
  onOpenFile?: (location: SourceLocation) => Promise<OpenFileResult>
  onCleanup: () => void
  onError: (message: string, errorCode?: string) => void
  updatePosition: () => void
}

export function renderInspectMenuIdeInfo(input: RenderInspectMenuIdeInfoInput): void {
  input.loadingElement.remove()

  if (input.ideInfo.runtimeContext?.enabled === true && input.hasRuntimeContextProvider) {
    syncRuntimeToggleButton({
      headerActions: input.headerActions,
      runtimeToggleButton: input.runtimeToggleButton,
      openButton: input.openButton,
      canAttachRuntimeContext: true,
    })
    input.runtimeContextController.setCanAttachRuntimeContext(true)
  }

  const intents = input.ideInfo.prompts || []
  if (!input.options.askPlaceholder) {
    input.input.placeholder =
      intents.length > 0 ? t('menu.ask.placeholder.default') : t('menu.ask.placeholder.fallback')
  }

  const aiIntents = intents.filter(isAiIntentConfig)
  input.runtimeContextController.setDefaultMode(resolveRuntimeContextDefaultMode(aiIntents))
  input.runtimeContextController.render()

  const aiActions = createIntentActionButtons({
    intents: aiIntents,
    location: input.location,
    includeSnippet: input.includeSnippet,
    maxSnippetLines: input.maxSnippetLines,
    resolveRuntimeContext: intent => input.runtimeContextController.resolve(intent),
    resolveCssContextPrompt: input.resolveCssContextPrompt,
    onSend: input.onSend,
    onError: input.onError,
  })

  input.openButton.addEventListener('click', async event => {
    event.stopPropagation()
    input.openButton.disabled = true
    const openResult = await (input.onOpenFile ?? openFileWithDiagnostics)(input.location)
    if (openResult.success) {
      input.onCleanup()
      return
    }
    input.openButton.disabled = false
    input.onError(t('menu.error.openIde'), openResult.errorCode ?? 'IDE_UNAVAILABLE')
  })

  for (const action of aiActions) {
    input.actionsSection.appendChild(action)
  }
  input.updatePosition()
}

function resolveRuntimeContextDefaultMode(intents: AiIntentConfig[]): RuntimeContextDefaultMode {
  const hasFixIntent = intents.some(isFixIntent)
  const hasNonFixIntent = intents.some(intent => !isFixIntent(intent))
  return hasFixIntent ? (hasNonFixIntent ? 'mixed' : 'all-on') : 'off'
}
