import type { SourceLocation } from '@inspecto-dev/types'
import { bugIconSvg, cssIconSvg } from './icons.js'
import { t } from './i18n.js'
import { formatSourceAnchor } from './menu-helpers.js'
import {
  applyHeaderIconButtonStyles,
  menuMetaClass,
  menuTitleClass,
  runtimeToggleBadgeClass,
  runtimeToggleClass,
  runtimeToggleIconClass,
} from './styles.js'

export function createMenuHeaderDom(input: {
  location: SourceLocation
  targetLabel?: string
  canAttachRuntimeContext: boolean
  canAttachCssContext: boolean
}) {
  const header = document.createElement('div')
  header.className = menuTitleClass

  const headerCopy = document.createElement('div')
  headerCopy.style.display = 'flex'
  headerCopy.style.flexDirection = 'column'
  headerCopy.style.gap = '2px'
  headerCopy.style.minWidth = '0'
  headerCopy.style.flex = '1 1 auto'

  const title = document.createElement('strong')
  title.style.display = 'block'
  title.style.minWidth = '0'
  title.style.whiteSpace = 'nowrap'
  title.style.overflow = 'hidden'
  title.style.textOverflow = 'ellipsis'
  title.textContent =
    input.targetLabel?.trim() || input.location.file.split('/').pop() || input.location.file

  const meta = document.createElement('div')
  meta.className = menuMetaClass
  meta.textContent = formatSourceAnchor(input.location)
  meta.title = `${input.location.file}:${input.location.line}:${input.location.column}`

  const headerActions = document.createElement('div')
  headerActions.style.display = 'flex'
  headerActions.style.alignItems = 'center'
  headerActions.style.gap = '6px'

  const openButton = document.createElement('button')
  openButton.type = 'button'
  openButton.dataset.role = 'open-icon'
  openButton.setAttribute('aria-label', t('menu.openInEditor'))
  openButton.title = t('menu.openInEditor')
  openButton.textContent = '↗'
  applyHeaderIconButtonStyles(openButton)

  const runtimeToggleButton = document.createElement('button')
  runtimeToggleButton.type = 'button'
  runtimeToggleButton.className = runtimeToggleClass
  runtimeToggleButton.dataset.role = 'runtime-context-toggle'
  runtimeToggleButton.setAttribute('aria-label', t('menu.attachRuntime'))
  runtimeToggleButton.title = t('menu.attachRuntime')
  runtimeToggleButton.hidden = !input.canAttachRuntimeContext
  applyHeaderIconButtonStyles(runtimeToggleButton)
  const runtimeToggleIcon = document.createElement('span')
  runtimeToggleIcon.className = runtimeToggleIconClass
  runtimeToggleIcon.innerHTML = bugIconSvg
  const runtimeToggleBadge = document.createElement('span')
  runtimeToggleBadge.className = runtimeToggleBadgeClass
  runtimeToggleBadge.dataset.runtimeErrorBadge = 'true'
  runtimeToggleBadge.hidden = true
  runtimeToggleButton.append(runtimeToggleIcon, runtimeToggleBadge)

  const cssToggleButton = document.createElement('button')
  cssToggleButton.type = 'button'
  cssToggleButton.className = runtimeToggleClass
  cssToggleButton.dataset.role = 'css-context-toggle'
  cssToggleButton.setAttribute('aria-label', t('menu.attachCss'))
  cssToggleButton.title = t('menu.attachCss')
  cssToggleButton.hidden = !input.canAttachCssContext
  cssToggleButton.setAttribute('aria-pressed', 'false')
  cssToggleButton.dataset.visualState = 'inactive'
  applyHeaderIconButtonStyles(cssToggleButton)
  const cssToggleIcon = document.createElement('span')
  cssToggleIcon.className = runtimeToggleIconClass
  cssToggleIcon.innerHTML = cssIconSvg
  const cssSvgElement = cssToggleIcon.querySelector('svg')
  if (cssSvgElement) {
    cssSvgElement.style.width = '18px'
    cssSvgElement.style.height = '18px'
    cssSvgElement.style.display = 'block'
  }
  cssToggleButton.append(cssToggleIcon)

  headerCopy.append(title, meta)
  header.append(headerCopy, headerActions)

  return {
    header,
    headerActions,
    openButton,
    runtimeToggleButton,
    runtimeToggleBadge,
    cssToggleButton,
  }
}

export function applyIconToggleButtonState(
  button: HTMLButtonElement,
  enabled: boolean,
  enabledTitle: string,
  disabledTitle: string,
): void {
  button.setAttribute('aria-pressed', enabled ? 'true' : 'false')
  button.dataset.visualState = enabled ? 'active' : 'inactive'
  button.title = enabled ? enabledTitle : disabledTitle
  if (enabled) {
    button.style.background = 'var(--inspecto-accent-primary)'
    button.style.borderColor = 'transparent'
    button.style.color = '#ffffff'
    button.style.boxShadow = 'var(--inspecto-shadow-accent)'
    return
  }

  button.style.background = 'var(--inspecto-surface-subtle)'
  button.style.borderColor = 'var(--inspecto-border-subtle)'
  button.style.color = 'var(--inspecto-text-secondary)'
  button.style.boxShadow = 'none'
}
