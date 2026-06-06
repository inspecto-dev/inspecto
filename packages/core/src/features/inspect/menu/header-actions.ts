type SyncCssToggleButtonInput = {
  headerActions: HTMLElement
  cssToggleButton: HTMLButtonElement
  runtimeToggleButton: HTMLButtonElement
  openButton: HTMLButtonElement
  canAttachCssContext: boolean
}

type SyncRuntimeToggleButtonInput = {
  headerActions: HTMLElement
  runtimeToggleButton: HTMLButtonElement
  openButton: HTMLButtonElement
  canAttachRuntimeContext: boolean
}

export function syncCssToggleButton({
  headerActions,
  cssToggleButton,
  runtimeToggleButton,
  openButton,
  canAttachCssContext,
}: SyncCssToggleButtonInput): void {
  cssToggleButton.hidden = !canAttachCssContext
  if (!canAttachCssContext) {
    cssToggleButton.remove()
    return
  }

  if (headerActions.contains(cssToggleButton)) return

  const referenceNode = headerActions.contains(runtimeToggleButton)
    ? runtimeToggleButton
    : headerActions.contains(openButton)
      ? openButton
      : null

  if (referenceNode) {
    headerActions.insertBefore(cssToggleButton, referenceNode)
    return
  }

  headerActions.appendChild(cssToggleButton)
}

export function syncRuntimeToggleButton({
  headerActions,
  runtimeToggleButton,
  openButton,
  canAttachRuntimeContext,
}: SyncRuntimeToggleButtonInput): void {
  runtimeToggleButton.hidden = !canAttachRuntimeContext
  if (!canAttachRuntimeContext) {
    runtimeToggleButton.remove()
    return
  }

  if (headerActions.contains(runtimeToggleButton)) return

  const referenceNode = headerActions.contains(openButton) ? openButton : null
  if (referenceNode) {
    headerActions.insertBefore(runtimeToggleButton, referenceNode)
    return
  }

  headerActions.appendChild(runtimeToggleButton)
}
