import { describe, expect, it } from 'vitest'
import {
  getInspectHiddenReason,
  getLauncherViewState,
  shouldShowInspectMode,
  type LauncherViewStateInput,
} from '../src/runtime/launcher-view-state.js'

function createInput(overrides: Partial<LauncherViewStateInput> = {}): LauncherViewStateInput {
  return {
    active: false,
    disabled: false,
    mode: 'inspect',
    ide: 'vscode',
    ideConnected: true,
    ideConnectionKnown: true,
    deliveryMode: 'ide',
    launcherPanelOpen: false,
    hotKeysDisabled: false,
    hotKeyLabel: 'Alt',
    ...overrides,
  }
}

describe('launcher view state', () => {
  it('describes the ready launcher state', () => {
    expect(getLauncherViewState(createInput())).toMatchObject({
      title: 'Inspecto',
      indicatorState: 'ready',
      stateLabel: 'Ready',
      badgeClasses: { active: false, disabled: false },
      panelDisplay: 'none',
      pauseLabel: 'Pause selection',
      pauseAriaPressed: 'false',
      hotkeyHint: 'Hotkey: Alt for quick jump',
      inspectButtonDisplay: 'inline-flex',
      annotateButtonDisplay: 'inline-flex',
      inspectButtonActive: false,
      annotateButtonActive: false,
    })
  })

  it('describes paused launcher controls', () => {
    expect(
      getLauncherViewState(createInput({ disabled: true, launcherPanelOpen: true })),
    ).toMatchObject({
      indicatorState: 'paused',
      stateLabel: 'Selection paused',
      badgeClasses: { active: false, disabled: true },
      panelDisplay: 'flex',
      pauseLabel: 'Resume selection',
      pauseAriaPressed: 'true',
      inspectButtonDisplay: 'none',
      annotateButtonDisplay: 'none',
    })
  })

  it('marks annotate mode as active even before inspect mode is active', () => {
    expect(getLauncherViewState(createInput({ mode: 'annotate' }))).toMatchObject({
      indicatorState: 'annotate',
      stateLabel: 'Annotate mode',
      badgeClasses: { active: true, disabled: false },
      inspectButtonActive: false,
      annotateButtonActive: false,
    })
  })

  it('hides inspect mode when IDE integration is disabled', () => {
    const input = createInput({ ide: 'none' })

    expect(getInspectHiddenReason(input)).toBe('ide-disabled')
    expect(shouldShowInspectMode(input)).toBe(false)
    expect(getLauncherViewState(input)).toMatchObject({
      inspectButtonDisplay: 'none',
      inspectNoticeDisplay: '',
      inspectNoticeText: 'Inspect is hidden because IDE integration is disabled.',
    })
  })

  it('hides inspect mode for disconnected MCP delivery', () => {
    const input = createInput({
      deliveryMode: 'mcp',
      ideConnected: false,
      ideConnectionKnown: true,
    })

    expect(getInspectHiddenReason(input)).toBe('ide-disconnected')
    expect(shouldShowInspectMode(input)).toBe(false)
    expect(getLauncherViewState(input).inspectNoticeText).toBe(
      'Inspect needs an IDE connection in MCP mode.',
    )
  })

  it('uses disabled hotkey copy when hotkeys are unavailable', () => {
    expect(getLauncherViewState(createInput({ hotKeysDisabled: true }))).toMatchObject({
      hotkeyHint: 'Hotkey disabled. Open the launcher to choose Inspect or Annotate.',
    })
  })
})
