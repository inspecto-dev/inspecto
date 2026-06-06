import { describe, expect, it, vi } from 'vitest'
import { renderOverlayBoxes } from '../src/features/annotate/overlay/boxes.js'
import type { SelectedTargetOverlayEntry } from '../src/features/annotate/overlay/index.js'

const tokens = {
  accentPrimary: () => '#5d52f3',
  accentPrimaryStrong: () => '#4639d7',
  borderSubtle: () => 'rgba(255, 255, 255, 0.08)',
  radiusLg: () => '18px',
  shadowFloating: () => '0 20px 48px rgba(0, 0, 0, 0.28)',
  successColor: () => '#10b981',
  surfaceFloating: () => 'rgba(20, 20, 22, 0.94)',
  textPrimary: () => 'rgba(255, 255, 255, 0.9)',
}

function createTarget(
  id: string,
  rect: Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom' | 'width' | 'height'>,
): SelectedTargetOverlayEntry {
  const element = document.createElement('button')
  element.getBoundingClientRect = () =>
    ({
      x: rect.left,
      y: rect.top,
      ...rect,
      toJSON: () => {},
    }) as DOMRect

  return {
    id,
    element,
    order: 1,
  }
}

describe('annotate overlay boxes', () => {
  it('removes stale boxes and positions current targets', () => {
    const layer = document.createElement('div')
    const preview = document.createElement('div')
    const stale = document.createElement('div')
    const boxes = new Map<string, HTMLDivElement>([['stale', stale]])
    layer.appendChild(stale)

    renderOverlayBoxes({
      layer,
      boxes,
      preview,
      targets: [
        createTarget('current', {
          left: 10,
          top: 20,
          width: 100,
          height: 30,
          right: 110,
          bottom: 50,
        }),
      ],
      tokens,
    })

    const box = layer.querySelector('[data-inspecto-annotate-overlay-box]') as HTMLElement

    expect(boxes.has('stale')).toBe(false)
    expect(stale.parentElement).toBeNull()
    expect(boxes.has('current')).toBe(true)
    expect(box.style.left).toBe('10px')
    expect(box.style.top).toBe('20px')
    expect(box.style.width).toBe('100px')
    expect(box.style.height).toBe('30px')
  })

  it('wires saved pin preview and activation handlers', () => {
    const layer = document.createElement('div')
    const preview = document.createElement('div')
    const boxes = new Map<string, HTMLDivElement>()
    const onActivate = vi.fn()
    const savedTarget = createTarget('saved', {
      left: 10,
      top: 20,
      width: 100,
      height: 30,
      right: 110,
      bottom: 50,
    })

    renderOverlayBoxes({
      layer,
      boxes,
      preview,
      targets: [
        {
          ...savedTarget,
          state: 'saved',
          note: 'Tighten spacing.',
          onActivate,
        },
      ],
      tokens,
    })

    const box = layer.querySelector('[data-inspecto-annotate-overlay-box]') as HTMLElement
    const badge = box.querySelector('[data-inspecto-annotate-overlay-order]') as HTMLElement

    expect(preview.style.display).toBe('')

    box.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    expect(badge.textContent).toBe('✎')
    expect(preview.style.display).toBe('block')
    expect(preview.textContent).toBe('Tighten spacing.')

    box.click()
    expect(onActivate).toHaveBeenCalledTimes(1)

    box.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    expect(badge.textContent).toBe('1')
    expect(preview.style.display).toBe('none')
    expect(preview.textContent).toBe('')
  })
})
