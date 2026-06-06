import type { AnnotationTarget, AnnotationTransport } from '@inspecto-dev/types'
import { afterEach, describe, expect, it } from 'vitest'
import {
  canAttachCssContext,
  getAnnotateCssContextPrompt,
  isCssContextEnabledForTarget,
  isCssContextEnabledForTransportTarget,
} from '../src/runtime/css-context.js'

function createTarget(id: string, line = 10): AnnotationTarget {
  return {
    id,
    label: `button#${id}`,
    selector: `#${id}`,
    location: { file: '/repo/App.tsx', line, column: 2 },
    rect: { x: 0, y: 0, width: 120, height: 32 },
  }
}

function createContext(overrides: Record<string, unknown> = {}) {
  const currentTarget = createTarget('current', 10)
  const savedTarget = createTarget('saved', 20)
  const ctx = {
    annotateCssContextEnabled: false,
    annotateSession: {
      current: {
        id: 'draft-1',
        target: currentTarget,
        cssContextEnabled: true,
      },
      records: [
        {
          target: savedTarget,
          cssContextEnabled: true,
        },
      ],
    },
    isCssContextEnabledForTransportTarget(target: AnnotationTransport['targets'][number]) {
      return isCssContextEnabledForTransportTarget(ctx, target)
    },
    ...overrides,
  }
  return ctx
}

describe('runtime CSS context helpers', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('detects whether CSS context can be captured in the current environment', () => {
    expect(canAttachCssContext()).toBe(true)
  })

  it('resolves CSS context state for annotation targets and transport targets', () => {
    const ctx = createContext()

    expect(isCssContextEnabledForTarget(ctx, createTarget('current', 10))).toBe(true)
    expect(isCssContextEnabledForTarget(ctx, createTarget('saved', 20))).toBe(true)
    expect(isCssContextEnabledForTarget(ctx, createTarget('missing', 30))).toBe(false)
    expect(
      isCssContextEnabledForTransportTarget(ctx, {
        location: { file: '/repo/App.tsx', line: 20, column: 2 },
        selector: '#saved',
      }),
    ).toBe(true)
  })

  it('builds annotate CSS context prompts only for enabled targets', () => {
    document.body.innerHTML = `
      <button id="current" data-inspecto="/repo/App.tsx:10:2" style="color: red">Current</button>
      <button id="missing" data-inspecto="/repo/App.tsx:30:2" style="color: blue">Missing</button>
    `
    const ctx = createContext({
      annotateSession: {
        current: {
          id: 'draft-1',
          target: createTarget('current', 10),
          cssContextEnabled: true,
        },
        records: [],
      },
    })

    const prompt = getAnnotateCssContextPrompt(ctx, [
      {
        note: 'Review',
        intent: 'review',
        targets: [
          {
            location: { file: '/repo/App.tsx', line: 10, column: 2 },
            selector: '#current',
            label: 'button#current',
          },
          {
            location: { file: '/repo/App.tsx', line: 30, column: 2 },
            selector: '#missing',
            label: 'button#missing',
          },
        ],
      },
    ])

    expect(prompt).toContain('button#current')
    expect(prompt).not.toContain('button#missing')
  })
})
