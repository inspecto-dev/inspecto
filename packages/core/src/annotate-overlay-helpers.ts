import type { SelectedTargetOverlayEntry } from './annotate-overlay.js'

export type ComposerPlacement = 'right' | 'left' | 'below' | 'above'

export type PlacementCandidate = {
  side: ComposerPlacement
  left: number
  top: number
}

export function createOverlayBox(tokens: {
  accentPrimary(): string
  surfaceFloating(): string
  borderSubtle(): string
  radiusLg(): string
  shadowFloating(): string
  textPrimary(): string
}): HTMLDivElement {
  const accentPrimaryColor = tokens.accentPrimary()
  const box = document.createElement('div')
  box.setAttribute('data-inspecto-annotate-overlay-box', '')
  box.style.position = 'absolute'
  box.style.pointerEvents = 'auto'
  box.style.boxSizing = 'border-box'
  box.style.border = `2px solid ${accentPrimaryColor}`
  box.style.background = 'rgba(93, 82, 243, 0.12)'
  box.style.borderRadius = '3px'
  box.style.boxShadow = `0 0 0 1px rgba(93, 82, 243, 0.25), 0 8px 18px rgba(93, 82, 243, 0.18)`

  const badge = document.createElement('div')
  badge.setAttribute('data-inspecto-annotate-overlay-order', '')
  badge.style.position = 'absolute'
  badge.style.left = '-10px'
  badge.style.top = '-10px'
  badge.style.minWidth = '20px'
  badge.style.height = '20px'
  badge.style.padding = '0 5px'
  badge.style.boxSizing = 'border-box'
  badge.style.borderRadius = '999px'
  badge.style.background = accentPrimaryColor
  badge.style.color = '#ffffff'
  badge.style.font = '600 12px/20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  badge.style.textAlign = 'center'
  badge.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.2)'

  const noteBadge = document.createElement('div')
  noteBadge.setAttribute('data-inspecto-annotate-overlay-note', '')
  noteBadge.style.position = 'absolute'
  noteBadge.style.left = '-2px'
  noteBadge.style.top = '-40px'
  noteBadge.style.maxWidth = 'min(220px, calc(100vw - 32px))'
  noteBadge.style.padding = '8px 12px'
  noteBadge.style.borderRadius = tokens.radiusLg()
  noteBadge.style.background = tokens.surfaceFloating()
  noteBadge.style.color = tokens.textPrimary()
  noteBadge.style.font = '500 12px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  noteBadge.style.boxShadow = tokens.shadowFloating()
  noteBadge.style.border = `1px solid ${tokens.borderSubtle()}`
  noteBadge.style.whiteSpace = 'nowrap'
  noteBadge.style.overflow = 'hidden'
  noteBadge.style.textOverflow = 'ellipsis'
  noteBadge.style.pointerEvents = 'none'
  noteBadge.style.display = 'none'
  noteBadge.style.backdropFilter = 'blur(12px)'

  box.append(badge, noteBadge)
  return box
}

export function applyOverlayState(
  box: HTMLDivElement,
  state: 'current' | 'saved',
  tokens: { accentPrimary(): string; accentPrimaryStrong(): string },
): void {
  const badge = box.querySelector('[data-inspecto-annotate-overlay-order]') as HTMLDivElement
  const accentPrimaryColor = tokens.accentPrimary()
  const accentPrimaryStrongColor = tokens.accentPrimaryStrong()
  if (state === 'saved') {
    box.style.border = `2px solid ${accentPrimaryStrongColor}`
    box.style.background = 'rgba(79, 70, 229, 0.05)'
    box.style.boxShadow = 'none'
    badge.style.background = accentPrimaryStrongColor
    badge.style.opacity = '0.68'
    return
  }

  box.style.border = `2px solid ${accentPrimaryColor}`
  box.style.background = 'rgba(66, 133, 244, 0.12)'
  box.style.boxShadow = `0 0 0 1px rgba(66, 133, 244, 0.25), 0 8px 18px rgba(66, 133, 244, 0.18)`
  badge.style.background = accentPrimaryColor
  badge.style.opacity = '1'
}

export function formatOverlayNoteBadge(note: string): string {
  const trimmed = note.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= 28) return trimmed
  return `${trimmed.slice(0, 27)}…`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function getOverflowPenalty(
  candidate: PlacementCandidate,
  composerWidth: number,
  composerHeight: number,
  viewportLeft: number,
  viewportTop: number,
  viewportRight: number,
  viewportBottom: number,
): number {
  const overflowLeft = Math.max(0, viewportLeft - candidate.left)
  const overflowRight = Math.max(0, candidate.left + composerWidth - viewportRight)
  const overflowTop = Math.max(0, viewportTop - candidate.top)
  const overflowBottom = Math.max(0, candidate.top + composerHeight - viewportBottom)
  return overflowLeft + overflowRight + overflowTop + overflowBottom
}

export function getPlacementPreference(side: ComposerPlacement): number {
  const preference: Record<ComposerPlacement, number> = {
    below: 0,
    right: 18,
    left: 24,
    above: 42,
  }
  return preference[side]
}

export function formatRuntimeErrorCount(count: number): string {
  if (count > 99) return '99+'
  return String(count)
}

export function applyComposerRuntimeButtonState(
  button: HTMLButtonElement,
  tokens: {
    surfaceSubtle(): string
    borderSubtle(): string
    textSecondary(): string
    accentPrimary(): string
    accentPrimaryStrong(): string
    shadowAccent(): string
  },
  enabled: boolean,
): void {
  if (enabled) {
    button.style.background = `linear-gradient(180deg, ${tokens.accentPrimary()} 0%, ${tokens.accentPrimaryStrong()} 100%)`
    button.style.borderColor = 'transparent'
    button.style.color = '#ffffff'
    button.style.boxShadow = tokens.shadowAccent()
    return
  }

  button.style.background = tokens.surfaceSubtle()
  button.style.borderColor = tokens.borderSubtle()
  button.style.color = tokens.textSecondary()
  button.style.boxShadow = 'none'
}

export function placePreview(preview: HTMLElement, target: SelectedTargetOverlayEntry): void {
  const rect = target.element.getBoundingClientRect()
  const scrollX = window.scrollX
  const scrollY = window.scrollY
  const top = Math.max(scrollY + 16, scrollY + rect.top - 54)
  const left = Math.min(
    scrollX + window.innerWidth - 276,
    Math.max(scrollX + 16, scrollX + rect.left),
  )
  preview.style.left = `${left}px`
  preview.style.top = `${top}px`
}
