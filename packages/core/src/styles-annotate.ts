import {
  annotateBadgeClass,
  annotateQueueListClass,
  annotateSidebarActionsClass,
  annotateSidebarButtonClass,
  annotateSidebarChipClass,
  annotateSidebarChipFieldClass,
  annotateSidebarChipListClass,
  annotateSidebarChipPanelClass,
  annotateSidebarClass,
  annotateSidebarEmptyClass,
  annotateSidebarFieldClass,
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
    top: 16px;
    right: 16px;
    z-index: 2147483647;
    width: min(380px, calc(100vw - 32px));
    min-height: 220px;
    max-height: calc(100vh - 32px);
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-sizing: border-box;
    padding: 15px 15px 16px;
    overflow: visible;
    color: var(--inspecto-text-primary);
    background:
      radial-gradient(circle at top right, rgba(93, 82, 243, 0.12), transparent 34%),
      linear-gradient(180deg, rgba(32, 32, 36, 0.96) 0%, rgba(21, 21, 24, 0.96) 100%);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 22px;
    box-shadow: 0 22px 42px rgba(0, 0, 0, 0.24);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    pointer-events: auto;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .${annotateSidebarHeaderClass} {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .${annotateSidebarLabelClass} {
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;
    flex: 1 1 auto;
  }

  .${annotateSidebarLabelClass} [data-inspecto-annotate-title="true"] {
    font-size: 15px;
    line-height: 1.2;
    font-weight: 700;
    color: var(--inspecto-text-primary);
    letter-spacing: 0;
  }

  .${annotateSidebarLabelClass} [data-inspecto-annotate-header-status="true"] {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    min-height: 24px;
    padding: 0 9px;
    border-radius: var(--inspecto-radius-pill);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 11px;
    line-height: 1.2;
    font-weight: 600;
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
    gap: 8px;
    min-height: 0;
    padding: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.022);
  }

  .${annotateSidebarSectionClass}[data-variant="modes"] { gap: 8px; padding: 8px 10px; }
  .${annotateSidebarSectionClass}[data-variant="draft"] { gap: 0; padding: 0; border: none; background: transparent; }
  .${annotateSidebarSectionClass}[data-variant="chip-preview"] { gap: 8px; padding: 10px; background: rgba(255, 255, 255, 0.03); }
  .${annotateSidebarSectionClass}[data-variant="records"] { padding: 0; overflow: hidden; background: rgba(255, 255, 255, 0.028); border-color: rgba(255, 255, 255, 0.08); }
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
    gap: 10px;
    padding: 10px 2px 0;
    background: transparent;
    border-color: transparent;
  }

  .${annotateSidebarSectionClass}[data-variant="empty-state"] [data-inspecto-annotate-empty-title="true"] {
    font-size: 17px;
    line-height: 1.25;
    font-weight: 700;
    color: var(--inspecto-text-primary);
    max-width: 22ch;
  }

  .${annotateSidebarSectionClass}[data-variant="empty-state"] [data-inspecto-annotate-empty-body="true"] {
    max-width: 29ch;
    color: rgba(255, 255, 255, 0.56);
    font-size: 12px;
    line-height: 1.55;
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
    min-height: 104px;
    padding: 12px 13px;
    resize: vertical;
    line-height: 1.5;
  }

  .${annotateSidebarHintClass} {
    font-size: 11px;
    line-height: 1.45;
    color: var(--inspecto-text-tertiary);
  }

  .${annotateSidebarChipListClass} { display: flex; flex-wrap: wrap; gap: 6px; }

  .${annotateSidebarChipClass} {
    appearance: none;
    border: 1px solid rgba(93, 82, 243, 0.24);
    background: rgba(93, 82, 243, 0.12);
    color: #d7d3ff;
    border-radius: var(--inspecto-radius-pill);
    padding: 5px 8px 5px 10px;
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
    background: rgba(93, 82, 243, 0.2);
    border-color: rgba(93, 82, 243, 0.42);
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
    gap: 0;
    max-height: 180px;
    overflow: auto;
    padding: 0 10px 10px;
  }

  .${annotateSidebarTargetItemClass}, .${annotateSidebarQueueItemClass} {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 10px;
    margin: 4px 6px;
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    background: transparent;
    cursor: pointer;
    box-sizing: border-box;
    transition: background 0.15s ease, color 0.15s ease, margin 0.15s ease, padding 0.15s ease, border-color 0.15s ease;
  }

  .${annotateSidebarQueueItemClass}:hover { background: rgba(255, 255, 255, 0.04); }
  .${annotateSidebarQueueItemClass}:focus-visible { outline: none; background: rgba(255, 255, 255, 0.03); box-shadow: inset 0 0 0 1px var(--inspecto-border-focus); }
  .${annotateSidebarQueueItemClass}[data-selected="true"] { background: rgba(93, 82, 243, 0.1); box-shadow: inset 3px 0 0 rgba(93, 82, 243, 0.85); border-bottom-color: transparent; }
  .${annotateSidebarQueueItemClass} > :not(.${annotateSidebarActionsClass}):first-child { font-size: 12px; line-height: 1.4; color: var(--inspecto-text-primary); word-break: break-word; }
  .${annotateSidebarQueueItemClass} > .${annotateSidebarQueueMetaClass} { order: 2; font-size: 10px; line-height: 1.35; color: var(--inspecto-text-tertiary); }
  .${annotateQueueListClass} > .${annotateSidebarQueueItemClass}:last-child { border-bottom: none; padding-bottom: 2px; }

  .${annotateSidebarTargetItemClass} {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: "label action";
    column-gap: 10px;
    align-items: center;
    padding: 6px 0;
    border: none;
    border-radius: 0;
    border-bottom: 1px solid rgba(127, 127, 127, 0.16);
    background: transparent;
  }

  .${annotateTargetListClass} > .${annotateSidebarTargetItemClass}:last-child { border-bottom: none; padding-bottom: 0; }

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

  .${annotateSidebarFooterClass} { display: flex; flex-direction: column; gap: 8px; padding-top: 2px; }
  .${annotateSidebarFooterClass} .${annotateSidebarActionsClass} { justify-content: flex-end; align-items: stretch; }
  .${annotateSidebarActionsClass} { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

  .${annotateSidebarButtonClass} {
    appearance: none;
    border: 1px solid var(--inspecto-border-subtle);
    background: rgba(255, 255, 255, 0.04);
    color: var(--inspecto-text-primary);
    border-radius: var(--inspecto-radius-pill);
    padding: 7px 10px;
    font: inherit;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
  }

  .${annotateSidebarButtonClass}[data-role="mode"][data-selected="true"] { background: rgba(255, 255, 255, 0.1); color: #ffffff; border-color: transparent; }
  .${annotateSidebarSectionClass}[data-variant="modes"] .${annotateSidebarActionsClass} { gap: 4px; padding: 4px; border: 1px solid var(--inspecto-border-muted); border-radius: var(--inspecto-radius-pill); background: rgba(255, 255, 255, 0.03); flex-wrap: nowrap; }
  .${annotateSidebarSectionClass}[data-variant="modes"] .${annotateSidebarButtonClass}[data-role="mode"] { flex: 1 1 0; justify-content: center; padding: 8px 10px; background: transparent; border-color: transparent; color: var(--inspecto-text-secondary); }
  .${annotateSidebarHeaderClass} .${annotateSidebarButtonClass} { width: 30px; height: 30px; padding: 0; border-radius: var(--inspecto-radius-pill); display: inline-flex; align-items: center; justify-content: center; font-size: 12px; line-height: 1; flex: 0 0 auto; }
  .${annotateSidebarHeaderClass} .${runtimeToggleClass} { overflow: visible; }
  .${annotateSidebarHeaderClass} [data-inspecto-annotate-header-actions="true"] { padding: 4px; border-radius: 999px; background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.05); gap: 4px; flex-wrap: nowrap; flex: 0 0 auto; margin-top: 1px; }
  .${annotateSidebarButtonClass}:hover { background: var(--inspecto-surface-hover); color: #ffffff; border-color: transparent; transform: translateY(-1px); }
  .${annotateSidebarButtonClass}:disabled { opacity: 0.5; cursor: not-allowed; }
  .${annotateSidebarClass} .${annotateSidebarButtonClass}.primary { background: linear-gradient(180deg, var(--inspecto-accent-primary) 0%, var(--inspecto-accent-primary-strong) 100%); color: #ffffff; border-color: transparent; box-shadow: var(--inspecto-shadow-accent); }
  .${annotateSidebarFooterClass} .${annotateSidebarButtonClass} { min-height: 36px; padding: 0 12px; font-size: 11px; font-weight: 600; border-radius: var(--inspecto-radius-pill); }
  .${annotateSidebarFooterClass} .${annotateSidebarButtonClass}[data-role="raw-preview"] { min-width: 48px; justify-content: center; color: var(--inspecto-text-secondary); background: rgba(255, 255, 255, 0.045); }
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
`
