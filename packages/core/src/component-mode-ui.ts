import { createAnnotateSidebar } from './annotate-sidebar.js'
import type { AnnotateSidebarOptions } from './annotate-sidebar.js'
import type { HotKeys } from '@inspecto-dev/types'
import { hotKeysHeld } from './component-utils.js'

type ModeUiContext = {
  disabled: boolean
  active: boolean
  mode: 'inspect' | 'annotate'
  annotateCapturePaused: boolean
  annotateRuntimeContextEnabled: boolean
  annotateScreenshotContextEnabled: boolean
  annotateCssContextEnabled: boolean
  annotateSidebar: ReturnType<typeof createAnnotateSidebar> | null
  annotateOverlay: { clear(): void } | null
  shadowRootEl: ShadowRoot
  overlay: { hide(): void }
  cleanupMenu: (() => void) | null
  updateBadgeContent(): void
  getAnnotateSidebarOptions(): AnnotateSidebarOptions
  renderAnnotateSelectionOverlay(): void
  getEffectiveHotKeys(): HotKeys
}

function asModeUiContext(ctx: unknown): ModeUiContext {
  return ctx as ModeUiContext
}

export function syncModeUi(ctx: unknown): void {
  const state = asModeUiContext(ctx)
  if (!state.shadowRootEl) return

  state.updateBadgeContent()

  if (state.disabled) {
    state.overlay.hide()
    state.cleanupMenu?.()
    state.cleanupMenu = null
    state.annotateSidebar?.destroy()
    state.annotateSidebar = null
    state.annotateOverlay?.clear()
    return
  }

  if (state.mode === 'annotate') {
    state.overlay.hide()
    state.cleanupMenu?.()
    state.cleanupMenu = null
    mountAnnotateSidebar(state)
    updateAnnotateSidebar(state)
    state.renderAnnotateSelectionOverlay()
    return
  }

  state.annotateCapturePaused = false
  state.annotateRuntimeContextEnabled = false
  state.annotateScreenshotContextEnabled = false
  state.annotateCssContextEnabled = false
  state.annotateSidebar?.destroy()
  state.annotateSidebar = null
  state.annotateOverlay?.clear()
}

export function mountAnnotateSidebar(ctx: unknown): void {
  const state = asModeUiContext(ctx)
  if (state.annotateSidebar) return
  state.annotateSidebar = createAnnotateSidebar(
    state.shadowRootEl,
    state.getAnnotateSidebarOptions(),
  )
}

export function updateAnnotateSidebar(ctx: unknown): void {
  const state = asModeUiContext(ctx)
  state.annotateSidebar?.update(state.getAnnotateSidebarOptions())
}

export function isInspectorActive(ctx: unknown, event: MouseEvent): boolean {
  const state = asModeUiContext(ctx)
  if (state.disabled) return false
  if (state.mode === 'annotate') return true
  if (state.active) return true

  const hotKeys = state.getEffectiveHotKeys()
  if (hotKeys === false) return false
  return hotKeysHeld(event, hotKeys)
}

export function setupListeners(
  ctx: unknown,
  handlers: {
    onMouseMove: (e: MouseEvent) => void
    onClick: (e: MouseEvent) => void
    onContextMenu: (e: MouseEvent) => void
    onKeyDown: (e: KeyboardEvent) => void
    onFocusChange: () => void
    onViewportChange: () => void
  },
): void {
  document.addEventListener('mousemove', handlers.onMouseMove, true)
  document.addEventListener('click', handlers.onClick, true)
  document.addEventListener('contextmenu', handlers.onContextMenu, true)
  document.addEventListener('keydown', handlers.onKeyDown, true)
  document.addEventListener('focusin', handlers.onFocusChange, true)
  document.addEventListener('focusout', handlers.onFocusChange, true)
  document.addEventListener('scroll', handlers.onViewportChange, true)
  window.addEventListener('resize', handlers.onViewportChange)
}

export function teardownListeners(
  _ctx: unknown,
  handlers: {
    onMouseMove: (e: MouseEvent) => void
    onClick: (e: MouseEvent) => void
    onContextMenu: (e: MouseEvent) => void
    onKeyDown: (e: KeyboardEvent) => void
    onFocusChange: () => void
    onViewportChange: () => void
  },
): void {
  document.removeEventListener('mousemove', handlers.onMouseMove, true)
  document.removeEventListener('click', handlers.onClick, true)
  document.removeEventListener('contextmenu', handlers.onContextMenu, true)
  document.removeEventListener('keydown', handlers.onKeyDown, true)
  document.removeEventListener('focusin', handlers.onFocusChange, true)
  document.removeEventListener('focusout', handlers.onFocusChange, true)
  document.removeEventListener('scroll', handlers.onViewportChange, true)
  window.removeEventListener('resize', handlers.onViewportChange)
}
