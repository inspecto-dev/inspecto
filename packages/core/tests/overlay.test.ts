import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createOverlay } from '../src/overlay.js'
import { overlayClass, tooltipClass } from '../src/styles.js'

describe('Overlay DOM Interaction', () => {
  let shadowRoot: ShadowRoot
  let host: HTMLElement

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    shadowRoot = host.attachShadow({ mode: 'open' })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('should initialize overlay and tooltip hidden in shadow root', () => {
    const { show, hide } = createOverlay(shadowRoot)

    const overlay = shadowRoot.querySelector(`.${overlayClass}`) as HTMLElement
    const tooltip = shadowRoot.querySelector(`.${tooltipClass}`) as HTMLElement

    expect(overlay).not.toBeNull()
    expect(tooltip).not.toBeNull()
    expect(overlay.style.display).toBe('none')
  })

  it('should update position and show elements when show() is called', () => {
    const { show } = createOverlay(shadowRoot)

    // Create a mock target element
    const target = document.createElement('button')
    target.id = 'my-btn'
    target.className = 'btn primary'
    document.body.appendChild(target)

    // Mock getBoundingClientRect
    target.getBoundingClientRect = () => ({
      x: 100,
      y: 200,
      width: 120,
      height: 40,
      top: 200,
      right: 220,
      bottom: 240,
      left: 100,
      toJSON: () => {},
    })

    show(target, '/src/App.tsx:10:5')

    const overlay = shadowRoot.querySelector(`.${overlayClass}`) as HTMLElement
    const tooltip = shadowRoot.querySelector(`.${tooltipClass}`) as HTMLElement

    // Check overlay positioning
    expect(overlay.style.display).toBe('block')
    expect(overlay.style.left).toBe('100px')
    expect(overlay.style.top).toBe('200px')
    expect(overlay.style.width).toBe('120px')
    expect(overlay.style.height).toBe('40px')

    // Check tooltip visibility
    expect(tooltip.style.visibility).toBe('visible')

    // Check if texts are populated correctly
    expect(tooltip.textContent).toContain('button') // tag name
    expect(tooltip.textContent).toContain('#my-btn') // ID
    expect(tooltip.textContent).toContain('.btn.primary') // classes
    expect(tooltip.textContent).toContain('120 × 40') // dimensions
    expect(tooltip.textContent).toContain('/src/App.tsx:10:5') // source label
  })

  it('should hide overlay and tooltip when hide() is called', () => {
    const { show, hide } = createOverlay(shadowRoot)

    const target = document.createElement('div')
    document.body.appendChild(target)

    target.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      top: 0,
      right: 10,
      bottom: 10,
      left: 0,
      toJSON: () => {},
    })

    show(target, 'test')
    hide()

    const overlay = shadowRoot.querySelector(`.${overlayClass}`) as HTMLElement
    const tooltip = shadowRoot.querySelector(`.${tooltipClass}`) as HTMLElement

    expect(overlay.style.display).toBe('none')
    expect(tooltip.style.display).toBe('none')
  })
})
