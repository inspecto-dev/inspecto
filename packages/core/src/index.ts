import type { InspectorOptions } from '@inspecto/types'
import { InspectoElement } from './component.js'

export type { InspectorOptions }
export { InspectoElement }

const TAG_NAME = 'inspecto-overlay'

export function mountInspector(options: InspectorOptions = {}): InspectoElement {
  const existing = document.querySelector(TAG_NAME) as InspectoElement | null
  if (existing) {
    existing.configure(options)
    return existing
  }

  const el = document.createElement(TAG_NAME) as InspectoElement
  el.configure(options)
  document.body.appendChild(el)
  return el
}

export function unmountInspector(): void {
  const existing = document.querySelector(TAG_NAME)
  if (existing) {
    existing.remove()
  }
}

// Expose to global window for Webpack/Rspack EntryPlugin injection fallback
if (typeof window !== 'undefined') {
  window.InspectoClient = {
    mountInspector,
    unmountInspector,
  }
}
