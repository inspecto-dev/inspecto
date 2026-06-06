import { describe, expect, it } from 'vitest'
import { isCssContextEnabledForTargetKey } from '../src/runtime/css-context-state.js'

function createState(
  overrides: Partial<Parameters<typeof isCssContextEnabledForTargetKey>[0]> = {},
) {
  return {
    annotateCssContextEnabled: false,
    currentTargetKey: 'App.tsx:10:2::#current',
    currentCssContextEnabled: false,
    savedRecords: [
      {
        targetKey: 'App.tsx:20:4::#saved',
        cssContextEnabled: true,
      },
    ],
    ...overrides,
  }
}

describe('css context state', () => {
  it('treats the global annotate CSS toggle as enabled for every target', () => {
    expect(
      isCssContextEnabledForTargetKey(
        createState({
          annotateCssContextEnabled: true,
          currentCssContextEnabled: false,
          savedRecords: [],
        }),
        'App.tsx:99:1::#anything',
      ),
    ).toBe(true)
  })

  it('resolves the current draft css toggle by target key', () => {
    expect(
      isCssContextEnabledForTargetKey(
        createState({
          currentCssContextEnabled: true,
        }),
        'App.tsx:10:2::#current',
      ),
    ).toBe(true)
    expect(isCssContextEnabledForTargetKey(createState(), 'App.tsx:10:2::#current')).toBe(false)
  })

  it('resolves saved record css toggles by target key', () => {
    expect(isCssContextEnabledForTargetKey(createState(), 'App.tsx:20:4::#saved')).toBe(true)
    expect(isCssContextEnabledForTargetKey(createState(), 'App.tsx:30:1::#missing')).toBe(false)
  })
})
