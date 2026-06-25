type LauncherMode = 'inspect' | 'annotate'

export type LauncherPauseStateInput = {
  value: boolean
  active: boolean
  mode: LauncherMode
  prePauseState: {
    active: boolean
    mode: LauncherMode
  }
  canUseInspectMode: boolean
}

export type LauncherPauseState = {
  active: boolean
  disabled: boolean
  mode: LauncherMode
  launcherPanelOpen: false
  prePauseState: {
    active: boolean
    mode: LauncherMode
  }
  shouldHideOverlay: boolean
  shouldCleanupMenu: boolean
}

export function getLauncherPauseState(input: LauncherPauseStateInput): LauncherPauseState {
  if (input.value) {
    return {
      active: false,
      disabled: true,
      mode: input.mode,
      launcherPanelOpen: false,
      prePauseState: {
        active: input.active,
        mode: input.mode,
      },
      shouldHideOverlay: true,
      shouldCleanupMenu: true,
    }
  }

  return {
    active: input.prePauseState.active,
    disabled: false,
    mode:
      input.prePauseState.mode === 'inspect' && !input.canUseInspectMode
        ? 'annotate'
        : input.prePauseState.mode,
    launcherPanelOpen: false,
    prePauseState: input.prePauseState,
    shouldHideOverlay: false,
    shouldCleanupMenu: false,
  }
}
