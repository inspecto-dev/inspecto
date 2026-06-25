import { afterEach, describe, expect, it } from 'vitest'
import { findElementForLocation } from '../src/features/annotate/targets/lookup.js'

describe('annotate target lookup', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('prefers an explicit selector when it resolves to an element', () => {
    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="by-location">By location</button>
      <button id="by-selector">By selector</button>
    `

    expect(
      findElementForLocation({ file: '/repo/App.tsx', line: 10, column: 2 }, '#by-selector')?.id,
    ).toBe('by-selector')
  })

  it('falls back to the inspecto source location attribute', () => {
    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    expect(findElementForLocation({ file: '/repo/App.tsx', line: 10, column: 2 })?.id).toBe(
      'target',
    )
  })

  it('falls back to Astro source metadata', () => {
    document.body.innerHTML =
      '<section data-astro-source-file="/repo/App.astro" data-astro-source-loc="12:4" id="astro-target"></section>'

    expect(findElementForLocation({ file: '/repo/App.astro', line: 12, column: 4 })?.id).toBe(
      'astro-target',
    )
  })
})
