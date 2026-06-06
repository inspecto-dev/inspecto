import { describe, expect, it, vi } from 'vitest'
import { createLauncherDragController } from '../src/runtime/launcher-drag.js'

function createBadge(): HTMLDivElement {
  const badge = document.createElement('div')
  Object.defineProperty(badge, 'offsetWidth', { configurable: true, value: 40 })
  Object.defineProperty(badge, 'offsetHeight', { configurable: true, value: 40 })
  badge.getBoundingClientRect = () =>
    ({
      x: 100,
      y: 100,
      left: 100,
      top: 100,
      right: 140,
      bottom: 140,
      width: 40,
      height: 40,
      toJSON: () => {},
    }) as DOMRect
  return badge
}

describe('createLauncherDragController', () => {
  it('starts dragging only after the pointer moves beyond the threshold', () => {
    const badge = createBadge()
    document.body.appendChild(badge)
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 300 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 240 })
    const controller = createLauncherDragController(badge)
    controller.attach()

    badge.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 110, clientY: 110 }),
    )
    document.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 112, clientY: 112 }),
    )

    expect(controller.isDragging()).toBe(false)
    expect(badge.style.left).toBe('')

    document.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 170, clientY: 190 }),
    )

    expect(controller.isDragging()).toBe(true)
    expect(badge.style.left).toBe('160px')
    expect(badge.style.top).toBe('180px')
    expect(badge.style.right).toBe('auto')
    expect(badge.style.bottom).toBe('auto')
  })

  it('clamps the dragged launcher within the viewport', () => {
    const badge = createBadge()
    document.body.appendChild(badge)
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 180 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 160 })
    const controller = createLauncherDragController(badge)
    controller.attach()

    badge.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 110, clientY: 110 }),
    )
    document.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 400, clientY: 400 }),
    )

    expect(badge.style.left).toBe('140px')
    expect(badge.style.top).toBe('120px')
  })

  it('ignores drag starts from launcher panel actions', () => {
    const badge = createBadge()
    const action = document.createElement('button')
    action.dataset.inspectoLauncherAction = 'pause'
    badge.appendChild(action)
    document.body.appendChild(badge)
    const controller = createLauncherDragController(badge)
    controller.attach()

    action.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 110, clientY: 110 }),
    )
    document.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 170, clientY: 190 }),
    )

    expect(controller.isDragging()).toBe(false)
    expect(badge.style.left).toBe('')
  })

  it('resets the dragging flag after drag end', () => {
    vi.useFakeTimers()
    const badge = createBadge()
    document.body.appendChild(badge)
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 300 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 240 })
    const controller = createLauncherDragController(badge)
    controller.attach()

    badge.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 110, clientY: 110 }),
    )
    document.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 170, clientY: 190 }),
    )
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    expect(controller.isDragging()).toBe(true)
    vi.runAllTimers()
    expect(controller.isDragging()).toBe(false)
    vi.useRealTimers()
  })
})
