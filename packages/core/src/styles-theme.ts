export const darkVars = `
  --inspecto-surface-floating: rgba(20, 20, 22, 0.94);
  --inspecto-surface-raised: rgba(255, 255, 255, 0.045);
  --inspecto-surface-subtle: rgba(255, 255, 255, 0.035);
  --inspecto-surface-hover: rgba(255, 255, 255, 0.08);
  --inspecto-border-subtle: rgba(255, 255, 255, 0.08);
  --inspecto-border-muted: rgba(255, 255, 255, 0.04);
  --inspecto-border-focus: rgba(93, 82, 243, 0.95);
  --inspecto-text-primary: rgba(255, 255, 255, 0.9);
  --inspecto-text-secondary: rgba(255, 255, 255, 0.72);
  --inspecto-text-tertiary: rgba(255, 255, 255, 0.46);
  --inspecto-accent-primary: #5d52f3;
  --inspecto-accent-primary-strong: #4639d7;
  --inspecto-shadow-floating: 0 20px 48px rgba(0, 0, 0, 0.28);
  --inspecto-shadow-accent: 0 8px 18px rgba(79, 70, 229, 0.28);
  --inspecto-radius-pill: 999px;
  --inspecto-radius-sm: 12px;
  --inspecto-radius-md: 14px;
  --inspecto-radius-lg: 18px;
  --inspecto-radius-xl: 20px;
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

export const themeStyles = `
  :host {
    --inspecto-surface-floating: rgba(20, 20, 22, 0.94);
    --inspecto-surface-raised: rgba(255, 255, 255, 0.045);
    --inspecto-surface-subtle: rgba(255, 255, 255, 0.035);
    --inspecto-surface-hover: rgba(255, 255, 255, 0.08);
    --inspecto-border-subtle: rgba(255, 255, 255, 0.08);
    --inspecto-border-muted: rgba(255, 255, 255, 0.04);
    --inspecto-border-focus: rgba(93, 82, 243, 0.95);
    --inspecto-text-primary: rgba(255, 255, 255, 0.9);
    --inspecto-text-secondary: rgba(255, 255, 255, 0.72);
    --inspecto-text-tertiary: rgba(255, 255, 255, 0.46);
    --inspecto-accent-primary: #5d52f3;
    --inspecto-accent-primary-strong: #4639d7;
    --inspecto-shadow-floating: 0 20px 48px rgba(0, 0, 0, 0.28);
    --inspecto-shadow-accent: 0 8px 18px rgba(79, 70, 229, 0.28);
    --inspecto-radius-pill: 999px;
    --inspecto-radius-sm: 12px;
    --inspecto-radius-md: 14px;
    --inspecto-radius-lg: 18px;
    --inspecto-radius-xl: 20px;
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
    --inspecto-overlay-border: #4285f4;
    --inspecto-overlay-bg: rgba(66, 133, 244, 0.2);
    --inspecto-tooltip-bg: #ffffff;
    --inspecto-tooltip-text: #333333;
    --inspecto-tooltip-border: #ccc;
    --inspecto-tooltip-shadow: 0 2px 10px rgba(0,0,0,0.1);
    --inspecto-tag-color: #8b008b;
    --inspecto-id-color: #8b008b;
    --inspecto-class-color: #00008b;
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
`
