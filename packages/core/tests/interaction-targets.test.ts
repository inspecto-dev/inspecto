import { describe, expect, it } from 'vitest'
import { isFloatingUiEventTarget } from '../src/runtime/interaction-targets.js'

describe('interaction targets', () => {
  it('detects events inside dialog and menu surfaces', () => {
    document.body.innerHTML = `
      <div role="dialog">
        <button id="dialog-button">Dialog</button>
      </div>
      <div role="menu">
        <button id="menu-button">Menu</button>
      </div>
    `

    expect(isFloatingUiEventTarget(document.querySelector('#dialog-button'))).toBe(true)
    expect(isFloatingUiEventTarget(document.querySelector('#menu-button'))).toBe(true)
  })

  it('detects events inside Radix floating wrappers and focus guards', () => {
    document.body.innerHTML = `
      <div data-radix-popper-content-wrapper>
        <button id="popover-button">Popover</button>
      </div>
      <div data-radix-focus-guard>
        <button id="guard-button">Guard</button>
      </div>
    `

    expect(isFloatingUiEventTarget(document.querySelector('#popover-button'))).toBe(true)
    expect(isFloatingUiEventTarget(document.querySelector('#guard-button'))).toBe(true)
  })

  it('ignores plain elements and non-element event targets', () => {
    const plain = document.createElement('button')

    expect(isFloatingUiEventTarget(plain)).toBe(false)
    expect(isFloatingUiEventTarget(document.createTextNode('text'))).toBe(false)
    expect(isFloatingUiEventTarget(null)).toBe(false)
  })
})
