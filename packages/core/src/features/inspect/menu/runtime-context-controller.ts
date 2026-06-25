import type {
  AiIntentConfig,
  InspectorOptions,
  RuntimeContextEnvelope,
  SourceLocation,
} from '@inspecto-dev/types'
import { renderRuntimeContextUi } from './runtime-context-renderer.js'
import { resolveInspectMenuRuntimeContext } from './runtime-context-resolver.js'
import type { RuntimeContextDefaultMode } from './runtime-toggle.js'

type RuntimeContextControllerInput = {
  runtimeContextSection: HTMLElement
  runtimeToggleButton: HTMLButtonElement
  runtimeToggleBadge: HTMLElement
  canAttachRuntimeContext: boolean
  runtimeContextDefaultMode: RuntimeContextDefaultMode
  location: SourceLocation | null
  getRuntimeContext?: (location: SourceLocation) => RuntimeContextEnvelope | null
  options: InspectorOptions
  updatePosition: () => void
}

type RuntimeContextController = {
  render(): void
  resolve(intent?: Pick<AiIntentConfig, 'id' | 'aiIntent'>): RuntimeContextEnvelope | null
  setCanAttachRuntimeContext(canAttachRuntimeContext: boolean): void
  setDefaultMode(runtimeContextDefaultMode: RuntimeContextDefaultMode): void
}

export function createInspectMenuRuntimeContextController(
  input: RuntimeContextControllerInput,
): RuntimeContextController {
  let canAttachRuntimeContext = input.canAttachRuntimeContext
  let runtimeContextDefaultMode = input.runtimeContextDefaultMode
  let runtimeContextPreference: boolean | null = null

  const render = (): void => {
    const runtimeContextForUi = input.location
      ? (input.getRuntimeContext?.(input.location) ?? null)
      : null
    renderRuntimeContextUi({
      runtimeContextSection: input.runtimeContextSection,
      runtimeToggleButton: input.runtimeToggleButton,
      runtimeToggleBadge: input.runtimeToggleBadge,
      canAttachRuntimeContext,
      runtimeContext: runtimeContextForUi,
      runtimeContextPreference,
      runtimeContextDefaultMode,
      options: input.options,
      updatePosition: input.updatePosition,
    })
  }

  input.runtimeToggleButton.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    const currentEnabled = input.runtimeToggleButton.getAttribute('aria-pressed') === 'true'
    runtimeContextPreference = !currentEnabled
    render()
  })

  return {
    render,
    resolve(intent) {
      return resolveInspectMenuRuntimeContext({
        canAttachRuntimeContext,
        runtimeContextPreference,
        runtimeContextDefaultMode,
        location: input.location,
        ...(input.getRuntimeContext ? { getRuntimeContext: input.getRuntimeContext } : {}),
        ...(intent ? { intent } : {}),
      })
    },
    setCanAttachRuntimeContext(nextCanAttachRuntimeContext) {
      canAttachRuntimeContext = nextCanAttachRuntimeContext
    },
    setDefaultMode(nextRuntimeContextDefaultMode) {
      runtimeContextDefaultMode = nextRuntimeContextDefaultMode
    },
  }
}
