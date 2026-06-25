import { describe, expect, it } from 'vitest'
import {
  syncCssToggleButton,
  syncRuntimeToggleButton,
} from '../src/features/inspect/menu/header-actions.js'

function createButton(role: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.dataset.role = role
  return button
}

function actionRoles(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('button')).map(
    button => button.getAttribute('data-role') ?? '',
  )
}

describe('inspect menu header actions', () => {
  it('keeps css, runtime, and open actions in their header order', () => {
    const headerActions = document.createElement('div')
    const cssToggleButton = createButton('css-context-toggle')
    const runtimeToggleButton = createButton('runtime-context-toggle')
    const openButton = createButton('open-icon')

    headerActions.appendChild(openButton)

    syncRuntimeToggleButton({
      headerActions,
      runtimeToggleButton,
      openButton,
      canAttachRuntimeContext: true,
    })
    syncCssToggleButton({
      headerActions,
      cssToggleButton,
      runtimeToggleButton,
      openButton,
      canAttachCssContext: true,
    })

    expect(actionRoles(headerActions)).toEqual([
      'css-context-toggle',
      'runtime-context-toggle',
      'open-icon',
    ])
  })

  it('inserts runtime before open when runtime becomes available later', () => {
    const headerActions = document.createElement('div')
    const runtimeToggleButton = createButton('runtime-context-toggle')
    const openButton = createButton('open-icon')

    headerActions.appendChild(openButton)

    syncRuntimeToggleButton({
      headerActions,
      runtimeToggleButton,
      openButton,
      canAttachRuntimeContext: true,
    })

    expect(actionRoles(headerActions)).toEqual(['runtime-context-toggle', 'open-icon'])
    expect(runtimeToggleButton.hidden).toBe(false)
  })

  it('removes unavailable optional actions from the header', () => {
    const headerActions = document.createElement('div')
    const cssToggleButton = createButton('css-context-toggle')
    const runtimeToggleButton = createButton('runtime-context-toggle')
    const openButton = createButton('open-icon')

    headerActions.append(cssToggleButton, runtimeToggleButton, openButton)

    syncCssToggleButton({
      headerActions,
      cssToggleButton,
      runtimeToggleButton,
      openButton,
      canAttachCssContext: false,
    })
    syncRuntimeToggleButton({
      headerActions,
      runtimeToggleButton,
      openButton,
      canAttachRuntimeContext: false,
    })

    expect(actionRoles(headerActions)).toEqual(['open-icon'])
    expect(cssToggleButton.parentElement).toBeNull()
    expect(runtimeToggleButton.parentElement).toBeNull()
  })
})
