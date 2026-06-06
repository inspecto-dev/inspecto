import type { InspectorOptions, RuntimeContextEnvelope } from '@inspecto-dev/types'
import { t } from '../../../shared/i18n.js'
import {
  createRuntimeContextUi,
  formatRuntimeContextSummary,
  formatRuntimeErrorCount,
} from './helpers.js'
import {
  applyRuntimeToggleButtonState,
  getRuntimeToggleAriaPressed,
  getRuntimeToggleVisualState,
  type RuntimeContextDefaultMode,
} from './runtime-toggle.js'

type RenderRuntimeContextUiInput = {
  runtimeContextSection: HTMLElement
  runtimeToggleButton: HTMLButtonElement
  runtimeToggleBadge: HTMLElement
  canAttachRuntimeContext: boolean
  runtimeContext: RuntimeContextEnvelope | null
  runtimeContextPreference: boolean | null
  runtimeContextDefaultMode: RuntimeContextDefaultMode
  options: InspectorOptions
  updatePosition: () => void
}

function getRuntimeToggleTitle(ariaPressed: string, runtimeSummary: string): string {
  if (ariaPressed === 'true') {
    return runtimeSummary
      ? `${t('menu.runtimeEnabled')} • ${runtimeSummary}`
      : t('menu.runtimeEnabled')
  }

  if (ariaPressed === 'mixed') {
    return runtimeSummary
      ? `${t('menu.runtimeFixOnly')} • ${runtimeSummary}`
      : t('menu.runtimeFixOnly')
  }

  return runtimeSummary ? `${t('menu.attachRuntime')} • ${runtimeSummary}` : t('menu.attachRuntime')
}

export function renderRuntimeContextUi({
  runtimeContextSection,
  runtimeToggleButton,
  runtimeToggleBadge,
  canAttachRuntimeContext,
  runtimeContext,
  runtimeContextPreference,
  runtimeContextDefaultMode,
  options,
  updatePosition,
}: RenderRuntimeContextUiInput): void {
  runtimeContextSection.replaceChildren()

  if (!canAttachRuntimeContext) {
    runtimeContextSection.hidden = true
    return
  }

  const runtimeErrorCount = runtimeContext?.summary.runtimeErrorCount ?? 0
  const runtimeSummary = runtimeContext ? formatRuntimeContextSummary(runtimeContext) : ''
  runtimeToggleBadge.textContent = formatRuntimeErrorCount(runtimeErrorCount)

  const ariaPressed = getRuntimeToggleAriaPressed(
    runtimeContextPreference,
    runtimeContextDefaultMode,
  )

  runtimeToggleButton.setAttribute('aria-pressed', ariaPressed)
  applyRuntimeToggleButtonState(runtimeToggleButton, getRuntimeToggleVisualState(ariaPressed))
  runtimeToggleBadge.hidden = ariaPressed !== 'true' || runtimeErrorCount <= 0
  runtimeToggleButton.title = getRuntimeToggleTitle(ariaPressed, runtimeSummary)

  if (ariaPressed !== 'true') {
    runtimeContextSection.hidden = true
    updatePosition()
    return
  }

  const runtimeContextUi = createRuntimeContextUi(runtimeContext, options)
  runtimeContextSection.hidden = runtimeContextUi === null
  if (runtimeContextUi) {
    runtimeContextSection.appendChild(runtimeContextUi)
  }
  updatePosition()
}
