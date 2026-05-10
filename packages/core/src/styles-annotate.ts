import {
  annotateBadgeClass,
  annotateConfirmDialogClass,
  annotateQueueListClass,
  annotateSidebarActionsClass,
  annotateSidebarButtonClass,
  annotateSidebarChipClass,
  annotateSidebarChipFieldClass,
  annotateSidebarChipListClass,
  annotateSidebarChipPanelClass,
  annotateSidebarClass,
  annotateSidebarEmptyClass,
  annotateSidebarFieldClass as _annotateSidebarFieldClass,
  annotateSidebarFooterClass,
  annotateSidebarHeaderClass,
  annotateSidebarHintClass,
  annotateSidebarInlineActionClass,
  annotateSidebarInputClass,
  annotateSidebarLabelClass,
  annotateSidebarQueueItemClass,
  annotateSidebarQueueMetaClass,
  annotateSidebarSectionClass,
  annotateSidebarSelectClass,
  annotateSidebarTargetItemClass,
  annotateSidebarTextClass,
  annotateTargetListClass,
  runtimeToggleClass,
} from './styles-classes.js'

export const annotateStyles = `
  .${annotateSidebarClass} {
    position: fixed;
    top: 18px;
    right: 18px;
    z-index: 2147483647;
    width: min(408px, calc(100vw - 28px));
    min-height: 240px;
    max-height: calc(100vh - 36px);
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-sizing: border-box;
    padding: 18px 18px 18px;
    overflow: visible;
    color: var(--inspecto-text-primary);
    background:
      radial-gradient(circle at top right, rgba(14, 165, 233, 0.18), transparent 36%),
      radial-gradient(circle at top left, rgba(14, 165, 233, 0.08), transparent 28%),
      linear-gradient(180deg, rgba(13, 20, 31, 0.985) 0%, rgba(8, 14, 24, 0.985) 100%);
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 28px;
    box-shadow: var(--inspecto-shadow-floating);
    font-family: 'SF Pro Display', 'Segoe UI', 'Inter', sans-serif;
    pointer-events: auto;
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
  }

  .${annotateSidebarHeaderClass} {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  }

  .${annotateSidebarLabelClass} {
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;
    flex: 1 1 auto;
  }

  .${annotateSidebarLabelClass} [data-inspecto-annotate-title="true"] {
    font-size: 16px;
    line-height: 1.15;
    font-weight: 760;
    color: var(--inspecto-text-primary);
    letter-spacing: -0.02em;
  }

  .${annotateSidebarLabelClass} [data-inspecto-annotate-header-status="true"] {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    min-height: 26px;
    padding: 0 10px;
    border-radius: var(--inspecto-radius-pill);
    background: rgba(148, 163, 184, 0.1);
    border: 1px solid rgba(148, 163, 184, 0.14);
    font-size: 11px;
    line-height: 1.2;
    font-weight: 650;
    color: var(--inspecto-text-secondary);
  }

  .${annotateSidebarTextClass} {
    font-size: 12px;
    line-height: 1.55;
    letter-spacing: 0.01em;
    text-transform: none;
    color: var(--inspecto-text-secondary);
    font-weight: 500;
  }

  .${annotateSidebarSectionClass} {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
    padding: 14px;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 20px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(148, 163, 184, 0.04) 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .${annotateSidebarSectionClass}[data-variant="modes"] { gap: 8px; padding: 10px 12px; }
  .${annotateSidebarSectionClass}[data-variant="draft"] { gap: 0; padding: 0; border: none; background: transparent; }
  .${annotateSidebarSectionClass}[data-variant="chip-preview"] { gap: 8px; padding: 12px; background: rgba(255, 255, 255, 0.045); }
  .${annotateSidebarSectionClass}[data-variant="records"] { padding: 0; overflow: hidden; background: rgba(255, 255, 255, 0.038); border-color: rgba(148, 163, 184, 0.16); }
  .${annotateSidebarSectionClass}[data-variant="latest-session"] {
    padding: 14px;
    background:
      radial-gradient(circle at top right, rgba(14, 165, 233, 0.12), transparent 34%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.055) 0%, rgba(148, 163, 184, 0.05) 100%);
    border-color: rgba(14, 165, 233, 0.18);
  }
  .${annotateSidebarSectionClass}[data-variant="full-prompt"] { padding: 0; gap: 0; background: transparent; border: none; border-radius: 0; opacity: 0.72; }

  .${annotateSidebarSectionClass} h3 {
    margin: 0;
    font-size: 12px;
    line-height: 1.2;
    color: var(--inspecto-text-primary);
    font-weight: 700;
  }

  .${annotateSidebarSectionClass}[data-variant="empty-state"] {
    flex: 1 1 auto;
    justify-content: center;
    gap: 12px;
    padding: 20px 6px 8px;
    background: transparent;
    border-color: transparent;
  }

  .${annotateSidebarSectionClass}[data-variant="empty-state"] [data-inspecto-annotate-empty-title="true"] {
    font-size: 18px;
    line-height: 1.18;
    font-weight: 760;
    color: var(--inspecto-text-primary);
    max-width: 20ch;
    letter-spacing: -0.03em;
  }

  .${annotateSidebarSectionClass}[data-variant="empty-state"] [data-inspecto-annotate-empty-body="true"] {
    color: var(--inspecto-text-secondary);
    font-size: 12px;
    line-height: 1.62;
  }

  .${annotateSidebarInputClass},
  .${annotateSidebarSelectClass} {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--inspecto-border-subtle);
    border-radius: var(--inspecto-radius-md);
    background: rgba(255, 255, 255, 0.06);
    color: var(--inspecto-text-primary);
    font: inherit;
    font-size: 13px;
    outline: none;
  }

  .${annotateSidebarInputClass} {
    min-height: 112px;
    padding: 14px 15px;
    resize: vertical;
    line-height: 1.55;
  }

  .${annotateSidebarHintClass} {
    font-size: 11px;
    line-height: 1.45;
    color: var(--inspecto-text-tertiary);
  }

  .${annotateSidebarChipListClass} { display: flex; flex-wrap: wrap; gap: 6px; }

  .${annotateSidebarChipClass} {
    appearance: none;
    border: 1px solid rgba(14, 165, 233, 0.24);
    background: rgba(14, 165, 233, 0.14);
    color: #d7f4ff;
    border-radius: var(--inspecto-radius-pill);
    padding: 6px 9px 6px 11px;
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.2;
    cursor: default;
    gap: 5px;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
  }

  .${annotateSidebarChipClass}[data-state="draft"] {
    border-color: rgba(96, 165, 250, 0.24);
    background: rgba(96, 165, 250, 0.12);
    color: #bfdbfe;
  }

  .${annotateSidebarChipClass}:hover,
  .${annotateSidebarChipClass}:focus-visible {
    outline: none;
    background: rgba(14, 165, 233, 0.22);
    border-color: rgba(14, 165, 233, 0.42);
    color: #ffffff;
    transform: translateY(-1px);
  }

  .${annotateSidebarChipClass}[data-state="draft"]:hover,
  .${annotateSidebarChipClass}[data-state="draft"]:focus-visible {
    background: rgba(96, 165, 250, 0.2);
    border-color: rgba(96, 165, 250, 0.42);
  }

  .${annotateSidebarChipPanelClass} {
    display: grid;
    grid-template-columns: minmax(72px, auto) minmax(0, 1fr);
    gap: 8px 10px;
    padding: 10px;
    border: 1px solid var(--inspecto-border-muted);
    border-radius: var(--inspecto-radius-md);
    background: rgba(255, 255, 255, 0.028);
  }

  .${annotateSidebarChipFieldClass} {
    font-size: 10px;
    line-height: 1.4;
    color: var(--inspecto-text-tertiary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .${annotateSidebarChipPanelClass} > .${annotateSidebarChipFieldClass} + div {
    min-width: 0;
    font-size: 12px;
    line-height: 1.45;
    color: var(--inspecto-text-primary);
    word-break: break-word;
  }

  .${annotateSidebarSelectClass} { height: 36px; padding: 0 10px; }
  .${annotateSidebarInputClass}:focus, .${annotateSidebarSelectClass}:focus { border-color: var(--inspecto-border-focus); box-shadow: 0 0 0 1px var(--inspecto-border-focus); }

  .${annotateTargetListClass}, .${annotateQueueListClass} {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 220px;
    overflow: auto;
    padding: 6px 10px 12px;
  }

  .${annotateSidebarTargetItemClass}, .${annotateSidebarQueueItemClass} {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 12px 12px;
    margin: 0;
    border: 1px solid transparent;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.022);
    cursor: pointer;
    box-sizing: border-box;
    transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
  }

  .${annotateSidebarQueueItemClass}:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(148, 163, 184, 0.16);
    transform: translateY(-1px);
  }
  .${annotateSidebarQueueItemClass}:focus-visible {
    outline: none;
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--inspecto-border-focus);
    box-shadow: 0 0 0 1px var(--inspecto-border-focus);
  }
  .${annotateSidebarQueueItemClass}[data-selected="true"] {
    background: linear-gradient(180deg, rgba(14, 165, 233, 0.12) 0%, rgba(14, 165, 233, 0.07) 100%);
    border-color: rgba(14, 165, 233, 0.28);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 10px 24px rgba(8, 14, 24, 0.16);
  }
  .${annotateSidebarQueueItemClass} > :not(.${annotateSidebarActionsClass}):first-child {
    font-size: 12px;
    line-height: 1.45;
    color: var(--inspecto-text-primary);
    word-break: break-word;
    font-weight: 620;
  }
  .${annotateSidebarQueueItemClass} > .${annotateSidebarQueueMetaClass} { order: 2; font-size: 10px; line-height: 1.4; color: var(--inspecto-text-tertiary); }

  .${annotateSidebarTargetItemClass} {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: "label action";
    column-gap: 10px;
    align-items: center;
    padding: 10px 12px;
    border-color: rgba(148, 163, 184, 0.12);
    background: rgba(255, 255, 255, 0.02);
  }

  .${annotateTargetListClass} > .${annotateSidebarTargetItemClass}:last-child { margin-bottom: 0; }

  .${annotateBadgeClass} {
    grid-area: label;
    display: block;
    align-self: auto;
    padding: 0;
    border-radius: 0;
    background: transparent;
    color: var(--inspecto-text);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.4;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .${annotateSidebarEmptyClass}, .${annotateSidebarQueueMetaClass} {
    color: rgba(255, 255, 255, 0.58);
    font-size: 11px;
    line-height: 1.5;
  }

  .${annotateSidebarFooterClass} { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }
  .${annotateSidebarFooterClass} .${annotateSidebarActionsClass} { justify-content: flex-end; align-items: stretch; gap: 10px; }
  .${annotateSidebarActionsClass} { display: flex; flex-wrap: wrap; gap: 10px; align-items: stretch; justify-content: flex-end; }

  .${annotateSidebarButtonClass} {
    appearance: none;
    border: 1px solid var(--inspecto-border-subtle);
    background: rgba(255, 255, 255, 0.05);
    color: var(--inspecto-text-primary);
    border-radius: var(--inspecto-radius-pill);
    padding: 8px 12px;
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  }

  .${annotateSidebarButtonClass}[data-role="mode"][data-selected="true"] { background: rgba(255, 255, 255, 0.1); color: #ffffff; border-color: transparent; }
  .${annotateSidebarSectionClass}[data-variant="modes"] .${annotateSidebarActionsClass} { gap: 4px; padding: 4px; border: 1px solid var(--inspecto-border-muted); border-radius: var(--inspecto-radius-pill); background: rgba(255, 255, 255, 0.03); flex-wrap: nowrap; }
  .${annotateSidebarSectionClass}[data-variant="modes"] .${annotateSidebarButtonClass}[data-role="mode"] { flex: 1 1 0; justify-content: center; padding: 8px 10px; background: transparent; border-color: transparent; color: var(--inspecto-text-secondary); }
  .${annotateSidebarHeaderClass} .${annotateSidebarButtonClass} { width: 30px; height: 30px; padding: 0; border-radius: var(--inspecto-radius-pill); display: inline-flex; align-items: center; justify-content: center; font-size: 12px; line-height: 1; flex: 0 0 auto; }
  .${annotateSidebarHeaderClass} .${runtimeToggleClass} { overflow: visible; }
  .${annotateSidebarHeaderClass} [data-inspecto-annotate-header-actions-left="true"], .${annotateSidebarHeaderClass} [data-inspecto-annotate-header-actions-right="true"] { padding: 4px; border-radius: 999px; background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.05); gap: 4px; flex-wrap: nowrap; flex: 0 0 auto; margin-top: 1px; }
  .${annotateSidebarButtonClass}:hover { background: var(--inspecto-surface-hover); color: #ffffff; border-color: rgba(148, 163, 184, 0.12); transform: translateY(-1px); }
  .${annotateSidebarButtonClass}:disabled { opacity: 0.5; cursor: not-allowed; }
  .${annotateSidebarClass} .${annotateSidebarButtonClass}.primary {
    background: linear-gradient(180deg, var(--inspecto-accent-primary) 0%, var(--inspecto-accent-primary-strong) 100%);
    color: #ffffff;
    border-color: rgba(14, 165, 233, 0.22);
    box-shadow: var(--inspecto-shadow-accent);
  }
  .${annotateSidebarFooterClass} .${annotateSidebarButtonClass} {
    min-height: 40px;
    padding: 0 14px;
    font-size: 11px;
    font-weight: 650;
    border-radius: var(--inspecto-radius-pill);
    justify-content: center;
    display: inline-flex;
    align-items: center;
  }
  .${annotateSidebarFooterClass} .${annotateSidebarButtonClass}[data-emphasis="secondary"] {
    background: rgba(255, 255, 255, 0.04);
    color: var(--inspecto-text-secondary);
    border-color: rgba(148, 163, 184, 0.12);
    box-shadow: none;
    opacity: 0.92;
    white-space: nowrap;
  }
  .${annotateSidebarFooterClass} .${annotateSidebarButtonClass}[data-role="quick-ask"][data-emphasis="secondary"] {
    background: rgba(255, 255, 255, 0.04);
    color: var(--inspecto-text-secondary);
    border-color: rgba(148, 163, 184, 0.12);
    text-decoration: none;
    min-height: 40px;
    padding: 0 14px;
    box-shadow: none;
    white-space: nowrap;
  }
  .${annotateSidebarFooterClass} .${annotateSidebarButtonClass}[data-emphasis="secondary"]:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.12);
    transform: translateY(-1px);
  }
  .${annotateSidebarFooterClass} .${annotateSidebarButtonClass}[data-role="quick-ask"][data-emphasis="secondary"]:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.12);
    color: #ffffff;
    transform: translateY(-1px);
  }
  .${annotateSidebarFooterClass} .${annotateSidebarButtonClass}[data-role="raw-preview"] { min-width: 48px; justify-content: center; color: var(--inspecto-text-secondary); background: rgba(255, 255, 255, 0.045); padding: 0 10px; }
  .${annotateSidebarFooterClass} .${annotateSidebarButtonClass}[data-role="raw-preview"][data-selected="true"] { background: rgba(93, 82, 243, 0.16); border-color: rgba(93, 82, 243, 0.32); color: #e5e2ff; }
  .${annotateSidebarFooterClass} .${annotateSidebarButtonClass}[data-role="send-all"] { min-width: 76px; }

  .${annotateSidebarInlineActionClass} {
    grid-area: action;
    align-self: center;
    justify-self: end;
    appearance: none;
    border: none;
    background: transparent;
    color: var(--inspecto-text-tertiary);
    width: 20px;
    height: 20px;
    padding: 0;
    font: inherit;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    border-radius: var(--inspecto-radius-pill);
    transition: color 0.15s ease, background 0.15s ease, opacity 0.15s ease;
  }

  .${annotateSidebarInlineActionClass}:hover { color: #ffffff; background: var(--inspecto-surface-hover); }
  .${annotateSidebarSectionClass}[data-variant="records"] > summary { list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 10px; cursor: pointer; font-size: 11px; font-weight: 600; color: var(--inspecto-text-secondary); }
  .${annotateSidebarSectionClass}[data-variant="records"] > summary::-webkit-details-marker { display: none; }
  .${annotateSidebarSectionClass}[data-variant="records"] > summary::after { content: '▾'; font-size: 11px; color: rgba(255, 255, 255, 0.38); transition: transform 0.15s ease; }
  .${annotateSidebarSectionClass}[data-variant="records"][open] > summary::after { transform: rotate(180deg); }
  .${annotateSidebarSectionClass}[data-variant="full-prompt"] > summary { list-style: none; cursor: pointer; font-size: 10px; font-weight: 600; color: var(--inspecto-text-tertiary); text-transform: none; letter-spacing: 0.01em; }
  .${annotateSidebarSectionClass}[data-variant="full-prompt"] > summary::-webkit-details-marker { display: none; }
  .${annotateSidebarTextClass}[data-variant="full-prompt"] { margin: 6px 0 0; padding: 9px 10px; border: 1px solid var(--inspecto-border-muted); border-radius: var(--inspecto-radius-sm); background: rgba(255, 255, 255, 0.02); color: var(--inspecto-text-secondary); font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace; font-size: 10px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; max-height: 220px; overflow: auto; }
  
  .${annotateConfirmDialogClass} {
    position: absolute;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(13, 20, 31, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border-radius: 28px;
  }
  .${annotateConfirmDialogClass} .content {
    width: calc(100% - 48px);
    background: rgba(30, 35, 45, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .${annotateConfirmDialogClass} p {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.9);
  }
  .${annotateConfirmDialogClass} .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  @keyframes inspecto-fade-out {
    0% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-4px); pointer-events: none; }
  }
  
  .inspecto-workflow-toast {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(28, 28, 28, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--inspecto-radius-pill);
    box-shadow: var(--inspecto-shadow-floating);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    padding: 6px 14px;
    z-index: 100;
    font-size: 11px;
    font-weight: 600;
    color: #5ad496;
    display: flex;
    align-items: center;
    gap: 6px;
    pointer-events: none;
    animation: inspecto-fade-out 0.3s ease 1.7s forwards;
  }
  .inspecto-workflow-toast::before {
    content: '✓';
    font-size: 12px;
  }
`
