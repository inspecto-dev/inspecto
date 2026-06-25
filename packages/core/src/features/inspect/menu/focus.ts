export function attachMenuFocusLifecycle(
  menu: HTMLElement,
  shadowRoot: ShadowRoot,
  input: HTMLInputElement,
): () => void {
  const teardownDocFocusGuards = (): void => {
    document.removeEventListener('focusin', onDocFocusIn, true)
    document.removeEventListener('focusout', onDocFocusOut, true)
  }

  const onDocFocusIn = (event: FocusEvent): void => {
    if (!menu.isConnected) {
      teardownDocFocusGuards()
      return
    }
    const path = event.composedPath?.() ?? []
    if (path.includes(menu)) {
      event.stopImmediatePropagation()
    }
  }

  const onDocFocusOut = (event: FocusEvent): void => {
    if (!menu.isConnected) {
      teardownDocFocusGuards()
      return
    }
    const related = event.relatedTarget as Node | null
    if (!related) return
    // In Shadow DOM, relatedTarget can be retargeted to the shadow host.
    if (related === shadowRoot.host) {
      event.stopImmediatePropagation()
      return
    }

    if (related instanceof Node && menu.contains(related)) {
      event.stopImmediatePropagation()
    }
  }

  document.addEventListener('focusin', onDocFocusIn, true)
  document.addEventListener('focusout', onDocFocusOut, true)

  const focusAskInput = (): void => {
    try {
      input.focus({ preventScroll: true })
    } catch {
      // Older DOM implementations may not support preventScroll.
      input.focus()
    }
  }

  const isAskInputFocused = (): boolean => {
    try {
      return shadowRoot.activeElement === input
    } catch {
      return false
    }
  }

  focusAskInput()
  const rafId = requestAnimationFrame(() => {
    if (!menu.isConnected) return
    if (!isAskInputFocused()) focusAskInput()
  })
  const focusTimeoutId = setTimeout(() => {
    if (!menu.isConnected) return
    if (!isAskInputFocused()) focusAskInput()
  }, 50)

  return () => {
    teardownDocFocusGuards()
    cancelAnimationFrame(rafId)
    clearTimeout(focusTimeoutId)
  }
}
