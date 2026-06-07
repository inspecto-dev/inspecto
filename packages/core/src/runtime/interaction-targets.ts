import { badgeClass } from '../shared/styles/classes.js'

const FLOATING_UI_SELECTOR = ['inspecto-overlay', `.${badgeClass}`].join(', ')

const THIRD_PARTY_FLOATING_SELECTOR = [
  '[role="dialog"]',
  '[role="menu"]',
  '[role="tooltip"]',
  '[role="presentation"]',
  '[role="listbox"]',
  '[data-radix-popper-content-wrapper]',
  '[data-radix-focus-guard]',
].join(', ')

export function isFloatingUiEventTarget(target: EventTarget | null): boolean {
  if (isInspectoChromeEventTarget(target)) return true
  return target instanceof Element && target.closest(THIRD_PARTY_FLOATING_SELECTOR) !== null
}

export function isInspectoChromeEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest(FLOATING_UI_SELECTOR) !== null) return true

  const root = target.getRootNode()
  return root instanceof ShadowRoot && root.host.closest(FLOATING_UI_SELECTOR) !== null
}
