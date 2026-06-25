import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSelector, findElementForLocation } from '../src/features/annotate/targets/index.js'
import { findInspectable, getInspectableLocation } from '../src/shared/component-utils.js'

describe('component-utils astro source support', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('finds inspectable elements using Astro source attributes', () => {
    document.body.innerHTML = `
      <section>
        <button
          id="target"
          data-astro-source-file="/repo/src/pages/index.astro"
          data-astro-source-loc="12:7"
        >
          Hello
        </button>
      </section>
    `

    const button = document.getElementById('target')

    expect(findInspectable(button)).toBe(button)
    expect(getInspectableLocation(button!)).toEqual({
      file: '/repo/src/pages/index.astro',
      line: 12,
      column: 7,
    })
  })

  it('rebinds annotations using Astro source attributes', () => {
    document.body.innerHTML = `
      <div
        id="card"
        data-astro-source-file="/repo/src/components/Card.astro"
        data-astro-source-loc="8:5"
      ></div>
    `

    const element = findElementForLocation(
      {},
      {
        file: '/repo/src/components/Card.astro',
        line: 8,
        column: 5,
      },
    )

    expect(element).toBe(document.getElementById('card'))
  })

  it('uses the shared element selector builder for annotation targets', () => {
    document.body.innerHTML = `
      <main>
        <section><button>First</button><button id="target">Second</button></section>
      </main>
    `

    expect(createSelector(document.getElementById('target')!)).toBe('#target')
  })

  it('escapes element ids when building annotation selectors', () => {
    document.body.innerHTML = '<button id=":r0:">Target</button>'

    const selector = createSelector(document.getElementById(':r0:')!)

    expect(() => document.querySelector(selector)).not.toThrow()
    expect(document.querySelector(selector)).toBe(document.getElementById(':r0:'))
  })

  it('escapes leading digits without relying on CSS.escape', () => {
    vi.stubGlobal('CSS', undefined)
    document.body.innerHTML = '<button id="1target">Target</button>'

    const selector = createSelector(document.getElementById('1target')!)

    expect(() => document.querySelector(selector)).not.toThrow()
    expect(document.querySelector(selector)).toBe(document.getElementById('1target'))
  })
})
