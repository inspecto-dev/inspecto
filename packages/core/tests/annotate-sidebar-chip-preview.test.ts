import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PromptChipRecord } from '../src/features/annotate/sidebar/helpers.js'
import { createAnnotateSidebarChipPreview } from '../src/features/annotate/sidebar/chip-preview.js'

function createChip(overrides: Partial<PromptChipRecord> = {}): PromptChipRecord {
  return {
    id: 'record-1',
    label: 'button.primary',
    locationLabel: '/repo/Button.tsx:12:4',
    selector: '#app > button.primary',
    note: 'Tighten the spacing.',
    state: 'saved',
    ...overrides,
  }
}

describe('annotate sidebar chip preview', () => {
  let host: HTMLElement
  let shadowRoot: ShadowRoot
  let sidebarElement: HTMLElement
  let anchor: HTMLElement

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    shadowRoot = host.attachShadow({ mode: 'open' })
    sidebarElement = document.createElement('aside')
    anchor = document.createElement('span')

    sidebarElement.getBoundingClientRect = () =>
      ({
        left: 100,
        right: 500,
        top: 0,
        bottom: 600,
        width: 400,
        height: 600,
        x: 100,
        y: 0,
        toJSON: () => undefined,
      }) as DOMRect
    anchor.getBoundingClientRect = () =>
      ({
        left: 220,
        right: 260,
        top: 40,
        bottom: 64,
        width: 40,
        height: 24,
        x: 220,
        y: 40,
        toJSON: () => undefined,
      }) as DOMRect
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders chip details near the anchor and clears the active preview', () => {
    const preview = createAnnotateSidebarChipPreview({ shadowRoot, sidebarElement })

    preview.render(createChip(), anchor)

    const tooltip = shadowRoot.querySelector('[data-inspecto-annotate-chip-preview]') as HTMLElement
    expect(tooltip).not.toBeNull()
    expect(tooltip.textContent).toContain('ELEMENT')
    expect(tooltip.textContent).toContain('button.primary')
    expect(tooltip.textContent).toContain('NOTE')
    expect(tooltip.textContent).toContain('Tighten the spacing.')
    expect(tooltip.textContent).toContain('PATH')
    expect(tooltip.textContent).toContain('#app > button.primary')
    expect(tooltip.textContent).toContain('FILE')
    expect(tooltip.textContent).toContain('/repo/Button.tsx:12:4')
    expect(tooltip.style.top).toBe('72px')
    expect(tooltip.style.left).toBe('240px')

    preview.render(null)

    expect(shadowRoot.querySelector('[data-inspecto-annotate-chip-preview]')).toBeNull()
  })

  it('uses the empty note copy and removes the preview on destroy', () => {
    const preview = createAnnotateSidebarChipPreview({ shadowRoot, sidebarElement })

    preview.render(createChip({ note: '', selector: undefined }), anchor)

    expect(
      (shadowRoot.querySelector('[data-inspecto-annotate-chip-preview]') as HTMLElement)
        .textContent,
    ).toContain('No note provided')

    preview.destroy()

    expect(shadowRoot.querySelector('[data-inspecto-annotate-chip-preview]')).toBeNull()
  })
})
