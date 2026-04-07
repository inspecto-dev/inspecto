import { badgeClass } from './styles-classes.js'

export const launcherStyles = `
  .${badgeClass} {
    position: fixed;
    bottom: 18px;
    right: 18px;
    z-index: 2147483645;
    background: var(--inspecto-badge-bg);
    color: var(--inspecto-badge-text);
    border: var(--inspecto-badge-border);
    border-radius: var(--inspecto-radius-pill);
    min-width: 128px;
    width: auto;
    min-height: 50px;
    padding: 8px 11px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    cursor: pointer;
    opacity: 0.98;
    transition: background 0.2s, color 0.2s, opacity 0.2s, box-shadow 0.2s, border-color 0.2s, transform 0.18s ease;
    pointer-events: all;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 9px;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    position: fixed;
    overflow: visible;
  }

  .${badgeClass}-content {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 9px;
    min-width: 0;
    padding-right: 58px;
  }

  .${badgeClass}-eyes {
    position: absolute;
    top: 50%;
    right: 22px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    pointer-events: none;
    padding: 3px 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.05);
    transform: translateY(-50%);
    transition:
      opacity 0.18s ease,
      background 0.18s ease,
      border-color 0.18s ease;
    opacity: 0.78;
  }

  .${badgeClass}-eyes[data-state="active"] { opacity: 1; }
  .${badgeClass}-eyes[data-mood="averted"] {
    background: rgba(255, 255, 255, 0.028);
    border-color: rgba(255, 255, 255, 0.04);
  }
  .${badgeClass}-eyes[data-mood="idle"] {
    background: rgba(255, 255, 255, 0.025);
    border-color: rgba(255, 255, 255, 0.035);
  }

  .${badgeClass}-eye {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow:
      inset 0 0 0 1px rgba(17, 17, 19, 0.16),
      0 1px 2px rgba(0, 0, 0, 0.18);
    position: relative;
    transition: transform 0.18s ease, opacity 0.18s ease;
    opacity: 0.92;
  }

  .${badgeClass}-eyes[data-mood="idle"] .${badgeClass}-eye {
    transform: scale(0.96);
    opacity: 0.82;
  }

  .${badgeClass}-eyes[data-mood="averted"] .${badgeClass}-eye {
    transform: scaleY(0.92);
    opacity: 0.94;
  }

  .${badgeClass}-eye-pupil {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 5px;
    height: 5px;
    margin-left: -2.5px;
    margin-top: -2.5px;
    border-radius: 999px;
    background: rgba(21, 21, 25, 0.92);
    transition: transform 0.14s ease-out;
    will-change: transform;
  }

  .${badgeClass}-indicator {
    width: 11px;
    height: 11px;
    border-radius: var(--inspecto-radius-pill);
    flex: 0 0 auto;
    background: rgba(255, 255, 255, 0.44);
    box-shadow: 0 0 0 8px rgba(255, 255, 255, 0.055);
    transition: background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
  }
  .${badgeClass}-indicator[data-state="ready"] { background: rgba(255, 255, 255, 0.56); box-shadow: 0 0 0 7px rgba(255, 255, 255, 0.05); }
  .${badgeClass}-indicator[data-state="inspect"] { background: #67c6ff; box-shadow: 0 0 0 7px rgba(103, 198, 255, 0.2); }
  .${badgeClass}-indicator[data-state="annotate"] { background: var(--inspecto-accent-primary-strong); box-shadow: 0 0 0 7px rgba(70, 57, 215, 0.2); }
  .${badgeClass}-indicator[data-state="paused"] { background: #f59e0b; box-shadow: 0 0 0 7px rgba(245, 158, 11, 0.18); }

  .${badgeClass}-label {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 3px;
    min-width: 0;
  }

  .${badgeClass}-title {
    display: inline-flex;
    align-items: center;
    font-size: 9px;
    line-height: 1.15;
    font-weight: 600;
    color: var(--inspecto-text-secondary);
    letter-spacing: 0.03em;
    text-transform: none;
  }

  .${badgeClass}-state {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    font-size: 11px;
    line-height: 1.2;
    color: var(--inspecto-text-primary);
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
    font-weight: 700;
    letter-spacing: 0.01em;
    opacity: 1;
  }

  .${badgeClass}-state[data-state="paused"] {
    color: #ffd494;
  }

  .${badgeClass}-panel {
    display: none;
    position: absolute;
    right: 0;
    bottom: calc(100% + 10px);
    flex-direction: column;
    min-width: 272px;
    gap: 10px;
    padding: 10px;
    border: 1px solid var(--inspecto-border-subtle);
    border-radius: 20px;
    background:
      radial-gradient(circle at bottom right, rgba(93, 82, 243, 0.08), transparent 36%),
      rgba(28, 28, 32, 0.96);
    color: var(--inspecto-text-primary);
    box-shadow: 0 22px 40px rgba(0, 0, 0, 0.26);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .${badgeClass}-panel-header {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 2px 4px 4px;
  }

  .${badgeClass}-panel-header [data-inspecto-launcher-panel-title="true"] {
    font-size: 11px;
    font-weight: 700;
    line-height: 1.35;
    color: var(--inspecto-text-primary);
  }

  .${badgeClass}-panel-header [data-inspecto-launcher-panel-subtitle="true"] {
    font-size: 10px;
    line-height: 1.4;
    color: var(--inspecto-text-tertiary);
  }

  .${badgeClass}-panel-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .${badgeClass}-panel-group[data-inspecto-launcher-utility-group="true"] {
    padding-top: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .${badgeClass}-panel-button {
    appearance: none;
    width: 100%;
    border: 1px solid var(--inspecto-border-subtle);
    border-radius: 14px;
    padding: 11px 12px 10px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.035);
    color: var(--inspecto-text-primary);
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    text-align: left;
    min-height: 84px;
  }

  .${badgeClass}-panel-button [data-inspecto-launcher-title="true"] {
    display: block;
    font-size: 11px;
    font-weight: 700;
    line-height: 1.25;
    text-align: left;
  }

  .${badgeClass}-panel-button [data-inspecto-launcher-description="true"] {
    display: block;
    font-size: 10px;
    line-height: 1.35;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.56);
    text-align: left;
    max-width: none;
  }

  .${badgeClass}-panel-button.active {
    background: linear-gradient(180deg, var(--inspecto-accent-primary) 0%, var(--inspecto-accent-primary-strong) 100%);
    color: #ffffff;
    border-color: transparent;
    box-shadow: 0 14px 24px rgba(70, 57, 215, 0.28);
  }

  .${badgeClass}-panel-button.active [data-inspecto-launcher-description="true"] {
    color: rgba(255, 255, 255, 0.86);
  }

  .${badgeClass}-panel-button:hover {
    background: rgba(255, 255, 255, 0.055);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
    box-shadow: 0 8px 14px rgba(0, 0, 0, 0.12);
  }

  .${badgeClass}-panel-button:disabled { cursor: not-allowed; opacity: 0.5; }

  .${badgeClass}-panel-button.secondary {
    padding: 0;
    background: transparent;
    color: var(--inspecto-text-secondary);
    border-color: transparent;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 4px;
    box-shadow: none;
    min-height: 0;
  }

  .${badgeClass}-panel-button.secondary [data-inspecto-launcher-title="true"] {
    font-weight: 600;
    font-size: 11px;
  }

  .${badgeClass}-panel-button.secondary [data-inspecto-launcher-description="true"] {
    font-size: 10px;
    max-width: none;
  }

  .${badgeClass}-panel-hint {
    font-size: 10px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.46);
    padding: 0;
  }

  .${badgeClass}.active {
    background: var(--inspecto-surface-floating);
    color: var(--inspecto-text-primary);
    border: 1px solid var(--inspecto-border-subtle);
    box-shadow: 0 16px 30px rgba(0, 0, 0, 0.22);
  }

  .${badgeClass}.disabled {
    background: rgba(20, 20, 22, 0.72);
    color: rgba(229, 229, 229, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .${badgeClass}:hover {
    opacity: 1;
    border-color: rgba(255, 255, 255, 0.14);
    transform: translateY(-1px) scale(1.02);
  }

  .${badgeClass}:hover .${badgeClass}-indicator {
    transform: scale(1.04);
  }
`
