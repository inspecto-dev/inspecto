import { describe, expect, it } from 'vitest'
import { getLauncherPauseState } from '../src/runtime/launcher-pause-state.js'

describe('launcher pause state', () => {
  it('captures the current active mode before pausing', () => {
    expect(
      getLauncherPauseState({
        value: true,
        active: true,
        mode: 'inspect',
        prePauseState: { active: false, mode: 'annotate' },
        canUseInspectMode: true,
      }),
    ).toEqual({
      active: false,
      disabled: true,
      mode: 'inspect',
      launcherPanelOpen: false,
      prePauseState: { active: true, mode: 'inspect' },
      shouldHideOverlay: true,
      shouldCleanupMenu: true,
    })
  })

  it('restores the pre-pause state when resuming and inspect is available', () => {
    expect(
      getLauncherPauseState({
        value: false,
        active: false,
        mode: 'annotate',
        prePauseState: { active: true, mode: 'inspect' },
        canUseInspectMode: true,
      }),
    ).toMatchObject({
      active: true,
      disabled: false,
      mode: 'inspect',
      prePauseState: { active: true, mode: 'inspect' },
    })
  })

  it('falls back to annotate when resuming inspect mode without inspect availability', () => {
    expect(
      getLauncherPauseState({
        value: false,
        active: false,
        mode: 'annotate',
        prePauseState: { active: true, mode: 'inspect' },
        canUseInspectMode: false,
      }),
    ).toMatchObject({
      active: true,
      disabled: false,
      mode: 'annotate',
    })
  })
})
