import { createAnnotateOverlayDom } from './dom.js'
import { renderOverlayBoxes } from './boxes.js'
import { resolveComposerPlacement } from './composer-placement.js'
import { renderComposerControls, resetComposerControls } from './composer-controls.js'
import { t } from '../../../shared/i18n.js'
import { type ComposerPlacement } from './helpers.js'
import type { SelectedTargetOverlayEntry } from './types.js'

export type { SelectedTargetOverlayEntry } from './types.js'

type ComposerOptions = {
  targetId?: string
  targetLabel: string
  targetMeta?: string
  note: string
  onOpenInEditor?: () => void
  canAttachCssContext?: boolean
  cssContextEnabled?: boolean
  canAttachRuntimeContext?: boolean
  runtimeContextEnabled?: boolean
  runtimeContextSummary?: string
  runtimeErrorCount?: number
  saveLabel?: string
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
    successColor: () => readToken('--inspecto-success-color', '#10b981'),
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
  composerInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey) || event.isComposing) return

    event.preventDefault()
    event.stopPropagation()
    addButton.click()
  })
  composerActions.addEventListener('focusin', () => {
    isComposerFocused = true
  })
  composerActions.addEventListener('focusout', () => {
    isComposerFocused = false
  })

  function placeComposer(target: SelectedTargetOverlayEntry, preservePlacement: boolean): void {
    const placement = resolveComposerPlacement({
      targetRect: target.element.getBoundingClientRect(),
      composerHeight: composer.getBoundingClientRect().height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      previousPlacement: activeComposerPlacement,
      preservePlacement,
    })

    activeComposerPlacement = placement.side
    composer.style.left = `${placement.left}px`
    composer.style.top = `${placement.top}px`
  }

  function render(
    targets: SelectedTargetOverlayEntry[],
    composerOptions?: ComposerOptions | null,
  ): void {
    renderOverlayBoxes({ layer, boxes, preview, targets, tokens })

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
      renderComposerControls(
        { composerCssButton, composerRuntimeButton, composerRuntimeBadge },
        tokens,
        composerOptions,
      )
      if ((targetChanged || !isComposerFocused) && composerInput.value !== composerOptions.note) {
        composerInput.value = composerOptions.note
      }
      composer.style.display = 'block'
      composer.style.opacity = '1'
      composer.style.transform = 'translate3d(0, 0, 0) scale(1)'
      placeComposer(composerTarget, !targetChanged)
      composerInput.oninput = () => composerOptions.onUpdateNote?.(composerInput.value)
      addButton.textContent = composerOptions.saveLabel ?? t('annotate.saveNote')
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
    addButton.textContent = t('annotate.saveNote')
    addButton.onclick = null
    cancelButton.onclick = null
    composerOpenButton.onclick = null
    resetComposerControls(
      { composerCssButton, composerRuntimeButton, composerRuntimeBadge },
      tokens,
    )
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
    addButton.textContent = t('annotate.saveNote')
    composerOpenButton.onclick = null
    resetComposerControls(
      { composerCssButton, composerRuntimeButton, composerRuntimeBadge },
      tokens,
    )
    deleteButton.style.display = 'none'
    deleteButton.onclick = null
    preview.style.display = 'none'
    preview.textContent = ''
  }

  return { render, clear }
}
