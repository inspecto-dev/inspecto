import type { HotKeys, IdeType } from '@inspecto-dev/types'
import { createLauncherDom, getLauncherDomRefs } from './launcher-dom.js'
import { createLauncherDragController } from './launcher-drag.js'
import {
  formatHotKeyLabel,
  getEffectiveHotKeys as getEffectiveHotKeysValue,
  shouldQuickJumpOnTrigger as shouldQuickJumpOnTriggerValue,
} from './launcher-hotkeys.js'
import { updateLauncherEye as updateLauncherEyeElement } from './launcher-eye.js'
import { getLauncherPauseState } from './launcher-pause-state.js'
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
  return getEffectiveHotKeysValue(asLauncherContext(ctx))
}

export function getHotKeyLabel(ctx: unknown): string {
  return formatHotKeyLabel(getEffectiveHotKeys(ctx))
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
  const next = getLauncherPauseState({
    value,
    active: state.active,
    mode: state.mode,
    prePauseState: state.prePauseState,
    canUseInspectMode: shouldShowInspectMode(state),
  })

  state.prePauseState = next.prePauseState
  state.disabled = next.disabled
  state.launcherPanelOpen = next.launcherPanelOpen
  state.active = next.active
  state.mode = next.mode

  if (next.shouldHideOverlay) {
    state.overlay.hide()
  }
  if (next.shouldCleanupMenu) {
    state.cleanupMenu?.()
    state.cleanupMenu = null
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
  return shouldQuickJumpOnTriggerValue({
    mode: state.mode,
    hotKeys: getEffectiveHotKeys(state),
    event,
  })
}

export function updateLauncherEye(ctx: unknown): void {
  updateLauncherEyeElement(asLauncherContext(ctx))
}
