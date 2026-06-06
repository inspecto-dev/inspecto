import { t } from '../../../shared/i18n.js'
import { isFixUiIntent } from './helpers.js'
import { applyIconToggleButtonState } from './header.js'

type CssContextToggleController = {
  isEnabled(): boolean
}

export function createInspectMenuCssContextToggle(
  cssToggleButton: HTMLButtonElement,
): CssContextToggleController {
  let cssContextEnabled = false

  const applyCssToggleButtonState = () => {
    applyIconToggleButtonState(
      cssToggleButton,
      cssContextEnabled,
      t('menu.cssEnabled'),
      t('menu.attachCss'),
    )
  }

  applyCssToggleButtonState()
  cssToggleButton.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    cssContextEnabled = !cssContextEnabled
    applyCssToggleButtonState()
  })

  return {
    isEnabled: () => cssContextEnabled,
  }
}

export function resolveInspectMenuCssContextPrompt(input: {
  cssContextEnabled: boolean
  captureCssContextPrompt?: () => string | null
  intent?: { id: string; aiIntent?: string }
}): string | null {
  const shouldAttachCssContext =
    input.cssContextEnabled || Boolean(input.intent && isFixUiIntent(input.intent))
  if (!shouldAttachCssContext) return null

  try {
    return input.captureCssContextPrompt?.() ?? null
  } catch {
    return null
  }
}
