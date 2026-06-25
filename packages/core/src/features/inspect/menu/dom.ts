import { createAskInput, createMenuSection } from './helpers.js'
import { loadingSpinnerClass, menuClass } from '../../../shared/styles/index.js'

export type IntentMenuDom = {
  menu: HTMLDivElement
  runtimeContextSection: HTMLElement
  askAiSection: HTMLElement
  actionsSection: HTMLElement
  input: HTMLInputElement
  inputWrapper: HTMLElement
  sendIcon: HTMLElement
  loadingElement: HTMLDivElement
}

export function createIntentMenuDom(askPlaceholder?: string): IntentMenuDom {
  const menu = document.createElement('div')
  menu.className = menuClass
  menu.style.width = '304px'
  menu.style.maxWidth = 'calc(100vw - 16px)'
  menu.style.boxSizing = 'border-box'
  menu.style.pointerEvents = 'auto'

  const runtimeContextSection = createMenuSection()
  runtimeContextSection.hidden = true

  const askAiSection = createMenuSection()
  const { input, inputWrapper, sendIcon } = createAskInput(askPlaceholder)
  askAiSection.appendChild(inputWrapper)

  const loadingElement = document.createElement('div')
  loadingElement.className = loadingSpinnerClass
  askAiSection.appendChild(loadingElement)

  const actionsSection = createMenuSection()

  return {
    menu,
    runtimeContextSection,
    askAiSection,
    actionsSection,
    input,
    inputWrapper,
    sendIcon,
    loadingElement,
  }
}
