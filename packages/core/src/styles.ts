import { annotateStyles } from './styles-annotate.js'
import { launcherStyles } from './styles-launcher.js'
import { overlayMenuStyles } from './styles-overlay-menu.js'
import { themeStyles } from './styles-theme.js'
export * from './styles-classes.js'

export function applyHeaderIconButtonStyles(button: HTMLButtonElement): void {
  button.style.width = '28px'
  button.style.height = '28px'
  button.style.padding = '0'
  button.style.borderWidth = '1px'
  button.style.borderStyle = 'solid'
  button.style.borderColor = 'var(--inspecto-border-subtle)'
  button.style.background = 'var(--inspecto-surface-subtle)'
  button.style.color = 'var(--inspecto-text-secondary)'
  button.style.font = '600 14px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  button.style.borderRadius = 'var(--inspecto-radius-pill)'
  button.style.display = 'inline-flex'
  button.style.alignItems = 'center'
  button.style.justifyContent = 'center'
  button.style.transition =
    'background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease'
}

export const inspectorStyles = `
  ${themeStyles}
  ${overlayMenuStyles}
  ${launcherStyles}
  ${annotateStyles}
`
