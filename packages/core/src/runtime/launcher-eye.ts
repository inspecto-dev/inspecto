import { badgeClass } from '../shared/styles/index.js'
import { getDeepActiveElement } from '../shared/component-utils.js'

type LauncherEyeContext = {
  badge?: HTMLDivElement | null
  active: boolean
  disabled: boolean
  mode: 'inspect' | 'annotate'
  launcherPanelOpen?: boolean
  cleanupMenu: (() => void) | null
  lastPointerX: number
  lastPointerY: number
  shadowRootEl: ShadowRoot
}

function shouldInvertLauncherEye(state: LauncherEyeContext): boolean {
  if (state.launcherPanelOpen || state.cleanupMenu !== null) return true
  const activeElement = (getDeepActiveElement(state.shadowRootEl) ??
    getDeepActiveElement(document)) as HTMLElement | null
  if (!(activeElement instanceof HTMLElement)) return false
  if (activeElement.isContentEditable) return true
  if (
    activeElement.matches('textarea, input, select') ||
    activeElement.closest('[data-inspecto-annotate-overlay-layer]') ||
    activeElement.closest('[data-inspecto-annotate-overlay-box]') ||
    activeElement.closest(`.${badgeClass}-panel`) ||
    activeElement.closest('[data-inspecto-launcher-action]')
  ) {
    return true
  }
  return false
}

export function updateLauncherEye(state: LauncherEyeContext): void {
  if (!state.badge) return
  const eyes = state.badge.querySelector(`.${badgeClass}-eyes`) as HTMLSpanElement | null
  if (!eyes) return

  const shouldShowEyes = !state.disabled
  eyes.hidden = !shouldShowEyes
  if (!shouldShowEyes) return

  const isActiveMode = state.active || state.mode === 'annotate'
  const invert = shouldInvertLauncherEye(state)
  eyes.dataset.state = isActiveMode ? 'active' : 'idle'
  eyes.dataset.mood = invert ? 'averted' : isActiveMode ? 'engaged' : 'idle'

  const pupils = Array.from(
    state.badge.querySelectorAll(`.${badgeClass}-eye-pupil`),
  ) as HTMLSpanElement[]
  if (pupils.length === 0) return

  const rect = eyes.getBoundingClientRect()
  const eyeCenterX = rect.left + rect.width / 2
  const eyeCenterY = rect.top + rect.height / 2
  const hasPointer = isActiveMode && (state.lastPointerX !== 0 || state.lastPointerY !== 0)
  let dx = hasPointer ? state.lastPointerX - eyeCenterX : 0
  let dy = hasPointer ? state.lastPointerY - eyeCenterY : 0
  if (invert) {
    dx *= -1
    dy *= -1
  }

  const distance = Math.hypot(dx, dy)
  const maxOffset = 4
  const scale = distance > 0 ? Math.min(maxOffset, distance) / distance : 0
  const transform = `translate(${(dx * scale).toFixed(2)}px, ${(dy * scale).toFixed(2)}px)`
  pupils.forEach(pupil => {
    pupil.style.transform = transform
  })
}
