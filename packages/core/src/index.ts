import type { InspectorOptions } from '@inspecto-dev/types'
import type { InspectorMode } from './component.js'

// Export types only, avoid top-level imports of DOM-dependent code
export type { InspectorOptions }
export type { InspectoElement } from './component.js'
export type { InspectorMode } from './component.js'

type MountInspectorOptions = InspectorOptions & { mode?: InspectorMode }

const TAG_NAME = 'inspecto-overlay'

export async function mountInspector(options: MountInspectorOptions = {}): Promise<any> {
  if (typeof document === 'undefined') return null

  // Lazy import the component so that module evaluation does not happen during SSR
  const { InspectoElement } = await import('./component.js')

  const existing = document.querySelector(TAG_NAME)
  if (existing) {
    ;(existing as typeof InspectoElement.prototype).configure(options)
    return existing
  }

  const el = document.createElement(TAG_NAME)
  ;(el as typeof InspectoElement.prototype).configure(options)
  document.body.appendChild(el)
  return el
}

export function unmountInspector(): void {
  if (typeof document === 'undefined') return
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
