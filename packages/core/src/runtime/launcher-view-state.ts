import type { IdeType } from '@inspecto-dev/types'
import { pauseIconSvg, playIconSvg } from '../shared/icons.js'
import { t } from '../shared/i18n.js'

export type InspectHiddenReason = 'ide-disabled' | 'ide-disconnected'

export type LauncherViewStateInput = {
  active: boolean
  disabled: boolean
  mode: 'inspect' | 'annotate'
  ide: IdeType
  ideConnected: boolean
  ideConnectionKnown: boolean
  deliveryMode: 'ide' | 'mcp'
  launcherPanelOpen: boolean
  hotKeysDisabled: boolean
  hotKeyLabel: string
}

export type LauncherViewState = {
  title: string
  indicatorState: 'paused' | 'annotate' | 'inspect' | 'ready'
  stateLabel: string
  badgeClasses: {
    active: boolean
    disabled: boolean
  }
  panelDisplay: 'flex' | 'none'
  pauseLabel: string
  pauseAriaPressed: 'true' | 'false'
  pauseIconSvg: string
  hotkeyHint: string
  inspectHiddenReason: InspectHiddenReason | null
  inspectButtonDisplay: 'inline-flex' | 'none'
  inspectNoticeDisplay: '' | 'none'
  inspectNoticeText: string
  annotateButtonDisplay: 'inline-flex' | 'none'
  inspectButtonActive: boolean
  annotateButtonActive: boolean
}

export function getInspectHiddenReason(
  state: Pick<
    LauncherViewStateInput,
    'ide' | 'deliveryMode' | 'ideConnectionKnown' | 'ideConnected'
  >,
): InspectHiddenReason | null {
  if (state.ide === 'none') return 'ide-disabled'
  if (state.deliveryMode === 'mcp' && state.ideConnectionKnown && !state.ideConnected) {
    return 'ide-disconnected'
  }
  return null
}

export function shouldShowInspectMode(
  state: Pick<
    LauncherViewStateInput,
    'ide' | 'deliveryMode' | 'ideConnectionKnown' | 'ideConnected'
  >,
): boolean {
  return getInspectHiddenReason(state) === null
}

export function getLauncherViewState(input: LauncherViewStateInput): LauncherViewState {
  const inspectHiddenReason = getInspectHiddenReason(input)
  const isPaused = input.disabled
  const pauseLabel = isPaused ? t('launcher.action.resume.title') : t('launcher.action.pause.title')

  let indicatorState: LauncherViewState['indicatorState']
  let stateLabel: string
  if (input.disabled) {
    indicatorState = 'paused'
    stateLabel = t('launcher.state.paused')
  } else if (input.mode === 'annotate') {
    indicatorState = 'annotate'
    stateLabel = t('launcher.state.annotate')
  } else if (input.active) {
    indicatorState = 'inspect'
    stateLabel = t('launcher.state.inspect')
  } else {
    indicatorState = 'ready'
    stateLabel = t('launcher.state.ready')
  }

  return {
    title: t('launcher.title'),
    indicatorState,
    stateLabel,
    badgeClasses: {
      active: !input.disabled && (input.active || input.mode === 'annotate'),
      disabled: input.disabled,
    },
    panelDisplay: input.launcherPanelOpen ? 'flex' : 'none',
    pauseLabel,
    pauseAriaPressed: isPaused ? 'true' : 'false',
    pauseIconSvg: isPaused ? playIconSvg : pauseIconSvg,
    hotkeyHint: input.hotKeysDisabled
      ? t('launcher.hint.hotkeyDisabled')
      : t('launcher.hint.hotkeyQuickJump', { hotkey: input.hotKeyLabel }),
    inspectHiddenReason,
    inspectButtonDisplay: input.disabled || inspectHiddenReason ? 'none' : 'inline-flex',
    inspectNoticeDisplay: !input.disabled && inspectHiddenReason ? '' : 'none',
    inspectNoticeText: inspectHiddenReason
      ? t(`launcher.inspectUnavailable.${inspectHiddenReason}`)
      : '',
    annotateButtonDisplay: input.disabled ? 'none' : 'inline-flex',
    inspectButtonActive: !input.disabled && input.active && input.mode === 'inspect',
    annotateButtonActive: !input.disabled && input.active && input.mode === 'annotate',
  }
}
