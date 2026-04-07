import { applyHeaderIconButtonStyles } from './styles.js'
import { bugIconSvg, screenshotIconSvg, cssIconSvg } from './icons.js'

export function createAnnotateOverlayDom(
  shadowRoot: ShadowRoot,
  tokens: {
    surfaceFloating(): string
    surfaceSubtle(): string
    surfaceHover(): string
    borderSubtle(): string
    borderFocus(): string
    textPrimary(): string
    textSecondary(): string
    textTertiary(): string
    accentPrimary(): string
    accentPrimaryStrong(): string
    shadowFloating(): string
    shadowAccent(): string
    radiusSm(): string
    radiusMd(): string
    radiusLg(): string
    radiusXl(): string
    radiusPill(): string
  },
) {
  const layer = document.createElement('div')
  layer.setAttribute('data-inspecto-annotate-overlay-layer', '')
  layer.style.position = 'absolute'
  layer.style.left = '0'
  layer.style.top = '0'
  layer.style.width = '0'
  layer.style.height = '0'
  layer.style.pointerEvents = 'none'
  layer.style.zIndex = '2147483645'

  const composer = document.createElement('div')
  composer.setAttribute('data-inspecto-annotate-composer', '')
  composer.style.position = 'fixed'
  composer.style.zIndex = '2147483646'
  composer.style.width = 'min(340px, calc(100vw - 32px))'
  composer.style.display = 'none'
  composer.style.boxSizing = 'border-box'
  composer.style.padding = '12px'
  composer.style.border = `1px solid ${tokens.borderSubtle()}`
  composer.style.borderRadius = tokens.radiusXl()
  composer.style.background = tokens.surfaceFloating()
  composer.style.color = tokens.textPrimary()
  composer.style.boxShadow = tokens.shadowFloating()
  composer.style.backdropFilter = 'blur(14px)'
  composer.style.pointerEvents = 'auto'
  composer.style.opacity = '0'
  composer.style.transform = 'translate3d(0, 4px, 0) scale(0.985)'
  composer.style.transition =
    'left 160ms cubic-bezier(0.22, 1, 0.36, 1), top 160ms cubic-bezier(0.22, 1, 0.36, 1), opacity 120ms ease, transform 160ms cubic-bezier(0.22, 1, 0.36, 1)'
  composer.style.willChange = 'left, top, opacity, transform'

  const composerHeader = document.createElement('div')
  composerHeader.setAttribute('data-inspecto-annotate-composer-header', '')
  composerHeader.style.display = 'flex'
  composerHeader.style.alignItems = 'center'
  composerHeader.style.gap = '10px'
  composerHeader.style.font =
    '500 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  composerHeader.style.color = tokens.textSecondary()
  composerHeader.style.marginBottom = '12px'

  const composerHeaderText = document.createElement('div')
  composerHeaderText.style.flex = '1'
  composerHeaderText.style.minWidth = '0'
  composerHeaderText.style.display = 'flex'
  composerHeaderText.style.flexDirection = 'column'
  composerHeaderText.style.gap = '2px'

  const composerHeaderTitle = document.createElement('div')
  composerHeaderTitle.style.whiteSpace = 'nowrap'
  composerHeaderTitle.style.overflow = 'hidden'
  composerHeaderTitle.style.textOverflow = 'ellipsis'
  composerHeaderTitle.style.color = tokens.textPrimary()

  const composerHeaderMeta = document.createElement('div')
  composerHeaderMeta.style.whiteSpace = 'nowrap'
  composerHeaderMeta.style.overflow = 'hidden'
  composerHeaderMeta.style.textOverflow = 'ellipsis'
  composerHeaderMeta.style.font =
    '500 10px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  composerHeaderMeta.style.color = tokens.textTertiary()

  composerHeaderText.append(composerHeaderTitle, composerHeaderMeta)

  const composerHeaderActions = document.createElement('div')
  composerHeaderActions.style.display = 'flex'
  composerHeaderActions.style.alignItems = 'center'
  composerHeaderActions.style.gap = '6px'

  const composerOpenButton = document.createElement('button')
  composerOpenButton.type = 'button'
  composerOpenButton.setAttribute('aria-label', 'Open in Editor')
  composerOpenButton.title = 'Open in Editor'
  composerOpenButton.textContent = '↗'
  composerOpenButton.style.appearance = 'none'
  composerOpenButton.style.cursor = 'pointer'
  applyHeaderIconButtonStyles(composerOpenButton)

  const composerScreenshotButton = document.createElement('button')
  composerScreenshotButton.type = 'button'
  composerScreenshotButton.setAttribute('aria-label', 'Attach screenshot context')
  composerScreenshotButton.title = 'Attach screenshot context'
  composerScreenshotButton.style.appearance = 'none'
  composerScreenshotButton.style.cursor = 'pointer'
  composerScreenshotButton.style.display = 'none'
  applyHeaderIconButtonStyles(composerScreenshotButton)
  composerScreenshotButton.innerHTML = screenshotIconSvg
  const screenshotSvgElement = composerScreenshotButton.querySelector('svg')
  if (screenshotSvgElement) {
    screenshotSvgElement.style.width = '18px'
    screenshotSvgElement.style.height = '18px'
  }

  const composerCssButton = document.createElement('button')
  composerCssButton.type = 'button'
  composerCssButton.setAttribute('aria-label', 'Attach CSS context')
  composerCssButton.title = 'Attach CSS context'
  composerCssButton.style.appearance = 'none'
  composerCssButton.style.cursor = 'pointer'
  composerCssButton.style.display = 'none'
  applyHeaderIconButtonStyles(composerCssButton)
  composerCssButton.innerHTML = cssIconSvg
  const cssSvgElement = composerCssButton.querySelector('svg')
  if (cssSvgElement) {
    cssSvgElement.style.width = '18px'
    cssSvgElement.style.height = '18px'
  }

  const composerRuntimeButton = document.createElement('button')
  composerRuntimeButton.type = 'button'
  composerRuntimeButton.setAttribute('aria-label', 'Attach runtime context')
  composerRuntimeButton.title = 'Attach runtime context'
  composerRuntimeButton.style.appearance = 'none'
  composerRuntimeButton.style.position = 'relative'
  composerRuntimeButton.style.cursor = 'pointer'
  composerRuntimeButton.style.display = 'none'
  applyHeaderIconButtonStyles(composerRuntimeButton)

  const composerRuntimeIcon = document.createElement('span')
  composerRuntimeIcon.innerHTML = bugIconSvg
  composerRuntimeIcon.style.display = 'inline-flex'
  composerRuntimeIcon.style.alignItems = 'center'
  composerRuntimeIcon.style.justifyContent = 'center'
  composerRuntimeIcon.style.lineHeight = '1'

  const composerRuntimeBadge = document.createElement('span')
  composerRuntimeBadge.dataset.runtimeErrorBadge = 'true'
  composerRuntimeBadge.style.position = 'absolute'
  composerRuntimeBadge.style.top = '-5px'
  composerRuntimeBadge.style.right = '-5px'
  composerRuntimeBadge.style.minWidth = '15px'
  composerRuntimeBadge.style.height = '15px'
  composerRuntimeBadge.style.padding = '0 4px'
  composerRuntimeBadge.style.borderRadius = tokens.radiusPill()
  composerRuntimeBadge.style.background = '#ef4444'
  composerRuntimeBadge.style.color = '#ffffff'
  composerRuntimeBadge.style.font =
    '700 9px/15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  composerRuntimeBadge.style.textAlign = 'center'
  composerRuntimeBadge.style.boxShadow = `0 0 0 2px ${tokens.surfaceFloating()}`
  composerRuntimeBadge.style.pointerEvents = 'none'
  composerRuntimeBadge.style.display = 'none'

  composerRuntimeButton.append(composerRuntimeIcon, composerRuntimeBadge)

  const composerInput = document.createElement('textarea')
  composerInput.placeholder = 'What should change for this component?'
  composerInput.style.width = '100%'
  composerInput.style.minHeight = '100px'
  composerInput.style.boxSizing = 'border-box'
  composerInput.style.padding = '16px'
  composerInput.style.border = `2px solid ${tokens.borderFocus()}`
  composerInput.style.borderRadius = tokens.radiusLg()
  composerInput.style.background = tokens.surfaceHover()
  composerInput.style.color = tokens.textPrimary()
  composerInput.style.font =
    '400 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  composerInput.style.outline = 'none'
  composerInput.style.resize = 'none'
  composerInput.style.marginBottom = '14px'
  composerInput.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.04)'

  const composerActions = document.createElement('div')
  composerActions.style.display = 'flex'
  composerActions.style.justifyContent = 'flex-end'
  composerActions.style.alignItems = 'center'
  composerActions.style.gap = '8px'

  const cancelButton = document.createElement('button')
  cancelButton.type = 'button'
  cancelButton.textContent = 'Cancel'
  cancelButton.style.appearance = 'none'
  cancelButton.style.border = 'none'
  cancelButton.style.background = 'transparent'
  cancelButton.style.color = tokens.textSecondary()
  cancelButton.style.font = '500 14px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  cancelButton.style.padding = '8px 10px'
  cancelButton.style.cursor = 'pointer'

  const deleteButton = document.createElement('button')
  deleteButton.type = 'button'
  deleteButton.textContent = 'Delete'
  deleteButton.style.appearance = 'none'
  deleteButton.style.border = 'none'
  deleteButton.style.background = 'transparent'
  deleteButton.style.color = 'rgba(248, 113, 113, 0.92)'
  deleteButton.style.font = '500 14px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  deleteButton.style.padding = '8px 10px'
  deleteButton.style.cursor = 'pointer'
  deleteButton.style.display = 'none'

  const addButton = document.createElement('button')
  addButton.type = 'button'
  addButton.textContent = 'Save note'
  addButton.style.appearance = 'none'
  addButton.style.border = 'none'
  addButton.style.borderRadius = tokens.radiusPill()
  addButton.style.background = `linear-gradient(180deg, ${tokens.accentPrimary()} 0%, ${tokens.accentPrimaryStrong()} 100%)`
  addButton.style.color = '#ffffff'
  addButton.style.font = '600 14px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  addButton.style.minHeight = '36px'
  addButton.style.padding = '0 18px'
  addButton.style.cursor = 'pointer'
  addButton.style.boxShadow = tokens.shadowAccent()

  composerHeaderActions.append(
    composerScreenshotButton,
    composerCssButton,
    composerRuntimeButton,
    composerOpenButton,
  )
  composerActions.append(deleteButton, cancelButton, addButton)
  composerHeader.append(composerHeaderText, composerHeaderActions)
  composer.append(composerHeader, composerInput, composerActions)

  const preview = document.createElement('div')
  preview.setAttribute('data-inspecto-annotate-preview', '')
  preview.style.position = 'absolute'
  preview.style.zIndex = '2147483646'
  preview.style.display = 'none'
  preview.style.maxWidth = 'min(260px, calc(100vw - 32px))'
  preview.style.padding = '10px 12px'
  preview.style.border = `1px solid ${tokens.borderSubtle()}`
  preview.style.borderRadius = tokens.radiusMd()
  preview.style.background = tokens.surfaceFloating()
  preview.style.color = tokens.textPrimary()
  preview.style.font = '500 12px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  preview.style.boxShadow = tokens.shadowFloating()
  preview.style.backdropFilter = 'blur(12px)'
  preview.style.pointerEvents = 'none'
  preview.style.whiteSpace = 'pre-wrap'

  shadowRoot.appendChild(layer)
  shadowRoot.appendChild(composer)
  shadowRoot.appendChild(preview)

  return {
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
  }
}
