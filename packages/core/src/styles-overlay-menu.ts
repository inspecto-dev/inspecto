import {
  classClass,
  dimClass,
  errorMsgClass,
  idClass,
  loadingSpinnerClass,
  menuClass,
  menuContextPreviewClass,
  menuContextSummaryClass,
  menuContextToggleClass,
  menuInputClass,
  menuInputIconClass,
  menuInputWrapperClass,
  menuItemClass,
  menuMetaClass,
  menuSectionClass,
  menuTitleClass,
  overlayClass,
  runtimeToggleBadgeClass,
  runtimeToggleClass,
  runtimeToggleIconClass,
  separatorClass,
  shortcutIconClass,
  sourceClass,
  tagClass,
  tooltipBottomClass,
  tooltipClass,
  tooltipTopClass,
} from './styles-classes.js'

export const overlayMenuStyles = `
  .${overlayClass} {
    position: fixed;
    pointer-events: none;
    z-index: 2147483646;
    border: 1px dashed var(--inspecto-overlay-border);
    background: var(--inspecto-overlay-bg);
    box-sizing: border-box;
    transition: all 0.05s linear;
  }

  .${tooltipClass} {
    position: fixed;
    pointer-events: none;
    z-index: 2147483647;
    background: var(--inspecto-surface-floating);
    color: var(--inspecto-text-primary);
    border: 1px solid var(--inspecto-border-subtle);
    border-radius: var(--inspecto-radius-md);
    box-shadow: var(--inspecto-shadow-floating);
    padding: 7px 10px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 11px;
    line-height: 1.45;
    transition: all 0.05s linear;
    display: flex;
    flex-direction: column;
    gap: 3px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .${tooltipClass}::after {
    content: '';
    position: absolute;
    width: 0;
    height: 0;
    border-style: solid;
  }

  .${tooltipTopClass}::after {
    bottom: -6px;
    left: var(--inspecto-arrow-left, 10px);
    border-width: 6px 6px 0 6px;
    border-color: var(--inspecto-surface-floating) transparent transparent transparent;
  }

  .${tooltipBottomClass}::after {
    top: -6px;
    left: var(--inspecto-arrow-left, 10px);
    border-width: 0 6px 6px 6px;
    border-color: transparent transparent var(--inspecto-surface-floating) transparent;
  }

  .${tooltipClass}::before {
    content: '';
    position: absolute;
    width: 0;
    height: 0;
    border-style: solid;
  }

  .${tooltipTopClass}::before {
    bottom: -7px;
    left: calc(var(--inspecto-arrow-left, 10px) - 1px);
    border-width: 7px 7px 0 7px;
    border-color: var(--inspecto-border-subtle) transparent transparent transparent;
  }

  .${tooltipBottomClass}::before {
    top: -7px;
    left: calc(var(--inspecto-arrow-left, 10px) - 1px);
    border-width: 0 7px 7px 7px;
    border-color: transparent transparent var(--inspecto-border-subtle) transparent;
  }

  .${tagClass},
  .${idClass} {
    color: #d7b4ff;
    font-weight: 600;
    font-family: monospace;
  }

  .${classClass} {
    color: #9ad8ff;
    font-family: monospace;
  }

  .${dimClass} {
    color: var(--inspecto-text-tertiary);
    margin-left: 4px;
  }

  .${separatorClass} {
    height: 1px;
    background: var(--inspecto-border-muted);
    margin: 3px -10px;
    opacity: 1;
  }

  .${sourceClass} {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 10px;
    color: var(--inspecto-text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 300px;
  }

  .${menuClass} {
    position: fixed;
    z-index: 2147483647;
    background: var(--inspecto-surface-floating);
    border: 1px solid var(--inspecto-border-subtle);
    border-radius: var(--inspecto-radius-lg);
    padding: 10px;
    width: 304px;
    max-width: calc(100vw - 16px);
    box-sizing: border-box;
    box-shadow: var(--inspecto-shadow-floating);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--inspecto-text-primary);
  }

  .${menuTitleClass} {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    margin: 0 0 8px 0;
  }

  .${menuTitleClass} strong {
    font-size: 14px;
    line-height: 1.3;
    color: var(--inspecto-text-primary);
  }

  .${menuMetaClass} {
    font-size: 10px;
    line-height: 1.35;
    color: var(--inspecto-text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.82;
  }

  .${menuSectionClass} {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .${menuSectionClass} + .${menuSectionClass} {
    margin-top: 6px;
  }

  .${menuInputWrapperClass} {
    display: flex;
    align-items: center;
    border: 1px solid var(--inspecto-border-subtle);
    border-radius: var(--inspecto-radius-lg);
    background: rgba(255, 255, 255, 0.045);
    padding: 8px 10px;
  }

  .${menuInputWrapperClass}:focus-within {
    border-color: var(--inspecto-border-focus);
    box-shadow: 0 0 0 1px var(--inspecto-border-focus);
  }

  .${menuInputClass} {
    width: 100%;
    border: none;
    outline: none;
    font-size: 14px;
    color: var(--inspecto-text-primary);
    background: transparent;
  }

  .${menuInputClass}::placeholder {
    color: var(--inspecto-text-tertiary);
  }

  .${menuInputIconClass} {
    color: var(--inspecto-text-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 4px;
  }

  .${menuInputIconClass}:hover {
    color: var(--inspecto-text-primary);
  }

  .${menuContextSummaryClass} {
    padding: 0 10px;
    font-size: 10px;
    line-height: 1.4;
    color: var(--inspecto-text-tertiary);
  }

  .${menuContextToggleClass} {
    align-self: flex-start;
    padding: 0 10px;
    border: none;
    background: transparent;
    color: var(--inspecto-text-tertiary);
    font-size: 10px;
    line-height: 1.4;
    cursor: pointer;
  }

  .${menuContextToggleClass}:hover {
    color: var(--inspecto-text-secondary);
  }

  .${menuContextPreviewClass} {
    padding: 7px 10px;
    border: 1px solid var(--inspecto-border-muted);
    border-radius: var(--inspecto-radius-sm);
    background: rgba(255, 255, 255, 0.02);
    color: var(--inspecto-text-secondary);
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 10px;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .${menuItemClass} {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    padding: 7px 10px;
    border: 1px solid var(--inspecto-border-muted);
    border-radius: var(--inspecto-radius-sm);
    background: rgba(255, 255, 255, 0.018);
    color: var(--inspecto-text-secondary);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .${menuItemClass}:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--inspecto-border-subtle);
  }

  .${menuItemClass}[data-role="open-primary"] {
    background: rgba(93, 82, 243, 0.12);
    border-color: rgba(93, 82, 243, 0.26);
    color: #ffffff;
  }

  .${menuItemClass}[data-role="open-primary"] .${shortcutIconClass} {
    color: var(--inspecto-text-secondary);
  }

  .${menuItemClass}[data-role="open-primary"]:hover {
    background: rgba(93, 82, 243, 0.18);
    border-color: rgba(93, 82, 243, 0.36);
  }

  .${menuItemClass}[data-role="ai-secondary"] {
    background: rgba(255, 255, 255, 0.015);
  }

  .${menuItemClass}[data-role="open-icon"] {
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    padding: 0;
    align-items: center;
    justify-content: center;
    border-radius: var(--inspecto-radius-pill);
    background: var(--inspecto-surface-subtle);
    border-color: var(--inspecto-border-subtle);
    color: var(--inspecto-text-secondary);
    font-size: 14px;
    line-height: 1;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  }

  .${menuItemClass}[data-role="runtime-context-toggle"],
  .${menuItemClass}[data-role="screenshot-context-toggle"] {
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    padding: 0;
    align-items: center;
    justify-content: center;
    border-radius: var(--inspecto-radius-pill);
    font-size: 13px;
    line-height: 1;
  }

  .${menuItemClass}[data-role="open-icon"]:hover {
    background: var(--inspecto-surface-hover);
    border-color: var(--inspecto-border-subtle);
    color: var(--inspecto-text-primary);
  }

  .${runtimeToggleClass} {
    position: relative;
    overflow: visible;
  }

  .${runtimeToggleIconClass} {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    font-size: 16px;
    transform: translateY(0.5px);
  }

  .${runtimeToggleBadgeClass} {
    position: absolute;
    top: -5px;
    right: -5px;
    min-width: 15px;
    height: 15px;
    padding: 0 4px;
    border-radius: var(--inspecto-radius-pill);
    background: #ef4444;
    color: #ffffff;
    font-size: 9px;
    font-weight: 700;
    line-height: 15px;
    text-align: center;
    box-shadow: 0 0 0 2px var(--inspecto-surface-floating);
    pointer-events: none;
  }

  .${runtimeToggleClass}[data-visual-state="inactive"] {
    background: rgba(255, 255, 255, 0.03);
    border-color: var(--inspecto-border-muted);
    color: var(--inspecto-text-secondary);
  }

  .${runtimeToggleClass}[data-visual-state="mixed"] {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.24);
    color: #fda4af;
  }

  .${runtimeToggleClass}[data-visual-state="active"] {
    background: linear-gradient(180deg, var(--inspecto-accent-primary) 0%, var(--inspecto-accent-primary-strong) 100%);
    border-color: transparent;
    color: #ffffff;
    box-shadow: var(--inspecto-shadow-accent);
  }

  .${runtimeToggleClass}[data-visual-state="active"]:hover {
    background: linear-gradient(180deg, #6d63ff 0%, var(--inspecto-accent-primary) 100%);
  }

  .${menuItemClass} .${shortcutIconClass} {
    margin-left: auto;
    color: var(--inspecto-text-tertiary);
  }

  .${menuItemClass}:hover .${shortcutIconClass} {
    color: var(--inspecto-hover-icon);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .${loadingSpinnerClass} {
    width: 14px;
    height: 14px;
    border: 2px solid var(--inspecto-overlay-border);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    margin: 4px auto;
    display: block;
  }

  .${errorMsgClass} {
    font-size: 11px;
    color: var(--inspecto-error-color);
    padding: 4px 8px;
    text-align: center;
  }
`
