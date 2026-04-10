import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createAnnotateOverlay } from '../src/annotate-overlay.js'
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

  it('truncates extremely long class names in the inspect tooltip', () => {
    const { show } = createOverlay(shadowRoot)

    const target = document.createElement('button')
    target.className =
      'document_docNavBar__L2vQJ document_hasDoc__jpd6x documentWithTOC extremely_long_navigation_header_selector_that_should_not_expand_the_tooltip_past_the_viewport'
    document.body.appendChild(target)

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

    show(target, '/src/App.tsx:58:11')

    const tooltip = shadowRoot.querySelector(`.${tooltipClass}`) as HTMLElement

    expect(tooltip.textContent).toContain('.document_docNavBar__L2vQJ')
    expect(tooltip.textContent).toContain('...')
    expect(tooltip.textContent).not.toContain(
      'extremely_long_navigation_header_selector_that_should_not_expand_the_tooltip_past_the_viewport',
    )
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

  it('renders numbered markers for selected targets', () => {
    const target = document.createElement('button')
    document.body.appendChild(target)
    target.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        width: 100,
        height: 30,
        right: 110,
        bottom: 50,
        toJSON: () => {},
      }) as DOMRect

    const overlay = createAnnotateOverlay(shadowRoot)
    overlay.render([{ id: 'target-1', element: target, order: 1 }])

    const box = shadowRoot.querySelector('[data-inspecto-annotate-overlay-box]') as HTMLElement
    const order = shadowRoot.querySelector('[data-inspecto-annotate-overlay-order]') as HTMLElement

    expect(box).not.toBeNull()
    expect(box.style.position).toBe('absolute')
    expect(box.style.left).toBe('10px')
    expect(box.style.top).toBe('20px')
    expect(box.style.width).toBe('100px')
    expect(box.style.height).toBe('30px')
    expect(order.textContent).toBe('1')
  })

  it('renders a near-field composer beside the selected target', () => {
    const target = document.createElement('button')
    document.body.appendChild(target)
    target.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        width: 100,
        height: 30,
        right: 110,
        bottom: 50,
        toJSON: () => {},
      }) as DOMRect

    const overlay = createAnnotateOverlay(shadowRoot)
    overlay.render([{ id: 'current', element: target, order: 1 }], {
      targetLabel: '<App> button',
      note: '',
    })

    const composer = shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement
    const composerHeader = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer-header]',
    ) as HTMLElement
    expect(composer).not.toBeNull()
    expect(composerHeader.textContent).toContain('<App> button')
    expect(composerHeader.textContent).not.toContain('/src/App.tsx:10:5')
    expect(composer.style.transition).toContain('left 160ms')
    expect(composer.style.opacity).toBe('1')
  })

  it('renders a secondary source anchor in the composer header when target meta is provided', () => {
    const target = document.createElement('button')
    document.body.appendChild(target)
    target.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        width: 100,
        height: 30,
        right: 110,
        bottom: 50,
        toJSON: () => {},
      }) as DOMRect

    const overlay = createAnnotateOverlay(shadowRoot)
    overlay.render([{ id: 'current', element: target, order: 1 }], {
      targetLabel: 'button.primary',
      targetMeta: 'App.tsx:10:5',
      note: '',
    })

    const composerHeader = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer-header]',
    ) as HTMLElement

    expect(composerHeader.textContent).toContain('button.primary')
    expect(composerHeader.textContent).toContain('App.tsx:10:5')
  })

  it('renders an open-in-editor icon in the composer header and wires the callback', () => {
    const target = document.createElement('button')
    document.body.appendChild(target)
    target.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        width: 100,
        height: 30,
        right: 110,
        bottom: 50,
        toJSON: () => {},
      }) as DOMRect

    const onOpenInEditor = vi.fn()
    const overlay = createAnnotateOverlay(shadowRoot)
    overlay.render([{ id: 'current', element: target, order: 1 }], {
      targetLabel: 'button',
      note: '',
      onOpenInEditor,
    })

    const openButton = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer-header] button[aria-label="Open in Editor"]',
    ) as HTMLButtonElement

    expect(openButton).not.toBeNull()
    expect(openButton.textContent).toBe('↗')
    openButton.click()
    expect(onOpenInEditor).toHaveBeenCalledTimes(1)
  })

  it('styles the composer open icon with the same explicit border tokens as the menu header icon', () => {
    const target = document.createElement('button')
    document.body.appendChild(target)
    target.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        width: 100,
        height: 30,
        right: 110,
        bottom: 50,
        toJSON: () => {},
      }) as DOMRect

    const overlay = createAnnotateOverlay(shadowRoot)
    overlay.render([{ id: 'current', element: target, order: 1 }], {
      targetLabel: 'button',
      note: '',
    })

    const openButton = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer-header] button[aria-label="Open in Editor"]',
    ) as HTMLButtonElement

    expect(openButton.style.borderWidth).toBe('1px')
    expect(openButton.style.borderStyle).toBe('solid')
    expect(openButton.style.borderColor).toBe('var(--inspecto-border-subtle)')
  })

  it('keeps the composer header icon order aligned with the inspect menu header', () => {
    const target = document.createElement('button')
    document.body.appendChild(target)
    target.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        width: 100,
        height: 30,
        right: 110,
        bottom: 50,
        toJSON: () => {},
      }) as DOMRect

    const overlay = createAnnotateOverlay(shadowRoot)
    overlay.render([{ id: 'current', element: target, order: 1 }], {
      targetLabel: 'button',
      note: '',
      canAttachScreenshotContext: true,
      canAttachCssContext: true,
      canAttachRuntimeContext: true,
    })

    const labels = Array.from(
      shadowRoot.querySelectorAll('[data-inspecto-annotate-composer-header] button'),
    ).map(button => button.getAttribute('aria-label') ?? button.textContent ?? '')

    expect(labels).toEqual([
      'Attach screenshot context',
      'Attach CSS context',
      'Attach runtime context',
      'Open in Editor',
    ])
  })

  it('places the composer to the left of the target when the right edge is constrained', () => {
    const target = document.createElement('button')
    document.body.appendChild(target)
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
    target.getBoundingClientRect = () =>
      ({
        x: 860,
        y: 120,
        left: 860,
        top: 120,
        width: 120,
        height: 36,
        right: 980,
        bottom: 156,
        toJSON: () => {},
      }) as DOMRect

    const overlay = createAnnotateOverlay(shadowRoot)
    overlay.render([{ id: 'current', element: target, order: 1 }], {
      targetLabel: 'button',
      note: '',
    })

    const composer = shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement
    expect(composer.style.left).toBe('506px')
    expect(composer.style.top).toBe('18px')
  })

  it('places the composer above the target when there is not enough space below', () => {
    const target = document.createElement('button')
    document.body.appendChild(target)
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
    target.getBoundingClientRect = () =>
      ({
        x: 520,
        y: 650,
        left: 520,
        top: 650,
        width: 140,
        height: 36,
        right: 660,
        bottom: 686,
        toJSON: () => {},
      }) as DOMRect

    const overlay = createAnnotateOverlay(shadowRoot)
    overlay.render([{ id: 'current', element: target, order: 1 }], {
      targetLabel: 'button',
      note: '',
    })

    const composer = shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement
    expect(composer.style.top).toBe('396px')
  })

  it('keeps inline targets below when there is enough centered space', () => {
    const target = document.createElement('strong')
    document.body.appendChild(target)
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 })
    target.getBoundingClientRect = () =>
      ({
        x: 320,
        y: 210,
        left: 320,
        top: 210,
        width: 250,
        height: 36,
        right: 570,
        bottom: 246,
        toJSON: () => {},
      }) as DOMRect

    const overlay = createAnnotateOverlay(shadowRoot)
    overlay.render([{ id: 'current', element: target, order: 4 }], {
      targetLabel: 'strong',
      note: '',
    })

    const composer = shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement
    expect(composer.style.left).toBe('275px')
    expect(composer.style.top).toBe('260px')
  })

  it('keeps saved pins visible even when no composer is shown', () => {
    const first = document.createElement('button')
    const second = document.createElement('div')
    document.body.append(first, second)
    first.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        width: 100,
        height: 30,
        right: 110,
        bottom: 50,
        toJSON: () => {},
      }) as DOMRect
    second.getBoundingClientRect = () =>
      ({
        x: 140,
        y: 60,
        left: 140,
        top: 60,
        width: 80,
        height: 24,
        right: 220,
        bottom: 84,
        toJSON: () => {},
      }) as DOMRect

    const overlay = createAnnotateOverlay(shadowRoot)
    overlay.render([
      { id: 'saved-1', element: first, order: 1, state: 'saved' },
      { id: 'saved-2', element: second, order: 2, state: 'saved' },
    ])

    const boxes = shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')
    const composer = shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement

    expect(boxes).toHaveLength(2)
    expect(composer.style.display).toBe('none')
  })

  it('keeps an empty-note saved pin visible after re-rendering without composer options', () => {
    const target = document.createElement('button')
    document.body.append(target)
    target.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        width: 100,
        height: 30,
        right: 110,
        bottom: 50,
        toJSON: () => {},
      }) as DOMRect

    const overlay = createAnnotateOverlay(shadowRoot)
    overlay.render([{ id: 'draft-1', element: target, order: 1, state: 'current' }], {
      targetId: 'target-1',
      targetLabel: 'button',
      note: '',
    })

    overlay.render([{ id: 'saved-1', element: target, order: 1, state: 'saved', note: '' }])

    const boxes = shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')
    const badge = shadowRoot.querySelector('[data-inspecto-annotate-overlay-order]') as HTMLElement
    const composer = shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement

    expect(boxes).toHaveLength(1)
    expect(badge.textContent).toBe('1')
    expect(composer.style.display).toBe('none')
  })

  it('styles saved pins lighter than the current draft pin', () => {
    const saved = document.createElement('button')
    const current = document.createElement('div')
    document.body.append(saved, current)
    saved.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        width: 100,
        height: 30,
        right: 110,
        bottom: 50,
        toJSON: () => {},
      }) as DOMRect
    current.getBoundingClientRect = () =>
      ({
        x: 140,
        y: 60,
        left: 140,
        top: 60,
        width: 80,
        height: 24,
        right: 220,
        bottom: 84,
        toJSON: () => {},
      }) as DOMRect

    const overlay = createAnnotateOverlay(shadowRoot)
    overlay.render([
      { id: 'saved-1', element: saved, order: 1, state: 'saved' },
      { id: 'current-1', element: current, order: 2, state: 'current' },
    ])

    const boxes = shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')
    const savedBox = boxes[0] as HTMLElement
    const currentBox = boxes[1] as HTMLElement
    const savedBadge = savedBox.querySelector(
      '[data-inspecto-annotate-overlay-order]',
    ) as HTMLElement
    const currentBadge = currentBox.querySelector(
      '[data-inspecto-annotate-overlay-order]',
    ) as HTMLElement

    expect(savedBox.style.background).not.toBe(currentBox.style.background)
    expect(savedBox.style.border).not.toBe(currentBox.style.border)
    expect(savedBadge.style.background).not.toBe(currentBadge.style.background)
    expect(currentBox.style.boxShadow).toContain('rgba')
    expect(savedBox.style.boxShadow).toBe('none')
  })

  it('shows a note preview when hovering a saved pin', () => {
    const saved = document.createElement('button')
    document.body.append(saved)
    saved.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        width: 100,
        height: 30,
        right: 110,
        bottom: 50,
        toJSON: () => {},
      }) as DOMRect

    const overlay = createAnnotateOverlay(shadowRoot)
    overlay.render([
      { id: 'saved-1', element: saved, order: 1, state: 'saved', note: 'Tighten spacing.' },
    ])

    const savedBox = shadowRoot.querySelector('[data-inspecto-annotate-overlay-box]') as HTMLElement
    const preview = shadowRoot.querySelector('[data-inspecto-annotate-preview]') as HTMLElement

    expect(preview.style.display).toBe('none')

    savedBox.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

    expect(preview.style.display).toBe('block')
    expect(preview.textContent).toContain('Tighten spacing.')

    savedBox.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))

    expect(preview.style.display).toBe('none')
  })

  it('switches a saved pin badge into edit mode on hover', () => {
    const saved = document.createElement('button')
    document.body.append(saved)
    saved.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        width: 100,
        height: 30,
        right: 110,
        bottom: 50,
        toJSON: () => {},
      }) as DOMRect

    const overlay = createAnnotateOverlay(shadowRoot)
    overlay.render([
      { id: 'saved-1', element: saved, order: 1, state: 'saved', note: 'Tighten spacing.' },
    ])

    const savedBox = shadowRoot.querySelector('[data-inspecto-annotate-overlay-box]') as HTMLElement
    const badge = savedBox.querySelector('[data-inspecto-annotate-overlay-order]') as HTMLElement

    expect(badge.textContent).toBe('1')
    savedBox.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    expect(badge.textContent).toBe('✎')
    savedBox.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    expect(badge.textContent).toBe('1')
  })
})
