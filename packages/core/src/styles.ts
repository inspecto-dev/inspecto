export const overlayClass = 'inspecto-overlay'
export const menuClass = 'inspecto-menu'
export const menuTitleClass = 'inspecto-menu-title'
export const menuItemClass = 'inspecto-menu-item'
export const loadingSpinnerClass = 'inspecto-spinner'
export const errorMsgClass = 'inspecto-error'
export const badgeClass = 'inspecto-badge'
export const menuInputClass = 'inspecto-menu-input'
export const menuInputWrapperClass = 'inspecto-menu-input-wrapper'
export const menuInputIconClass = 'inspecto-menu-input-icon'

// Tooltip & overlay specific classes
export const tooltipClass = 'inspecto-tooltip'
export const tooltipTopClass = 'inspecto-tooltip-top'
export const tooltipBottomClass = 'inspecto-tooltip-bottom'
export const tagClass = 'inspecto-tag'
export const idClass = 'inspecto-id'
export const classClass = 'inspecto-class'
export const dimClass = 'inspecto-dim'
export const separatorClass = 'inspecto-separator'
export const sourceClass = 'inspecto-source'
export const shortcutIconClass = 'ai-shortcut-icon'

const darkVars = `
  --inspecto-menu-bg: #252526;
  --inspecto-menu-border: #454545;
  --inspecto-menu-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  --inspecto-text: #cccccc;
  --inspecto-text-muted: #858585;
  --inspecto-hover-bg: #04395e;
  --inspecto-hover-text: #ffffff;
  --inspecto-hover-icon: #ffffff;
  --inspecto-input-bg: #3c3c3c;
  --inspecto-input-border: #007acc;
  --inspecto-shortcut-text: #858585;
  --inspecto-badge-bg: rgba(30, 30, 30, 0.7);
  --inspecto-badge-text: #e5e5e5;
  --inspecto-badge-active-bg: #007acc;
  --inspecto-badge-active-text: #ffffff;
  --inspecto-badge-border: 1px solid rgba(255, 255, 255, 0.1);
  
  --inspecto-tooltip-bg: #222222;
  --inspecto-tooltip-text: #cccccc;
  --inspecto-tooltip-border: #444;
  --inspecto-tooltip-shadow: 0 2px 10px rgba(0,0,0,0.5);
  --inspecto-tag-color: #d16969;
  --inspecto-id-color: #d16969;
  --inspecto-class-color: #9cdcfe;
  --inspecto-dim-color: #858585;
  --inspecto-error-color: #ef4444;
`

export const inspectorStyles = `
  :host {
    /* Light theme (default) */
    --inspecto-menu-bg: #ffffff;
    --inspecto-menu-border: #d4d4d4;
    --inspecto-menu-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    --inspecto-text: #333333;
    --inspecto-text-muted: #6b7280;
    --inspecto-hover-bg: #0060c0;
    --inspecto-hover-text: #ffffff;
    --inspecto-hover-icon: #ffffff;
    --inspecto-input-bg: #ffffff;
    --inspecto-input-border: #007acc;
    --inspecto-shortcut-text: #9ca3af;
    --inspecto-badge-bg: rgba(30, 30, 30, 0.7);
    --inspecto-badge-text: #e5e5e5;
    --inspecto-badge-active-bg: #007acc;
    --inspecto-badge-active-text: #ffffff;
    --inspecto-badge-border: 1px solid rgba(255, 255, 255, 0.1);
    
    /* Chrome DevTools like colors */
    --inspecto-overlay-border: #4285f4; /* Google Blue */
    --inspecto-overlay-bg: rgba(66, 133, 244, 0.2); 
    --inspecto-tooltip-bg: #ffffff;
    --inspecto-tooltip-text: #333333;
    --inspecto-tooltip-border: #ccc;
    --inspecto-tooltip-shadow: 0 2px 10px rgba(0,0,0,0.1);
    
    --inspecto-tag-color: #8b008b; /* Dark magenta */
    --inspecto-id-color: #8b008b;
    --inspecto-class-color: #00008b; /* Dark blue */
    --inspecto-dim-color: #555555;
    --inspecto-error-color: #ef4444;
  }

  :host([data-theme="dark"]) {
    ${darkVars}
  }

  @media (prefers-color-scheme: dark) {
    :host(:not([data-theme="light"])) {
      ${darkVars}
    }
  }

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
    background: var(--inspecto-tooltip-bg);
    color: var(--inspecto-tooltip-text);
    border: 1px solid var(--inspecto-tooltip-border);
    border-radius: 4px;
    box-shadow: var(--inspecto-tooltip-shadow);
    padding: 6px 10px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 12px;
    line-height: 1.4;
    transition: all 0.05s linear;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  /* Create the small pointer arrow like Chrome DevTools */
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
    border-color: var(--inspecto-tooltip-bg) transparent transparent transparent;
  }

  .${tooltipBottomClass}::after {
    top: -6px;
    left: var(--inspecto-arrow-left, 10px);
    border-width: 0 6px 6px 6px;
    border-color: transparent transparent var(--inspecto-tooltip-bg) transparent;
  }
  
  /* Outline for the arrow to match border */
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
    border-color: var(--inspecto-tooltip-border) transparent transparent transparent;
  }
  
  .${tooltipBottomClass}::before {
    top: -7px;
    left: calc(var(--inspecto-arrow-left, 10px) - 1px);
    border-width: 0 7px 7px 7px;
    border-color: transparent transparent var(--inspecto-tooltip-border) transparent;
  }

  .${tagClass} {
    color: var(--inspecto-tag-color);
    font-weight: 600;
    font-family: monospace;
  }
  
  .${idClass} {
    color: var(--inspecto-id-color);
    font-weight: 600;
    font-family: monospace;
  }

  .${classClass} {
    color: var(--inspecto-class-color);
    font-family: monospace;
  }

  .${dimClass} {
    color: var(--inspecto-dim-color);
    margin-left: 4px;
  }
  
  .${separatorClass} {
    height: 1px;
    background: var(--inspecto-tooltip-border);
    margin: 2px -10px;
    opacity: 0.5;
  }
  
  .${sourceClass} {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    color: var(--inspecto-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 300px;
  }

  .${menuClass} {
    position: fixed;
    z-index: 2147483647;
    background: var(--inspecto-menu-bg);
    border: 1px solid var(--inspecto-menu-border);
    border-radius: 6px;
    padding: 6px;
    min-width: 300px;
    box-shadow: var(--inspecto-menu-shadow);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--inspecto-text);
  }

  .${menuInputWrapperClass} {
    display: flex;
    align-items: center;
    border: 1px solid var(--inspecto-menu-border);
    border-radius: 4px;
    padding: 6px 8px;
    margin: 4px;
    margin-bottom: 8px;
  }
  
  .${menuInputWrapperClass}:focus-within {
    border-color: var(--inspecto-input-border);
  }

  .${menuInputClass} {
    width: 100%;
    border: none;
    outline: none;
    font-size: 13px;
    color: var(--inspecto-text);
    background: transparent;
  }

  .${menuInputClass}::placeholder {
    color: var(--inspecto-text-muted);
  }

  .${menuInputIconClass} {
    color: var(--inspecto-text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 4px;
  }

  .${menuInputIconClass}:hover {
    color: var(--inspecto-text);
  }

  .${menuItemClass} {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 10px;
    margin: 2px 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--inspecto-text);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
  }

  .${menuItemClass}:hover {
    background: var(--inspecto-hover-bg);
    color: var(--inspecto-hover-text);
  }

  .${menuItemClass} .${shortcutIconClass} {
    margin-left: auto;
    color: var(--inspecto-text-muted);
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

  .${badgeClass} {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 2147483645;
    background: var(--inspecto-badge-bg);
    color: var(--inspecto-badge-text);
    border: var(--inspecto-badge-border);
    border-radius: 20px;
    padding: 6px 12px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    cursor: grab;
    opacity: 0.85;
    transition: background 0.2s, color 0.2s, opacity 0.2s, box-shadow 0.2s;
    pointer-events: all;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    gap: 6px;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }

  .${badgeClass}:active {
    cursor: grabbing;
  }

  .${badgeClass}-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: transparent;
    color: currentColor;
    font-size: 14px;
    line-height: 1;
    opacity: 0.5;
    transition: opacity 0.2s, background 0.2s;
    margin-left: 2px;
    cursor: pointer;
  }

  .${badgeClass}-close:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.2);
  }

  .${badgeClass}.active {
    background: var(--inspecto-badge-active-bg);
    color: var(--inspecto-badge-active-text);
    border: 1px solid transparent;
    box-shadow: 0 0 10px rgba(0, 122, 204, 0.3);
  }

  .${badgeClass}.disabled {
    background: rgba(30, 30, 30, 0.4);
    color: rgba(229, 229, 229, 0.5);
    text-decoration: line-through;
    border: 1px dashed rgba(255, 255, 255, 0.1);
  }

  .${badgeClass}.disabled .${badgeClass}-close {
    opacity: 0.8;
    text-decoration: none;
    transform: rotate(45deg);
  }

  .${badgeClass}:hover {
    opacity: 1;
  }
`
