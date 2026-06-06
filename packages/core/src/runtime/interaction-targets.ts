const FLOATING_UI_SELECTOR = [
  '[role="dialog"]',
  '[role="menu"]',
  '[role="tooltip"]',
  '[role="presentation"]',
  '[role="listbox"]',
  '[data-radix-popper-content-wrapper]',
  '[data-radix-focus-guard]',
].join(', ')

export function isFloatingUiEventTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(FLOATING_UI_SELECTOR) !== null
}
