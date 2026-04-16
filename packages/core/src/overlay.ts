import {
  overlayClass,
  tooltipClass,
  tooltipTopClass,
  tooltipBottomClass,
  tagClass,
  idClass,
  classClass,
  dimClass,
  separatorClass,
  sourceClass,
} from './styles.js'

const GAP = 8
const EDGE_MARGIN = 4
const MAX_CLASS_SUMMARY_LENGTH = 96

export function createOverlay(shadowRoot: ShadowRoot): {
  show(el: Element, sourceLabel: string): void
  hide(): void
} {
  const overlay = document.createElement('div')
  overlay.className = overlayClass
  overlay.style.display = 'none'

  const tooltip = document.createElement('div')
  tooltip.className = tooltipClass
  tooltip.style.display = 'none'

  const tagSpan = document.createElement('span')
  tagSpan.className = tagClass

  const idSpan = document.createElement('span')
  idSpan.className = idClass

  const classSpan = document.createElement('span')
  classSpan.className = classClass

  const dimSpan = document.createElement('span')
  dimSpan.className = dimClass

  const separator = document.createElement('div')
  separator.className = separatorClass

  const sourceSpan = document.createElement('div')
  sourceSpan.className = sourceClass

  tooltip.appendChild(tagSpan)
  tooltip.appendChild(idSpan)
  tooltip.appendChild(classSpan)
  tooltip.appendChild(document.createTextNode(' '))
  tooltip.appendChild(dimSpan)
  tooltip.appendChild(separator)
  tooltip.appendChild(sourceSpan)

  shadowRoot.appendChild(overlay)
  shadowRoot.appendChild(tooltip)

  function show(el: Element, sourceLabel: string): void {
    const rect = el.getBoundingClientRect()

    // The overlay and tooltip are `position: fixed`, so we MUST use viewport coordinates (rect.left/top)
    // without adding window.scrollX/scrollY.

    // Update overlay box
    overlay.style.display = 'block'
    overlay.style.left = `${rect.left}px`
    overlay.style.top = `${rect.top}px`
    overlay.style.width = `${rect.width}px`
    overlay.style.height = `${rect.height}px`

    // Update tooltip content
    const tagName = el.tagName.toLowerCase()
    tagSpan.textContent = tagName

    idSpan.textContent = el.id ? `#${el.id}` : ''

    const classes = Array.from(el.classList)
      .map(c => `.${c}`)
      .join('')
    classSpan.textContent = summarizeClasses(classes)

    dimSpan.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`

    sourceSpan.textContent = sourceLabel

    tooltip.style.visibility = 'hidden'
    tooltip.style.display = 'block'

    // Calculate tooltip position
    const tooltipRect = tooltip.getBoundingClientRect()
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight

    // Calculate vertical position (above or below)
    let tooltipTop = rect.top - tooltipRect.height - GAP
    let isBottom = false

    // If there's not enough space above, show it below
    if (tooltipTop < EDGE_MARGIN) {
      tooltipTop = rect.bottom + GAP
      // If showing below also goes off screen, clamp it to bottom of screen
      if (tooltipTop + tooltipRect.height > viewportHeight - EDGE_MARGIN) {
        tooltipTop = viewportHeight - tooltipRect.height - EDGE_MARGIN
      }
      isBottom = true
    }

    tooltip.classList.toggle(tooltipBottomClass, isBottom)
    tooltip.classList.toggle(tooltipTopClass, !isBottom)

    // Calculate horizontal position
    // Default to aligning with the left edge of the element
    let tooltipLeft = rect.left

    // Prevent overflowing the right edge
    if (tooltipLeft + tooltipRect.width > viewportWidth - EDGE_MARGIN) {
      tooltipLeft = viewportWidth - tooltipRect.width - EDGE_MARGIN
    }
    // Prevent overflowing the left edge
    if (tooltipLeft < EDGE_MARGIN) {
      tooltipLeft = EDGE_MARGIN
    }

    // Calculate arrow position so it always points at the element
    // The arrow normally points at rect.left + 10
    // But if the element is tiny, point at its center
    const targetPointX = rect.left + Math.min(15, rect.width / 2)

    // Calculate where the arrow should be relative to the tooltip
    let arrowLeft = targetPointX - tooltipLeft

    // Clamp arrow position so it doesn't detach from the tooltip bubble itself
    arrowLeft = Math.max(6, Math.min(arrowLeft, tooltipRect.width - 18))

    tooltip.style.left = `${tooltipLeft}px`
    tooltip.style.top = `${tooltipTop}px`
    tooltip.style.setProperty('--inspecto-arrow-left', `${arrowLeft}px`)

    tooltip.style.visibility = 'visible'
  }

  function hide(): void {
    overlay.style.display = 'none'
    tooltip.style.display = 'none'
  }

  return { show, hide }
}

function summarizeClasses(classes: string): string {
  if (classes.length <= MAX_CLASS_SUMMARY_LENGTH) return classes
  return `${classes.slice(0, MAX_CLASS_SUMMARY_LENGTH - 3)}...`
}
