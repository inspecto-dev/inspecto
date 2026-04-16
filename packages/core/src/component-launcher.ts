import type { HotKeys } from '@inspecto-dev/types'
import { badgeClass } from './styles.js'
import { getDeepActiveElement, hotKeysHeld } from './component-utils.js'

type LauncherContext = {
  options: { hotKeys?: HotKeys }
  serverHotKeys: HotKeys | null
  active: boolean
  disabled: boolean
  mode: 'inspect' | 'annotate'
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
  const btn = document.createElement('div')
  btn.className = badgeClass
  // Start with visibility hidden to prevent FOUC (flash of unstyled content)
  // before the shadow DOM styles are fully parsed by the browser.
  btn.style.visibility = 'hidden'

  const indicator = document.createElement('span')
  indicator.className = `${badgeClass}-indicator`
  indicator.dataset.inspectoLauncherIndicator = 'true'
  indicator.dataset.state = 'ready'

  const stateSpan = document.createElement('span')
  stateSpan.className = `${badgeClass}-state`
  stateSpan.dataset.inspectoLauncherState = 'true'
  stateSpan.hidden = true

  const titleSpan = document.createElement('span')
  titleSpan.className = `${badgeClass}-title`
  titleSpan.textContent = 'Inspecto'

  const eyes = document.createElement('span')
  eyes.className = `${badgeClass}-eyes`
  eyes.setAttribute('aria-hidden', 'true')
  const leftEye = document.createElement('span')
  leftEye.className = `${badgeClass}-eye`
  const leftPupil = document.createElement('span')
  leftPupil.className = `${badgeClass}-eye-pupil`
  leftEye.appendChild(leftPupil)
  const rightEye = document.createElement('span')
  rightEye.className = `${badgeClass}-eye`
  const rightPupil = document.createElement('span')
  rightPupil.className = `${badgeClass}-eye-pupil`
  rightEye.appendChild(rightPupil)
  eyes.append(leftEye, rightEye)

  const content = document.createElement('div')
  content.className = `${badgeClass}-content`
  const titleBlock = document.createElement('div')
  titleBlock.className = `${badgeClass}-label`

  const panel = document.createElement('div')
  panel.className = `${badgeClass}-panel`
  panel.dataset.inspectoLauncherPanel = 'true'

  const panelHeader = document.createElement('div')
  panelHeader.className = `${badgeClass}-panel-header`
  panelHeader.innerHTML =
    '<div data-inspecto-launcher-panel-title="true">Choose a mode</div><div data-inspecto-launcher-panel-subtitle="true">Your next page click will follow this mode.</div>'

  const modeGroup = document.createElement('div')
  modeGroup.className = `${badgeClass}-panel-group`

  const inspectBtn = document.createElement('button')
  inspectBtn.type = 'button'
  inspectBtn.className = `${badgeClass}-panel-button`
  inspectBtn.dataset.inspectoLauncherAction = 'inspect'
  inspectBtn.innerHTML =
    '<span data-inspecto-launcher-title="true">Inspect</span><span data-inspecto-launcher-description="true">Click one component to inspect or ask AI</span>'
  inspectBtn.addEventListener('click', event => {
    event.stopPropagation()
    if (state.disabled) setPaused(state, false)
    state.active = true
    state.setMode('inspect')
    state.launcherPanelOpen = false
    state.updateBadgeContent()
  })

  const annotateBtn = document.createElement('button')
  annotateBtn.type = 'button'
  annotateBtn.className = `${badgeClass}-panel-button`
  annotateBtn.dataset.inspectoLauncherAction = 'annotate'
  annotateBtn.innerHTML =
    '<span data-inspecto-launcher-title="true">Annotate</span><span data-inspecto-launcher-description="true">Capture notes across components, then Ask AI once</span>'
  annotateBtn.addEventListener('click', event => {
    event.stopPropagation()
    if (state.disabled) setPaused(state, false)
    state.active = true
    state.setMode('annotate')
    state.launcherPanelOpen = false
    state.updateBadgeContent()
  })

  const pauseBtn = document.createElement('button')
  pauseBtn.type = 'button'
  pauseBtn.className = `${badgeClass}-panel-button secondary`
  pauseBtn.dataset.inspectoLauncherAction = 'pause'
  pauseBtn.innerHTML =
    '<span data-inspecto-launcher-title="true">Pause selection</span><span data-inspecto-launcher-description="true">Use the page normally for a moment</span>'
  pauseBtn.addEventListener('click', event => {
    event.stopPropagation()
    setPaused(state, !state.disabled)
  })

  const hotkeyHint = document.createElement('div')
  hotkeyHint.className = `${badgeClass}-panel-hint`
  hotkeyHint.dataset.inspectoLauncherHint = 'hotkey'

  const utilityGroup = document.createElement('div')
  utilityGroup.className = `${badgeClass}-panel-group`
  utilityGroup.dataset.inspectoLauncherUtilityGroup = 'true'

  modeGroup.append(inspectBtn, annotateBtn)
  utilityGroup.append(pauseBtn, hotkeyHint)
  panel.append(panelHeader, modeGroup, utilityGroup)
  titleBlock.append(titleSpan, stateSpan)
  content.append(indicator, titleBlock)
  btn.append(content, eyes, panel)

  let isDragging = false
  let dragStartX = 0
  let dragStartY = 0
  let initialBadgeX = 0
  let initialBadgeY = 0

  const handleDragStart = (e: MouseEvent | TouchEvent) => {
    const target = e.target as Element
    if (
      target.closest(`.${badgeClass}-panel`) ||
      target.closest(`[data-inspecto-launcher-action]`)
    ) {
      return
    }

    if (e.type === 'mousedown' && (e as MouseEvent).button !== 0) return

    const clientX =
      e.type === 'touchstart' ? (e as TouchEvent).touches[0]!.clientX : (e as MouseEvent).clientX
    const clientY =
      e.type === 'touchstart' ? (e as TouchEvent).touches[0]!.clientY : (e as MouseEvent).clientY

    dragStartX = clientX
    dragStartY = clientY

    const rect = btn.getBoundingClientRect()
    initialBadgeX = rect.left
    initialBadgeY = rect.top

    isDragging = false

    document.addEventListener('mousemove', handleDragMove, { passive: false })
    document.addEventListener('mouseup', handleDragEnd)
    document.addEventListener('touchmove', handleDragMove, { passive: false })
    document.addEventListener('touchend', handleDragEnd)
  }

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    const clientX =
      e.type === 'touchmove' ? (e as TouchEvent).touches[0]!.clientX : (e as MouseEvent).clientX
    const clientY =
      e.type === 'touchmove' ? (e as TouchEvent).touches[0]!.clientY : (e as MouseEvent).clientY

    const dx = clientX - dragStartX
    const dy = clientY - dragStartY

    if (!isDragging && Math.hypot(dx, dy) > 5) {
      isDragging = true
      btn.style.transition = 'none'
    }

    if (isDragging) {
      e.preventDefault()
      const maxX = window.innerWidth - btn.offsetWidth
      const maxY = window.innerHeight - btn.offsetHeight

      let newX = initialBadgeX + dx
      let newY = initialBadgeY + dy

      newX = Math.max(0, Math.min(newX, maxX))
      newY = Math.max(0, Math.min(newY, maxY))

      btn.style.bottom = 'auto'
      btn.style.right = 'auto'
      btn.style.left = `${newX}px`
      btn.style.top = `${newY}px`
    }
  }

  const handleDragEnd = () => {
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
    document.removeEventListener('touchmove', handleDragMove)
    document.removeEventListener('touchend', handleDragEnd)

    if (isDragging) {
      btn.style.transition = ''
      setTimeout(() => {
        isDragging = false
      }, 0)
    }
  }

  btn.addEventListener('mousedown', handleDragStart)
  btn.addEventListener('touchstart', handleDragStart, { passive: false })

  btn.addEventListener('click', event => {
    if (isDragging) {
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
    state.mode = state.prePauseState.mode
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
  const indicator = state.badge.querySelector(
    `[data-inspecto-launcher-indicator]`,
  ) as HTMLSpanElement | null
  const stateSpan = state.badge.querySelector(
    `[data-inspecto-launcher-state]`,
  ) as HTMLSpanElement | null
  const titleSpan = state.badge.querySelector(`.${badgeClass}-title`) as HTMLSpanElement | null
  const panel = state.badge.querySelector(`.${badgeClass}-panel`) as HTMLDivElement | null
  const inspectBtn = state.badge.querySelector(
    `[data-inspecto-launcher-action="inspect"]`,
  ) as HTMLButtonElement | null
  const annotateBtn = state.badge.querySelector(
    `[data-inspecto-launcher-action="annotate"]`,
  ) as HTMLButtonElement | null
  const pauseBtn = state.badge.querySelector(
    `[data-inspecto-launcher-action="pause"]`,
  ) as HTMLButtonElement | null
  const hotkeyHint = state.badge.querySelector(
    `[data-inspecto-launcher-hint="hotkey"]`,
  ) as HTMLDivElement | null

  if (
    !indicator ||
    !titleSpan ||
    !stateSpan ||
    !panel ||
    !inspectBtn ||
    !annotateBtn ||
    !pauseBtn ||
    !hotkeyHint
  ) {
    return
  }

  const updateModeButton = (button: HTMLButtonElement, active: boolean) => {
    button.classList.toggle('active', active)
    button.setAttribute('aria-pressed', String(active))
  }

  let stateLabel: string

  if (state.disabled) {
    stateLabel = 'Selection paused'
    indicator.dataset.state = 'paused'
    state.badge.classList.remove('active')
    state.badge.classList.add('disabled')
  } else if (state.mode === 'annotate') {
    stateLabel = 'Annotate mode'
    indicator.dataset.state = 'annotate'
    state.badge.classList.remove('disabled')
    state.badge.classList.add('active')
  } else if (state.active) {
    stateLabel = 'Inspect mode'
    indicator.dataset.state = 'inspect'
    state.badge.classList.remove('disabled')
    state.badge.classList.add('active')
  } else {
    stateLabel = 'Ready'
    indicator.dataset.state = 'ready'
    state.badge.classList.remove('active', 'disabled')
  }

  stateSpan.dataset.state = indicator.dataset.state
  stateSpan.hidden = false
  titleSpan.textContent = 'Inspecto'
  stateSpan.textContent = stateLabel

  panel.style.display = state.launcherPanelOpen ? 'flex' : 'none'
  pauseBtn.innerHTML = state.disabled
    ? '<span data-inspecto-launcher-title="true">Resume selection</span><span data-inspecto-launcher-description="true">Start capturing page clicks again</span>'
    : '<span data-inspecto-launcher-title="true">Pause selection</span><span data-inspecto-launcher-description="true">Use the page normally for a moment</span>'
  hotkeyHint.textContent =
    getEffectiveHotKeys(state) === false
      ? 'Hotkey disabled. Open the launcher to choose Inspect or Annotate.'
      : `Hotkey: ${getHotKeyLabel(state)} for quick jump`
  inspectBtn.style.display = state.disabled ? 'none' : 'inline-flex'
  annotateBtn.style.display = state.disabled ? 'none' : 'inline-flex'

  updateModeButton(inspectBtn, !state.disabled && state.active && state.mode === 'inspect')
  updateModeButton(annotateBtn, !state.disabled && state.active && state.mode === 'annotate')
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
