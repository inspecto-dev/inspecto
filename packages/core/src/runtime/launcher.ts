import type { HotKeys, IdeType } from '@inspecto-dev/types'
import { badgeClass } from '../shared/styles/index.js'
import { getDeepActiveElement, hotKeysHeld } from '../shared/component-utils.js'
import { createLauncherDom, getLauncherDomRefs } from './launcher-dom.js'
import { createLauncherDragController } from './launcher-drag.js'
import { getLauncherViewState, shouldShowInspectMode } from './launcher-view-state.js'

type LauncherContext = {
  options: { hotKeys?: HotKeys }
  serverHotKeys: HotKeys | null
  active: boolean
  disabled: boolean
  mode: 'inspect' | 'annotate'
  ide: IdeType
  ideConnected: boolean
  ideConnectionKnown: boolean
  deliveryMode: 'ide' | 'mcp'
  launcherPanelOpen: boolean
  badge: HTMLDivElement
  shadowRootEl: ShadowRoot
  lastPointerX: number
  lastPointerY: number
  cleanupMenu: (() => void) | null
  overlay: { hide(): void }
  prePauseState: { active: boolean; mode: 'inspect' | 'annotate' }
  updateBadgeContent(): void
  setMode(mode: 'inspect' | 'annotate'): void
  syncRuntimeContextCapture(): void
  renderAnnotateSelectionOverlay(): void
}

function asLauncherContext(ctx: unknown): LauncherContext {
  return ctx as LauncherContext
}

export function getEffectiveHotKeys(ctx: unknown): HotKeys {
  const state = asLauncherContext(ctx)
  if (state.options.hotKeys !== undefined) return state.options.hotKeys
  if (state.serverHotKeys !== null) return state.serverHotKeys
  return 'alt'
}

export function getHotKeyLabel(ctx: unknown): string {
  const hotKeys = getEffectiveHotKeys(ctx)
  if (hotKeys === false) return 'Disabled'

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  const keys = hotKeys.split('+').map(k => k.trim().toLowerCase())
  const displayKeys = keys.map(k => {
    if (k === 'alt' || k === 'option') return isMac ? '⌥' : 'Alt'
    if (k === 'cmd' || k === 'meta' || k === 'win' || k === 'command') return isMac ? '⌘' : 'Win'
    if (k === 'ctrl' || k === 'control') return isMac ? '⌃' : 'Ctrl'
    if (k === 'shift') return isMac ? '⇧' : 'Shift'
    return k.charAt(0).toUpperCase() + k.slice(1)
  })

  return displayKeys.join(' + ')
}

export function createBadge(ctx: unknown): HTMLDivElement {
  const state = asLauncherContext(ctx)
  const { badge: btn, inspectButton, annotateButton, pauseButton } = createLauncherDom()

  inspectButton.addEventListener('click', event => {
    event.stopPropagation()
    if (state.disabled) setPaused(state, false)
    state.active = true
    state.setMode('inspect')
    state.launcherPanelOpen = false
    state.updateBadgeContent()
  })

  annotateButton.addEventListener('click', event => {
    event.stopPropagation()
    if (state.disabled) setPaused(state, false)
    state.active = true
    state.setMode('annotate')
    state.launcherPanelOpen = false
    state.updateBadgeContent()
  })

  pauseButton.addEventListener('click', event => {
    event.stopPropagation()
    setPaused(state, !state.disabled)
  })

  const dragController = createLauncherDragController(btn)
  dragController.attach()

  btn.addEventListener('click', event => {
    if (dragController.isDragging()) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if ((event.target as Element).closest?.(`[data-inspecto-launcher-action]`)) return
    state.launcherPanelOpen = !state.launcherPanelOpen
    state.updateBadgeContent()
  })

  state.shadowRootEl.appendChild(btn)
  updateLauncherEye(state)

  // Wait for two frames to ensure styles are applied before making it visible
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      btn.style.visibility = ''
    })
  })

  return btn
}

export function setPaused(ctx: unknown, value: boolean): void {
  const state = asLauncherContext(ctx)
  if (value) {
    state.prePauseState = {
      active: state.active,
      mode: state.mode,
    }
  }

  state.disabled = value
  state.launcherPanelOpen = false
  if (value) {
    state.active = false
    state.overlay.hide()
    state.cleanupMenu?.()
    state.cleanupMenu = null
  } else {
    state.mode =
      state.prePauseState.mode === 'inspect' && !shouldShowInspectMode(state)
        ? 'annotate'
        : state.prePauseState.mode
    state.active = state.prePauseState.active
  }
  state.syncRuntimeContextCapture()
  state.updateBadgeContent()
}

export function dismiss(ctx: unknown): void {
  const state = asLauncherContext(ctx)
  state.badge.style.display = 'none'
  setActive(state, false)
}

export function updateBadgeContent(ctx: unknown): void {
  const state = asLauncherContext(ctx)
  const refs = getLauncherDomRefs(state.badge)
  if (!refs) return

  const updateModeButton = (button: HTMLButtonElement, active: boolean) => {
    button.classList.toggle('active', active)
    button.setAttribute('aria-pressed', String(active))
  }

  const effectiveHotKeys = getEffectiveHotKeys(state)
  const viewState = getLauncherViewState({
    active: state.active,
    disabled: state.disabled,
    mode: state.mode,
    ide: state.ide,
    ideConnected: state.ideConnected,
    ideConnectionKnown: state.ideConnectionKnown,
    deliveryMode: state.deliveryMode,
    launcherPanelOpen: state.launcherPanelOpen,
    hotKeysDisabled: effectiveHotKeys === false,
    hotKeyLabel: effectiveHotKeys === false ? '' : getHotKeyLabel(state),
  })

  state.badge.classList.toggle('active', viewState.badgeClasses.active)
  state.badge.classList.toggle('disabled', viewState.badgeClasses.disabled)
  refs.indicator.dataset.state = viewState.indicatorState

  refs.stateSpan.dataset.state = refs.indicator.dataset.state
  refs.stateSpan.hidden = false
  refs.titleSpan.textContent = viewState.title
  refs.stateSpan.textContent = viewState.stateLabel

  refs.panel.style.display = viewState.panelDisplay
  refs.pauseButton.setAttribute('aria-label', viewState.pauseLabel)
  refs.pauseButton.setAttribute('aria-pressed', viewState.pauseAriaPressed)
  refs.pauseButton.innerHTML = viewState.pauseIconSvg
  refs.pauseText.textContent = viewState.pauseLabel
  refs.hotkeyHint.textContent = viewState.hotkeyHint
  refs.inspectButton.style.display = viewState.inspectButtonDisplay
  refs.inspectNotice.style.display = viewState.inspectNoticeDisplay
  refs.inspectNotice.textContent = viewState.inspectNoticeText
  refs.annotateButton.style.display = viewState.annotateButtonDisplay

  updateModeButton(refs.inspectButton, viewState.inspectButtonActive)
  updateModeButton(refs.annotateButton, viewState.annotateButtonActive)
  updateLauncherEye(state)
}

export function setActive(ctx: unknown, value: boolean): void {
  const state = asLauncherContext(ctx)
  state.active = value
  if (!value) {
    state.launcherPanelOpen = false
  }
  state.syncRuntimeContextCapture()
  state.updateBadgeContent()

  if (!value) {
    state.overlay.hide()
    state.cleanupMenu?.()
    state.cleanupMenu = null
  }

  if (!value && state.mode === 'annotate') {
    state.renderAnnotateSelectionOverlay()
  }
}

export function shouldQuickJumpOnTrigger(ctx: unknown, event: MouseEvent): boolean {
  const state = asLauncherContext(ctx)
  if (state.mode !== 'inspect') return false
  if (event.type !== 'click') return false

  const hotKeys = getEffectiveHotKeys(state)
  if (hotKeys === false) return false
  return hotKeysHeld(event, hotKeys)
}

export function shouldInvertLauncherEye(ctx: unknown): boolean {
  const state = asLauncherContext(ctx)
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

export function updateLauncherEye(ctx: unknown): void {
  const state = asLauncherContext(ctx)
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
