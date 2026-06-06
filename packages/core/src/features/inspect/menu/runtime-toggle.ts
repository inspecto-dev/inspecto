export type RuntimeContextDefaultMode = 'off' | 'all-on' | 'mixed'
export type RuntimeToggleAriaPressed = 'true' | 'false' | 'mixed'
export type RuntimeToggleVisualState = 'inactive' | 'mixed' | 'active'

export function getRuntimeToggleAriaPressed(
  preference: boolean | null,
  defaultMode: RuntimeContextDefaultMode,
): RuntimeToggleAriaPressed {
  if (preference !== null) return preference ? 'true' : 'false'
  if (defaultMode === 'mixed') return 'mixed'
  if (defaultMode === 'all-on') return 'true'
  return 'false'
}

export function getRuntimeToggleVisualState(
  ariaPressed: RuntimeToggleAriaPressed,
): RuntimeToggleVisualState {
  if (ariaPressed === 'true') return 'active'
  if (ariaPressed === 'mixed') return 'mixed'
  return 'inactive'
}

export function applyRuntimeToggleButtonState(
  button: HTMLElement,
  visualState: RuntimeToggleVisualState,
): void {
  button.dataset.visualState = visualState

  if (visualState === 'active') {
    button.style.background = 'var(--inspecto-accent-primary)'
    button.style.borderColor = 'transparent'
    button.style.color = '#ffffff'
    button.style.boxShadow = 'var(--inspecto-shadow-accent)'
    return
  }

  button.style.background = 'var(--inspecto-surface-subtle)'
  button.style.borderColor = 'var(--inspecto-border-subtle)'
  button.style.color = 'var(--inspecto-text-secondary)'
  button.style.boxShadow = 'none'
}
