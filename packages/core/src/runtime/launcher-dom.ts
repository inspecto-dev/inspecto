import { badgeClass } from '../shared/styles/index.js'
import { t } from '../shared/i18n.js'
import { pauseIconSvg } from '../shared/icons.js'

export type LauncherDom = {
  badge: HTMLDivElement
  inspectButton: HTMLButtonElement
  annotateButton: HTMLButtonElement
  pauseButton: HTMLButtonElement
}

export function createLauncherDom(): LauncherDom {
  const badge = document.createElement('div')
  badge.className = badgeClass
  // Start with visibility hidden to prevent FOUC before shadow DOM styles are parsed.
  badge.style.visibility = 'hidden'

  const indicator = document.createElement('span')
  indicator.className = `${badgeClass}-indicator`
  indicator.dataset.inspectoLauncherIndicator = 'true'
  indicator.dataset.state = 'ready'

  const stateSpan = document.createElement('span')
  stateSpan.className = `${badgeClass}-state`
  stateSpan.dataset.inspectoLauncherState = 'true'
  stateSpan.hidden = true

  const titleSpan = document.createElement('span')
  titleSpan.className = `${badgeClass}-title`
  titleSpan.textContent = t('launcher.title')

  const eyes = document.createElement('span')
  eyes.className = `${badgeClass}-eyes`
  eyes.setAttribute('aria-hidden', 'true')
  eyes.append(createEye(), createEye())

  const content = document.createElement('div')
  content.className = `${badgeClass}-content`
  const titleBlock = document.createElement('div')
  titleBlock.className = `${badgeClass}-label`

  const panel = document.createElement('div')
  panel.className = `${badgeClass}-panel`
  panel.dataset.inspectoLauncherPanel = 'true'

  const panelHeader = document.createElement('div')
  panelHeader.className = `${badgeClass}-panel-header`
  const panelHeaderCopy = document.createElement('div')
  panelHeaderCopy.className = `${badgeClass}-panel-header-copy`

  const panelTitle = document.createElement('div')
  panelTitle.dataset.inspectoLauncherPanelTitle = 'true'
  panelTitle.textContent = t('launcher.panel.title')
  const panelSubtitle = document.createElement('div')
  panelSubtitle.dataset.inspectoLauncherPanelSubtitle = 'true'
  panelSubtitle.textContent = t('launcher.panel.subtitle')
  panelHeaderCopy.append(panelTitle, panelSubtitle)

  const panelHeaderActions = document.createElement('div')
  panelHeaderActions.className = `${badgeClass}-panel-header-actions`

  const modeGroup = document.createElement('div')
  modeGroup.className = `${badgeClass}-panel-group`

  const inspectButton = createModeButton(
    'inspect',
    t('launcher.action.inspect.title'),
    t('launcher.action.inspect.description'),
  )
  const annotateButton = createModeButton(
    'annotate',
    t('launcher.action.annotate.title'),
    t('launcher.action.annotate.description'),
  )

  const pauseButton = document.createElement('button')
  pauseButton.type = 'button'
  pauseButton.className = `${badgeClass}-panel-toggle-button`
  pauseButton.dataset.inspectoLauncherAction = 'pause'
  pauseButton.setAttribute('aria-label', t('launcher.action.pause.title'))
  pauseButton.setAttribute('aria-pressed', 'false')
  pauseButton.innerHTML = pauseIconSvg

  const pauseText = document.createElement('div')
  pauseText.className = `${badgeClass}-panel-status-text`
  pauseText.dataset.inspectoLauncherPauseText = 'true'

  const hotkeyHint = document.createElement('div')
  hotkeyHint.className = `${badgeClass}-panel-hint`
  hotkeyHint.dataset.inspectoLauncherHint = 'hotkey'

  const utilityGroup = document.createElement('div')
  utilityGroup.className = `${badgeClass}-panel-group`
  utilityGroup.dataset.inspectoLauncherUtilityGroup = 'true'

  const inspectNotice = document.createElement('div')
  inspectNotice.dataset.inspectoLauncherInspectNotice = 'true'

  modeGroup.append(inspectButton, annotateButton)
  panelHeaderActions.append(pauseText, pauseButton)
  panelHeader.append(panelHeaderCopy, panelHeaderActions)
  utilityGroup.append(inspectNotice, hotkeyHint)
  panel.append(panelHeader, modeGroup, utilityGroup)
  titleBlock.append(titleSpan, stateSpan)
  content.append(indicator, titleBlock)
  badge.append(content, eyes, panel)

  return {
    badge,
    inspectButton,
    annotateButton,
    pauseButton,
  }
}

function createEye(): HTMLSpanElement {
  const eye = document.createElement('span')
  eye.className = `${badgeClass}-eye`
  const pupil = document.createElement('span')
  pupil.className = `${badgeClass}-eye-pupil`
  eye.appendChild(pupil)
  return eye
}

function createModeButton(
  action: 'inspect' | 'annotate',
  title: string,
  description: string,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `${badgeClass}-panel-button`
  button.dataset.inspectoLauncherAction = action

  const titleSpan = document.createElement('span')
  titleSpan.dataset.inspectoLauncherTitle = 'true'
  titleSpan.textContent = title
  const descriptionSpan = document.createElement('span')
  descriptionSpan.dataset.inspectoLauncherDescription = 'true'
  descriptionSpan.textContent = description
  button.append(titleSpan, descriptionSpan)

  return button
}
