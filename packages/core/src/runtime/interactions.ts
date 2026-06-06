import { showIntentMenu } from '../features/inspect/menu/index.js'
import { openFile } from '../transport/http-client.js'
import { findInspectable, getInspectableLocation } from '../shared/component-utils.js'
import {
  createRuntimeContextEnvelope,
  selectRuntimeEvidence,
} from '../features/evidence/runtime-context/index.js'
import {
  addTargetToCurrentAnnotation,
  describeElement,
  markTargetInAnnotateSession,
} from '../features/annotate/targets/index.js'
import { captureCssContextPromptForElement, getRuntimeContextLimits } from './evidence.js'
import { isFloatingUiEventTarget } from './interaction-targets.js'
import { setPaused, shouldQuickJumpOnTrigger, updateLauncherEye } from './launcher.js'
import { isInspectorActive } from './mode-ui.js'
import type { InspectorOptions, SourceLocation } from '@inspecto-dev/types'

type InteractionOptions = InspectorOptions & {
  mode?: 'inspect' | 'annotate'
}

type InteractionContext = {
  lastPointerX: number
  lastPointerY: number
  mode: 'inspect' | 'annotate'
  disabled: boolean
  active: boolean
  annotateCapturePaused: boolean
  annotateQuickCaptureEnabled: boolean
  pendingAnnotateViewportFrame: number | null
  overlay: { hide(): void; show(target: Element, label: string): void }
  shadowRootEl: ShadowRoot
  style: CSSStyleDeclaration
  cleanupMenu: (() => void) | null
  options: InteractionOptions
  runtimeContextCollector: {
    snapshot(): { records: unknown[] }
  }
  renderAnnotateSelectionOverlay(): void
}

function asInteractionContext(ctx: unknown): InteractionContext {
  return ctx as InteractionContext
}

export function handleMouseMove(ctx: unknown, event: MouseEvent): void {
  const state = asInteractionContext(ctx)
  state.lastPointerX = event.clientX
  state.lastPointerY = event.clientY
  updateLauncherEye(state)

  if (state.cleanupMenu !== null) {
    if (isFloatingUiEventTarget(event.target)) return
    state.overlay.hide()
    return
  }

  const isActive = isInspectorActive(state, event)
  if (!isActive) {
    state.overlay.hide()
    return
  }

  const target = findInspectable(event.target as Element)
  if (!target) {
    state.overlay.hide()
    return
  }

  const loc = getInspectableLocation(target)
  const label = loc ? `${loc.file.split('/').pop() ?? ''}:${loc.line}` : ''

  if (state.mode === 'annotate' && state.annotateCapturePaused) {
    state.overlay.hide()
    return
  }

  state.overlay.show(target, label)
  event.stopPropagation()
}

export function handleTrigger(ctx: unknown, event: MouseEvent): void {
  const state = asInteractionContext(ctx)
  if (state.cleanupMenu !== null) {
    if (isFloatingUiEventTarget(event.target)) return
    return
  }
  if (!isInspectorActive(state, event)) return

  const target = findInspectable(event.target as Element)
  if (!target) return

  if (state.mode === 'annotate' && state.annotateCapturePaused) return

  event.preventDefault()
  event.stopPropagation()

  const loc = getInspectableLocation(target)
  if (!loc) return

  if (state.mode === 'annotate') {
    if (state.annotateQuickCaptureEnabled) {
      markTargetInAnnotateSession(state, target, loc)
    } else {
      addTargetToCurrentAnnotation(state, target, loc)
    }
    return
  }

  if (shouldQuickJumpOnTrigger(state, event)) {
    state.overlay.hide()
    state.cleanupMenu = null
    void openFile(loc)
    return
  }

  state.overlay.hide()
  openInspectMenu(state, loc, event.clientX, event.clientY, target)
}

export function handleKeyDown(ctx: unknown, event: KeyboardEvent): void {
  const state = asInteractionContext(ctx)
  if (event.key === 'Escape') {
    if (state.cleanupMenu !== null) {
      state.cleanupMenu()
    } else if (!state.disabled) {
      setPaused(state, true)
    }
    state.overlay.hide()
  }
  updateLauncherEye(state)
}

export function handleViewportChange(ctx: unknown): void {
  const state = asInteractionContext(ctx)
  if (state.mode !== 'annotate') return
  if (
    !(state as { annotateSession?: { current?: { target?: unknown } } }).annotateSession?.current
      ?.target
  )
    return
  if (state.pendingAnnotateViewportFrame !== null) return
  state.pendingAnnotateViewportFrame = requestAnimationFrame(() => {
    state.pendingAnnotateViewportFrame = null
    state.renderAnnotateSelectionOverlay()
  })
}

export function openInspectMenu(
  ctx: unknown,
  loc: SourceLocation,
  clientX: number,
  clientY: number,
  targetElement: Element,
): void {
  const state = asInteractionContext(ctx)
  state.cleanupMenu?.()
  state.style.pointerEvents = 'auto'

  state.cleanupMenu = showIntentMenu(
    state.shadowRootEl,
    loc,
    clientX,
    clientY,
    state.options,
    () => {
      state.style.pointerEvents = 'none'
      state.cleanupMenu = null
    },
    {
      targetLabel: describeElement(state, targetElement),
      getRuntimeContext: targetLocation =>
        createRuntimeContextEnvelope(
          selectRuntimeEvidence(
            state.runtimeContextCollector.snapshot().records as never[],
            targetLocation,
            getRuntimeContextLimits(state),
          ),
        ),
      captureCssContextPrompt: () => captureCssContextPromptForElement(state, targetElement, loc),
    },
  )
}
