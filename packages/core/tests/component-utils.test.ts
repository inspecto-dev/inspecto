import { describe, expect, it } from 'vitest'

import { createSelector, findElementForLocation } from '../src/component-annotate-targets.js'
import { findInspectable, getInspectableLocation } from '../src/component-utils.js'

describe('component-utils astro source support', () => {
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
})
