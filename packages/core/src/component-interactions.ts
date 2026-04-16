import { showIntentMenu } from './menu.js'
import { openFile } from './http.js'
import { ATTR_NAME, findInspectable, parseAttrValue } from './component-utils.js'
import { createRuntimeContextEnvelope, selectRuntimeEvidence } from './runtime-context.js'
import { captureElementScreenshot } from './screenshot-context.js'
import type { SourceLocation } from '@inspecto-dev/types'

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
  options: {
    screenshotContext?: { enabled?: boolean }
  }
  runtimeContextCollector: {
    snapshot(): { records: unknown[] }
  }
  updateLauncherEye(): void
  isInspectorActive(e: MouseEvent): boolean
  markTargetInAnnotateSession(element: Element, location: SourceLocation): void
  addTargetToCurrentAnnotation(element: Element, location: SourceLocation): void
  shouldQuickJumpOnTrigger(e: MouseEvent): boolean
  openInspectMenu(
    loc: SourceLocation,
    clientX: number,
    clientY: number,
    targetElement: Element,
  ): void
  renderAnnotateSelectionOverlay(): void
  describeElement(element: Element): string
  getRuntimeContextLimits(): {
    maxRuntimeErrors?: number
    maxFailedRequests?: number
  }
  captureCssContextPromptForElement(element: Element, location: SourceLocation): string | null
}

function asInteractionContext(ctx: unknown): InteractionContext {
  return ctx as InteractionContext
}

export function handleMouseMove(ctx: unknown, event: MouseEvent): void {
  const state = asInteractionContext(ctx)
  state.lastPointerX = event.clientX
  state.lastPointerY = event.clientY
  state.updateLauncherEye()

  if (state.cleanupMenu !== null) {
    // Determine if the click target is within a dialog or modal
    const eventTarget = event.target as HTMLElement | null
    if (eventTarget) {
      if (
        eventTarget.closest(
          '[role="dialog"], [role="menu"], [role="tooltip"], [role="presentation"], [role="listbox"], [data-radix-popper-content-wrapper], [data-radix-focus-guard]',
        )
      ) {
        return
      }
    }
    state.overlay.hide()
    return
  }

  const isActive = state.isInspectorActive(event)
  if (!isActive) {
    state.overlay.hide()
    return
  }

  const target = findInspectable(event.target as Element)
  if (!target) {
    state.overlay.hide()
    return
  }

  const attrValue = target.getAttribute(ATTR_NAME)!
  const loc = parseAttrValue(attrValue)
  const label = loc ? `${loc.file.split('/').pop() ?? ''}:${loc.line}` : attrValue

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
    // Determine if the click target is within a dialog or modal
    const eventTarget = event.target as HTMLElement | null
    if (eventTarget) {
      if (
        eventTarget.closest(
          '[role="dialog"], [role="menu"], [role="tooltip"], [role="presentation"], [role="listbox"], [data-radix-popper-content-wrapper], [data-radix-focus-guard]',
        )
      ) {
        return
      }
    }
    return
  }
  if (!state.isInspectorActive(event)) return

  const target = findInspectable(event.target as Element)
  if (!target) return

  if (state.mode === 'annotate' && state.annotateCapturePaused) return

  event.preventDefault()
  event.stopPropagation()

  const attrValue = target.getAttribute(ATTR_NAME)!
  const loc = parseAttrValue(attrValue)
  if (!loc) return

  if (state.mode === 'annotate') {
    if (state.annotateQuickCaptureEnabled) {
      state.markTargetInAnnotateSession(target, loc)
    } else {
      state.addTargetToCurrentAnnotation(target, loc)
    }
    return
  }

  if (state.shouldQuickJumpOnTrigger(event)) {
    state.overlay.hide()
    state.cleanupMenu = null
    void openFile(loc)
    return
  }

  state.overlay.hide()
  state.openInspectMenu(loc, event.clientX, event.clientY, target)
}

export function handleKeyDown(ctx: unknown, event: KeyboardEvent): void {
  const state = asInteractionContext(ctx)
  if (event.key === 'Escape') {
    state.cleanupMenu?.()
    state.overlay.hide()
  }
  state.updateLauncherEye()
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
      targetLabel: state.describeElement(targetElement),
      getRuntimeContext: targetLocation =>
        createRuntimeContextEnvelope(
          selectRuntimeEvidence(
            state.runtimeContextCollector.snapshot().records as never[],
            targetLocation,
            state.getRuntimeContextLimits(),
          ),
        ),
      captureScreenshotContext: () => captureElementScreenshot(targetElement),
      captureCssContextPrompt: () => state.captureCssContextPromptForElement(targetElement, loc),
      canAttachScreenshotContext: state.options.screenshotContext?.enabled === true,
    },
  )
}
