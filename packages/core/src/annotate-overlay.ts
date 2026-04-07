type SelectedTargetOverlayEntry = {
  id: string
  element: Element
  order: number
  state?: 'current' | 'saved'
  note?: string
  onActivate?: () => void
}

export type { SelectedTargetOverlayEntry }

import { createAnnotateOverlayDom } from './annotate-overlay-dom.js'
import {
  applyComposerRuntimeButtonState,
  applyOverlayState,
  clamp,
  createOverlayBox,
  formatOverlayNoteBadge,
  formatRuntimeErrorCount,
  getOverflowPenalty,
  getPlacementPreference,
  placePreview,
  type ComposerPlacement,
  type PlacementCandidate,
} from './annotate-overlay-helpers.js'

type ComposerOptions = {
  targetId?: string
  targetLabel: string
  targetMeta?: string
  note: string
  onOpenInEditor?: () => void
  canAttachScreenshotContext?: boolean
  screenshotContextEnabled?: boolean
  canAttachCssContext?: boolean
  cssContextEnabled?: boolean
  canAttachRuntimeContext?: boolean
  runtimeContextEnabled?: boolean
  runtimeContextSummary?: string
  runtimeErrorCount?: number
  saveLabel?: string
  onToggleScreenshotContext?: () => void
  onToggleCssContext?: () => void
  onToggleRuntimeContext?: () => void
  onUpdateNote?: (note: string) => void
  onSave?: () => void
  onCancel?: () => void
  onDelete?: () => void
}

export function createAnnotateOverlay(shadowRoot: ShadowRoot): {
  render(targets: SelectedTargetOverlayEntry[], composer?: ComposerOptions | null): void
  clear(): void
} {
  const readToken = (name: string, fallback: string): string =>
    getComputedStyle(shadowRoot.host).getPropertyValue(name).trim() || fallback

  const tokens = {
    surfaceFloating: () => readToken('--inspecto-surface-floating', 'rgba(20, 20, 22, 0.94)'),
    surfaceSubtle: () => readToken('--inspecto-surface-subtle', 'rgba(255, 255, 255, 0.035)'),
    surfaceHover: () => readToken('--inspecto-surface-hover', 'rgba(255, 255, 255, 0.08)'),
    borderSubtle: () => readToken('--inspecto-border-subtle', 'rgba(255, 255, 255, 0.08)'),
    borderFocus: () => readToken('--inspecto-border-focus', 'rgba(93, 82, 243, 0.95)'),
    textPrimary: () => readToken('--inspecto-text-primary', 'rgba(255, 255, 255, 0.9)'),
    textSecondary: () => readToken('--inspecto-text-secondary', 'rgba(255, 255, 255, 0.72)'),
    textTertiary: () => readToken('--inspecto-text-tertiary', 'rgba(255, 255, 255, 0.46)'),
    accentPrimary: () => readToken('--inspecto-accent-primary', '#5d52f3'),
    accentPrimaryStrong: () => readToken('--inspecto-accent-primary-strong', '#4639d7'),
    shadowFloating: () =>
      readToken('--inspecto-shadow-floating', '0 20px 48px rgba(0, 0, 0, 0.28)'),
    shadowAccent: () => readToken('--inspecto-shadow-accent', '0 8px 18px rgba(79, 70, 229, 0.28)'),
    radiusSm: () => readToken('--inspecto-radius-sm', '12px'),
    radiusMd: () => readToken('--inspecto-radius-md', '14px'),
    radiusLg: () => readToken('--inspecto-radius-lg', '18px'),
    radiusXl: () => readToken('--inspecto-radius-xl', '20px'),
    radiusPill: () => readToken('--inspecto-radius-pill', '999px'),
  }

  const {
    layer,
    composer,
    composerHeaderTitle,
    composerHeaderMeta,
    composerOpenButton,
    composerScreenshotButton,
    composerCssButton,
    composerRuntimeButton,
    composerRuntimeBadge,
    composerInput,
    composerActions,
    cancelButton,
    deleteButton,
    addButton,
    preview,
  } = createAnnotateOverlayDom(shadowRoot, tokens)
  const boxes = new Map<string, HTMLDivElement>()
  let isComposerFocused = false
  let activeComposerTargetId: string | null = null
  let activeComposerPlacement: ComposerPlacement | null = null

  composerInput.addEventListener('focus', () => {
    isComposerFocused = true
  })
  composerInput.addEventListener('blur', () => {
    isComposerFocused = false
  })
  composerActions.addEventListener('focusin', () => {
    isComposerFocused = true
  })
  composerActions.addEventListener('focusout', () => {
    isComposerFocused = false
  })

  function placeComposer(target: SelectedTargetOverlayEntry, preservePlacement: boolean): void {
    const rect = target.element.getBoundingClientRect()
    const viewportLeft = 16
    const viewportTop = 16
    const viewportRight = window.innerWidth - 16
    const viewportBottom = window.innerHeight - 16
    const gap = 14
    const fallbackWidth = 340
    const fallbackHeight = 240
    const composerRect = composer.getBoundingClientRect()
    const composerWidth = Math.max(240, Math.min(fallbackWidth, window.innerWidth - 32))
    const measuredHeight = composerRect.height
    const composerHeight =
      measuredHeight > 0 && measuredHeight < 360 ? measuredHeight : fallbackHeight
    const targetLeft = rect.left
    const targetRight = rect.right
    const targetTop = rect.top
    const targetBottom = rect.bottom
    const targetCenterX = targetLeft + rect.width / 2
    const targetCenterY = targetTop + rect.height / 2
    const candidates: PlacementCandidate[] = [
      {
        side: 'below',
        left: targetCenterX - composerWidth / 2,
        top: targetBottom + gap,
      },
      {
        side: 'right',
        left: targetRight + gap,
        top: targetCenterY - composerHeight / 2,
      },
      {
        side: 'left',
        left: targetLeft - composerWidth - gap,
        top: targetCenterY - composerHeight / 2,
      },
      {
        side: 'above',
        left: targetCenterX - composerWidth / 2,
        top: targetTop - composerHeight - gap,
      },
    ]

    const ranked = candidates
      .map(candidate => {
        const overflowPenalty = getOverflowPenalty(
          candidate,
          composerWidth,
          composerHeight,
          viewportLeft,
          viewportTop,
          viewportRight,
          viewportBottom,
        )
        const preferencePenalty = getPlacementPreference(candidate.side)
        const previousSideBonus =
          preservePlacement && activeComposerPlacement === candidate.side ? -30 : 0

        return {
          candidate,
          score: overflowPenalty * 1000 + preferencePenalty + previousSideBonus,
        }
      })
      .sort((a, b) => a.score - b.score)

    const chosen = ranked[0]!.candidate
    activeComposerPlacement = chosen.side

    const left = clamp(chosen.left, viewportLeft, viewportRight - composerWidth)
    const top = clamp(chosen.top, viewportTop, viewportBottom - composerHeight)

    composer.style.left = `${left}px`
    composer.style.top = `${top}px`
  }

  function render(
    targets: SelectedTargetOverlayEntry[],
    composerOptions?: ComposerOptions | null,
  ): void {
    const nextIds = new Set(targets.map(target => target.id))

    for (const [id, box] of boxes) {
      if (!nextIds.has(id)) {
        box.remove()
        boxes.delete(id)
      }
    }

    for (const target of targets) {
      const rect = target.element.getBoundingClientRect()
      const scrollX = window.scrollX
      const scrollY = window.scrollY
      let box = boxes.get(target.id)
      if (!box) {
        box = createOverlayBox(tokens)
        boxes.set(target.id, box)
      }
      applyOverlayState(box, target.state ?? 'current', tokens)
      box.style.left = `${scrollX + rect.left}px`
      box.style.top = `${scrollY + rect.top}px`
      box.style.width = `${rect.width}px`
      box.style.height = `${rect.height}px`

      const badge = box.querySelector('[data-inspecto-annotate-overlay-order]') as HTMLDivElement
      const noteBadge = box.querySelector('[data-inspecto-annotate-overlay-note]') as HTMLDivElement
      badge.textContent = String(target.order)

      if ((target.state ?? 'current') === 'saved') {
        const trimmedNote = target.note?.trim() ?? ''
        const hasNote = trimmedNote.length > 0
        noteBadge.style.display = hasNote ? 'block' : 'none'
        noteBadge.textContent = hasNote ? formatOverlayNoteBadge(trimmedNote) : ''
        box.style.cursor = 'pointer'
        box.onmouseenter = () => {
          badge.textContent = '✎'
          if (hasNote) {
            preview.textContent = trimmedNote
            preview.style.display = 'block'
            placePreview(preview, target)
          }
        }
        box.onmouseleave = () => {
          badge.textContent = String(target.order)
          preview.style.display = 'none'
          preview.textContent = ''
        }
        box.onclick = () => target.onActivate?.()
      } else {
        noteBadge.style.display = 'none'
        noteBadge.textContent = ''
        box.style.cursor = 'default'
        box.onmouseenter = null
        box.onmouseleave = null
        box.onclick = null
      }

      if (box.parentElement !== layer) {
        layer.appendChild(box)
      }
    }

    if (targets.length > 0 && composerOptions) {
      const targetChanged =
        activeComposerTargetId !== (composerOptions.targetId ?? targets[0]?.id ?? null)
      const composerTarget =
        targets.find(target => (target.state ?? 'current') === 'current') ?? targets[0]!
      activeComposerTargetId = composerOptions.targetId ?? targets[0]?.id ?? null
      composerHeaderTitle.textContent = composerOptions.targetLabel
      composerHeaderMeta.textContent = composerOptions.targetMeta ?? ''
      composerHeaderMeta.style.display = composerOptions.targetMeta ? '' : 'none'
      composerOpenButton.onclick = () => composerOptions.onOpenInEditor?.()
      composerScreenshotButton.style.display = composerOptions.canAttachScreenshotContext
        ? 'inline-flex'
        : 'none'
      composerScreenshotButton.setAttribute(
        'aria-pressed',
        composerOptions.screenshotContextEnabled ? 'true' : 'false',
      )
      composerScreenshotButton.dataset.visualState = composerOptions.screenshotContextEnabled
        ? 'active'
        : 'inactive'
      composerScreenshotButton.title = composerOptions.screenshotContextEnabled
        ? 'Screenshot context enabled'
        : 'Attach screenshot context'
      applyComposerRuntimeButtonState(
        composerScreenshotButton,
        tokens,
        composerOptions.screenshotContextEnabled === true,
      )
      composerScreenshotButton.onclick = () => composerOptions.onToggleScreenshotContext?.()
      composerCssButton.style.display = composerOptions.canAttachCssContext ? 'inline-flex' : 'none'
      composerCssButton.setAttribute(
        'aria-pressed',
        composerOptions.cssContextEnabled ? 'true' : 'false',
      )
      composerCssButton.dataset.visualState = composerOptions.cssContextEnabled
        ? 'active'
        : 'inactive'
      composerCssButton.title = composerOptions.cssContextEnabled
        ? 'CSS context enabled'
        : 'Attach CSS context'
      applyComposerRuntimeButtonState(
        composerCssButton,
        tokens,
        composerOptions.cssContextEnabled === true,
      )
      composerCssButton.onclick = () => composerOptions.onToggleCssContext?.()
      composerRuntimeButton.style.display = composerOptions.canAttachRuntimeContext
        ? 'inline-flex'
        : 'none'
      composerRuntimeButton.setAttribute(
        'aria-pressed',
        composerOptions.runtimeContextEnabled ? 'true' : 'false',
      )
      composerRuntimeButton.dataset.visualState = composerOptions.runtimeContextEnabled
        ? 'active'
        : 'inactive'
      composerRuntimeBadge.textContent = formatRuntimeErrorCount(
        composerOptions.runtimeErrorCount ?? 0,
      )
      composerRuntimeBadge.style.display =
        composerOptions.runtimeContextEnabled && (composerOptions.runtimeErrorCount ?? 0) > 0
          ? ''
          : 'none'
      composerRuntimeButton.title = composerOptions.runtimeContextEnabled
        ? composerOptions.runtimeErrorCount
          ? `Runtime context enabled • ${formatRuntimeErrorCount(composerOptions.runtimeErrorCount)} errors`
          : composerOptions.runtimeContextSummary
            ? `Runtime context enabled • ${composerOptions.runtimeContextSummary}`
            : 'Runtime context enabled'
        : composerOptions.runtimeErrorCount
          ? `Attach runtime context • ${formatRuntimeErrorCount(composerOptions.runtimeErrorCount)} errors`
          : 'Attach runtime context'
      applyComposerRuntimeButtonState(
        composerRuntimeButton,
        tokens,
        composerOptions.runtimeContextEnabled === true,
      )
      composerRuntimeButton.onclick = () => composerOptions.onToggleRuntimeContext?.()
      if ((targetChanged || !isComposerFocused) && composerInput.value !== composerOptions.note) {
        composerInput.value = composerOptions.note
      }
      composer.style.display = 'block'
      composer.style.opacity = '1'
      composer.style.transform = 'translate3d(0, 0, 0) scale(1)'
      placeComposer(composerTarget, !targetChanged)
      composerInput.oninput = () => composerOptions.onUpdateNote?.(composerInput.value)
      addButton.textContent = composerOptions.saveLabel ?? 'Save note'
      addButton.onclick = () => composerOptions.onSave?.()
      cancelButton.onclick = () => composerOptions.onCancel?.()
      deleteButton.style.display = composerOptions.onDelete ? 'inline-flex' : 'none'
      deleteButton.onclick = () => composerOptions.onDelete?.()
      return
    }

    composer.style.display = 'none'
    composer.style.opacity = '0'
    composer.style.transform = 'translate3d(0, 4px, 0) scale(0.985)'
    activeComposerTargetId = null
    activeComposerPlacement = null
    composerInput.value = ''
    composerInput.oninput = null
    addButton.textContent = 'Save note'
    addButton.onclick = null
    cancelButton.onclick = null
    composerOpenButton.onclick = null
    composerScreenshotButton.style.display = 'none'
    composerScreenshotButton.onclick = null
    composerCssButton.style.display = 'none'
    composerCssButton.onclick = null
    composerCssButton.setAttribute('aria-pressed', 'false')
    composerCssButton.dataset.visualState = 'inactive'
    composerCssButton.title = 'Attach CSS context'
    applyComposerRuntimeButtonState(composerCssButton, tokens, false)
    composerRuntimeButton.style.display = 'none'
    composerRuntimeButton.onclick = null
    deleteButton.style.display = 'none'
    deleteButton.onclick = null
    preview.style.display = 'none'
    preview.textContent = ''
  }

  function clear(): void {
    layer.replaceChildren()
    boxes.clear()
    composer.style.display = 'none'
    composer.style.opacity = '0'
    composer.style.transform = 'translate3d(0, 4px, 0) scale(0.985)'
    activeComposerTargetId = null
    activeComposerPlacement = null
    composerInput.value = ''
    addButton.textContent = 'Save note'
    composerOpenButton.onclick = null
    composerScreenshotButton.style.display = 'none'
    composerScreenshotButton.onclick = null
    composerRuntimeButton.style.display = 'none'
    composerRuntimeButton.onclick = null
    deleteButton.style.display = 'none'
    deleteButton.onclick = null
    preview.style.display = 'none'
    preview.textContent = ''
  }

  return { render, clear }
}
