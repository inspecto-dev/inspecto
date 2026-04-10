import { describe, expect, it } from 'vitest'
import { resolveMenuPosition } from '../src/menu-position.js'

describe('menu positioning', () => {
  it('repositions the menu horizontally using its rendered width so it stays within the right viewport edge', () => {
    const position = resolveMenuPosition({
      clickX: 300,
      clickY: 100,
      menuRect: { width: 304, height: 180 },
      viewport: { width: 320, height: 400 },
    })

    expect(position.left).toBe(8)
    expect(position.top).toBe(108)
  })

  it('clamps the menu to the left viewport edge when the click happens too close to the edge', () => {
    const position = resolveMenuPosition({
      clickX: -24,
      clickY: 100,
      menuRect: { width: 304, height: 180 },
      viewport: { width: 320, height: 400 },
    })

    expect(position.left).toBe(8)
    expect(position.top).toBe(108)
  })

  it('clamps the menu to the top viewport edge when the click happens above the viewport', () => {
    const position = resolveMenuPosition({
      clickX: 100,
      clickY: -24,
      menuRect: { width: 304, height: 180 },
      viewport: { width: 400, height: 320 },
    })

    expect(position.left).toBe(88)
    expect(position.top).toBe(8)
  })

  it('repositions the menu vertically using its rendered height so it stays within the bottom viewport edge', () => {
    const position = resolveMenuPosition({
      clickX: 8,
      clickY: 280,
      menuRect: { width: 304, height: 180 },
      viewport: { width: 400, height: 320 },
    })

    expect(position.left).toBe(8)
    expect(position.top).toBe(132)
  })
})
