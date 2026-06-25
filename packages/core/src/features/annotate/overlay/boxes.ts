import {
  applyOverlayState,
  createOverlayBox,
  formatOverlayNoteBadge,
  placePreview,
} from './helpers.js'
import type { SelectedTargetOverlayEntry } from './types.js'

type OverlayBoxTokens = {
  accentPrimary(): string
  accentPrimaryStrong(): string
  borderSubtle(): string
  radiusLg(): string
  shadowFloating(): string
  successColor(): string
  surfaceFloating(): string
  textPrimary(): string
}

type RenderOverlayBoxesOptions = {
  layer: HTMLElement
  boxes: Map<string, HTMLDivElement>
  preview: HTMLElement
  targets: SelectedTargetOverlayEntry[]
  tokens: OverlayBoxTokens
}

function clearSavedPinPreview(preview: HTMLElement): void {
  preview.style.display = 'none'
  preview.textContent = ''
}

function renderSavedPin(
  box: HTMLDivElement,
  badge: HTMLDivElement,
  noteBadge: HTMLDivElement,
  target: SelectedTargetOverlayEntry,
  preview: HTMLElement,
): void {
  const trimmedNote = target.note?.trim() ?? ''
  const hasNote = trimmedNote.length > 0

  noteBadge.style.display = hasNote ? 'block' : 'none'
  noteBadge.textContent = hasNote ? formatOverlayNoteBadge(trimmedNote) : ''
  box.style.cursor = 'pointer'
  box.onmouseenter = () => {
    badge.textContent = '✎'
    if (hasNote) {
      preview.textContent = trimmedNote
      preview.style.display = 'block'
      placePreview(preview, target)
    }
  }
  box.onmouseleave = () => {
    badge.textContent = String(target.order)
    clearSavedPinPreview(preview)
  }
  box.onclick = () => target.onActivate?.()
}

function renderCurrentPin(
  box: HTMLDivElement,
  noteBadge: HTMLDivElement,
  preview: HTMLElement,
): void {
  noteBadge.style.display = 'none'
  noteBadge.textContent = ''
  box.style.cursor = 'default'
  box.onmouseenter = null
  box.onmouseleave = null
  box.onclick = null
  clearSavedPinPreview(preview)
}

export function renderOverlayBoxes({
  layer,
  boxes,
  preview,
  targets,
  tokens,
}: RenderOverlayBoxesOptions): void {
  const nextIds = new Set(targets.map(target => target.id))

  for (const [id, box] of boxes) {
    if (!nextIds.has(id)) {
      box.remove()
      boxes.delete(id)
    }
  }

  for (const target of targets) {
    const rect = target.element.getBoundingClientRect()
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    let box = boxes.get(target.id)
    if (!box) {
      box = createOverlayBox(tokens)
      boxes.set(target.id, box)
    }

    applyOverlayState(box, target.state ?? 'current', tokens)
    box.style.left = `${scrollX + rect.left}px`
    box.style.top = `${scrollY + rect.top}px`
    box.style.width = `${rect.width}px`
    box.style.height = `${rect.height}px`

    const badge = box.querySelector('[data-inspecto-annotate-overlay-order]') as HTMLDivElement
    const noteBadge = box.querySelector('[data-inspecto-annotate-overlay-note]') as HTMLDivElement
    badge.textContent = String(target.order)

    if ((target.state ?? 'current') === 'saved' || (target.state ?? 'current') === 'completed') {
      renderSavedPin(box, badge, noteBadge, target, preview)
    } else {
      renderCurrentPin(box, noteBadge, preview)
    }

    if (box.parentElement !== layer) {
      layer.appendChild(box)
    }
  }
}
