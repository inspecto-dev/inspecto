import { describe, expect, it, vi } from 'vitest'
import type { SourceLocation } from '@inspecto-dev/types'
import {
  createAnnotationTarget,
  describeElement,
  getAnnotationTargetKey,
} from '../src/features/annotate/targets/identity.js'

const location: SourceLocation = { file: '/repo/App.tsx', line: 10, column: 2 }

describe('annotate target identity', () => {
  it('formats stable target keys from source location and selector', () => {
    expect(
      getAnnotationTargetKey({
        id: 'target-1',
        location,
        label: 'button#submit.primary',
        selector: '#submit',
        rect: { x: 1, y: 2, width: 3, height: 4 },
      }),
    ).toBe('/repo/App.tsx:10:2::#submit')
  })

  it('describes elements by tag, id, and string class names', () => {
    const button = document.createElement('button')
    button.id = 'submit'
    button.className = 'primary wide'

    expect(describeElement(button)).toBe('button#submit.primary.wide')
  })

  it('creates annotation targets with labels, selectors, and client rects', () => {
    const button = document.createElement('button')
    button.id = 'submit'
    button.className = 'primary'
    button.getBoundingClientRect = vi.fn(
      () =>
        ({
          x: 11,
          y: 22,
          width: 33,
          height: 44,
        }) as DOMRect,
    )

    const target = createAnnotationTarget(button, location)

    expect(target).toMatchObject({
      location,
      label: 'button#submit.primary',
      selector: '#submit',
      rect: { x: 11, y: 22, width: 33, height: 44 },
    })
    expect(target.id).toMatch(/^target-|[0-9a-f-]{36}$/i)
  })
})
