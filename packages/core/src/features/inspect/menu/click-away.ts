const CLICK_AWAY_EXEMPT_SELECTOR =
  '[role="dialog"], [role="menu"], [role="tooltip"], [role="presentation"], [role="listbox"], [data-radix-popper-content-wrapper], [data-radix-focus-guard]'

export function attachMenuClickAway(menu: HTMLElement, onClickAway: () => void): () => void {
  const onDocClick = (event: MouseEvent): void => {
    const eventTarget = event.target as HTMLElement | null
    if (eventTarget?.closest(CLICK_AWAY_EXEMPT_SELECTOR)) return

    // Because the menu is inside a Shadow DOM, event.target from document's perspective
    // is usually the custom element host. composedPath is the reliable containment check.
    if (event.composedPath().includes(menu)) return
    onClickAway()
  }

  const timeoutId = setTimeout(() => {
    document.addEventListener('click', onDocClick, { capture: true })
  }, 0)

  return () => {
    clearTimeout(timeoutId)
    document.removeEventListener('click', onDocClick, { capture: true })
  }
}
