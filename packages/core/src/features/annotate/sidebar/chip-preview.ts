import { t } from '../../../shared/i18n.js'
import type { PromptChipRecord } from './helpers.js'

interface AnnotateSidebarChipPreview {
  render(chip: PromptChipRecord | null, anchor?: HTMLElement): void
  destroy(): void
}

export function createAnnotateSidebarChipPreview({
  shadowRoot,
  sidebarElement,
}: {
  shadowRoot: ShadowRoot
  sidebarElement: HTMLElement
}): AnnotateSidebarChipPreview {
  let activeTooltip: HTMLElement | null = null

  function createSection(
    chip: PromptChipRecord,
    title: string,
    content: HTMLElement | string,
  ): HTMLElement {
    const section = document.createElement('div')
    section.style.display = 'flex'
    section.style.flexDirection = 'column'
    section.style.gap = '6px'
    section.style.padding = '10px 12px'
    section.style.border = '1px solid rgba(255, 255, 255, 0.08)'
    section.style.borderRadius = 'var(--inspecto-radius-md)'
    section.style.background = 'rgba(255, 255, 255, 0.02)'

    const titleEl = document.createElement('div')
    titleEl.style.fontSize = '10px'
    titleEl.style.fontWeight = '600'
    titleEl.style.color = 'rgba(255, 255, 255, 0.5)'
    titleEl.style.textTransform = 'uppercase'
    titleEl.style.letterSpacing = '0.04em'
    titleEl.textContent = title

    const contentEl = document.createElement('div')
    contentEl.style.minWidth = '0'
    contentEl.style.whiteSpace = 'normal'
    contentEl.style.overflowWrap = 'anywhere'
    contentEl.style.wordBreak = 'break-word'
    if (typeof content === 'string') {
      contentEl.style.fontSize = '13px'
      contentEl.style.color = 'rgba(255, 255, 255, 0.9)'
      contentEl.style.lineHeight = '1.4'
      if (title === 'NOTE' && !chip.note.trim()) {
        contentEl.style.fontStyle = 'italic'
        contentEl.style.color = 'rgba(255, 255, 255, 0.4)'
      }
      contentEl.textContent = content
    } else {
      contentEl.appendChild(content)
    }

    section.append(titleEl, contentEl)
    return section
  }

  function createTooltip(chip: PromptChipRecord): HTMLElement {
    const tooltip = document.createElement('div')
    tooltip.setAttribute('data-inspecto-annotate-chip-preview', '')
    tooltip.style.position = 'fixed'
    tooltip.style.maxWidth = '360px'
    tooltip.style.pointerEvents = 'none'
    tooltip.style.zIndex = '2147483647'
    tooltip.style.display = 'flex'
    tooltip.style.flexDirection = 'column'
    tooltip.style.gap = '8px'
    tooltip.style.padding = '8px'
    tooltip.style.background = 'rgba(28, 28, 28, 0.95)'
    tooltip.style.border = '1px solid rgba(255, 255, 255, 0.1)'
    tooltip.style.borderRadius = 'var(--inspecto-radius-lg)'
    tooltip.style.boxShadow = 'var(--inspecto-shadow-floating)'
    tooltip.style.backdropFilter = 'blur(16px)'
    tooltip.style.setProperty('-webkit-backdrop-filter', 'blur(16px)')
    tooltip.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

    const elementValue = document.createElement('div')
    elementValue.style.minWidth = '0'
    elementValue.style.fontFamily = 'monospace'
    elementValue.style.fontSize = '13px'
    elementValue.style.color = '#9cdcfe'
    elementValue.style.whiteSpace = 'normal'
    elementValue.style.overflowWrap = 'anywhere'
    elementValue.style.wordBreak = 'break-word'
    elementValue.textContent = chip.label
    tooltip.appendChild(createSection(chip, 'ELEMENT', elementValue))
    tooltip.appendChild(createSection(chip, 'NOTE', chip.note.trim() || t('annotate.note.none')))

    if (chip.selector) {
      tooltip.appendChild(createSection(chip, 'PATH', chip.selector))
    }

    if (chip.locationLabel) {
      const fileValue = document.createElement('div')
      fileValue.style.fontSize = '12px'
      fileValue.style.color = 'rgba(255, 255, 255, 0.9)'
      fileValue.style.wordBreak = 'break-all'
      fileValue.style.fontFamily = 'SF Mono, Fira Code, ui-monospace, monospace'
      fileValue.textContent = chip.locationLabel
      tooltip.appendChild(createSection(chip, 'FILE', fileValue))
    }

    return tooltip
  }

  function clear(): void {
    activeTooltip?.remove()
    activeTooltip = null
  }

  function positionTooltip(tooltip: HTMLElement, anchor: HTMLElement): void {
    const rect = anchor.getBoundingClientRect()
    tooltip.style.top = `${rect.bottom + 8}px`

    const tooltipRect = tooltip.getBoundingClientRect()
    let left = rect.left + rect.width / 2 - tooltipRect.width / 2
    const sidebarRect = sidebarElement.getBoundingClientRect()
    if (left + tooltipRect.width > sidebarRect.right - 10) {
      left = sidebarRect.right - tooltipRect.width - 10
    }
    if (left < sidebarRect.left + 10) {
      left = sidebarRect.left + 10
    }

    tooltip.style.left = `${left}px`
  }

  return {
    render(chip, anchor) {
      clear()
      if (!chip || !anchor) return

      activeTooltip = createTooltip(chip)
      shadowRoot.appendChild(activeTooltip)
      positionTooltip(activeTooltip, anchor)
    },
    destroy() {
      clear()
    },
  }
}
