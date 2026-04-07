import type { FeedbackRecord } from '@inspecto-dev/types'
import {
  annotateSidebarChipClass,
  annotateSidebarEmptyClass,
  annotateSidebarQueueItemClass,
  annotateSidebarQueueMetaClass,
} from './styles.js'
import { closeIconSvg, inspectFilledIconSvg } from './icons.js'
import type { PromptChipRecord } from './annotate-sidebar-helpers.js'
import type { AnnotateSidebarOptions } from './annotate-sidebar.js'

type PromptChipElement = HTMLSpanElement & {
  dataset: DOMStringMap & {
    annotateChipId?: string
    state?: 'draft' | 'saved'
  }
}

interface AnnotateSidebarRenderers {
  createPromptChipElement(chip: PromptChipRecord): PromptChipElement
  renderIncludedRecords(records: FeedbackRecord[], recordsList: HTMLElement): void
  destroy(): void
}

export function createAnnotateSidebarRenderers({
  shadowRoot,
  sidebarElement,
  getOptions,
  getPromptChipRecordById,
}: {
  shadowRoot: ShadowRoot
  sidebarElement: HTMLElement
  getOptions: () => AnnotateSidebarOptions
  getPromptChipRecordById: (id: string) => PromptChipRecord | null
}): AnnotateSidebarRenderers {
  let activeTooltip: HTMLElement | null = null
  let activeChipId: string | null = null

  function setChipRemoveButtonVisibility(chipElement: ParentNode, visible: boolean): void {
    const inspectIcon = chipElement.querySelector(
      '[data-annotate-chip-inspect-icon]',
    ) as HTMLElement | null
    const deleteButton = chipElement.querySelector(
      '[data-annotate-chip-remove-id]',
    ) as HTMLButtonElement | null
    if (inspectIcon) {
      inspectIcon.style.opacity = visible ? '0' : '1'
    }
    if (!deleteButton) return
    deleteButton.style.opacity = visible ? '1' : '0'
    deleteButton.style.pointerEvents = visible ? 'auto' : 'none'
  }

  function renderChipPreview(chip: PromptChipRecord | null, anchor?: HTMLElement): void {
    if (activeTooltip) {
      activeTooltip.remove()
      activeTooltip = null
    }

    if (!chip || !anchor) return

    activeTooltip = document.createElement('div')
    activeTooltip.style.position = 'fixed'
    activeTooltip.style.maxWidth = '360px'
    activeTooltip.style.pointerEvents = 'none'
    activeTooltip.style.zIndex = '2147483647'
    activeTooltip.style.display = 'flex'
    activeTooltip.style.flexDirection = 'column'
    activeTooltip.style.gap = '8px'
    activeTooltip.style.padding = '8px'
    activeTooltip.style.background = 'rgba(28, 28, 28, 0.95)'
    activeTooltip.style.border = '1px solid rgba(255, 255, 255, 0.1)'
    activeTooltip.style.borderRadius = 'var(--inspecto-radius-lg)'
    activeTooltip.style.boxShadow = 'var(--inspecto-shadow-floating)'
    activeTooltip.style.backdropFilter = 'blur(16px)'
    activeTooltip.style.setProperty('-webkit-backdrop-filter', 'blur(16px)')
    activeTooltip.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

    const createSection = (title: string, content: HTMLElement | string) => {
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
      if (typeof content === 'string') {
        contentEl.style.fontSize = '13px'
        contentEl.style.color = 'rgba(255, 255, 255, 0.9)'
        contentEl.style.lineHeight = '1.4'
        contentEl.style.wordBreak = 'break-word'
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

    const elementValue = document.createElement('div')
    elementValue.style.fontFamily = 'monospace'
    elementValue.style.fontSize = '13px'
    elementValue.style.color = '#9cdcfe'
    elementValue.textContent = chip.label
    activeTooltip.appendChild(createSection('ELEMENT', elementValue))
    activeTooltip.appendChild(createSection('NOTE', chip.note.trim() || 'No note provided'))

    if (chip.selector) {
      activeTooltip.appendChild(createSection('PATH', chip.selector))
    }

    if (chip.locationLabel) {
      const fileValue = document.createElement('div')
      fileValue.style.fontSize = '12px'
      fileValue.style.color = 'rgba(255, 255, 255, 0.9)'
      fileValue.style.wordBreak = 'break-all'
      fileValue.style.fontFamily = 'SF Mono, Fira Code, ui-monospace, monospace'
      fileValue.textContent = chip.locationLabel
      activeTooltip.appendChild(createSection('FILE', fileValue))
    }

    shadowRoot.appendChild(activeTooltip)

    const rect = anchor.getBoundingClientRect()
    activeTooltip.style.top = `${rect.bottom + 8}px`

    const tooltipRect = activeTooltip.getBoundingClientRect()
    let left = rect.left + rect.width / 2 - tooltipRect.width / 2
    const sidebarRect = sidebarElement.getBoundingClientRect()
    if (left + tooltipRect.width > sidebarRect.right - 10) {
      left = sidebarRect.right - tooltipRect.width - 10
    }
    if (left < sidebarRect.left + 10) {
      left = sidebarRect.left + 10
    }

    activeTooltip.style.left = `${left}px`
  }

  function createPromptChipElement(chip: PromptChipRecord): PromptChipElement {
    const chipElement = document.createElement('span') as PromptChipElement
    chipElement.className = annotateSidebarChipClass
    chipElement.contentEditable = 'false'
    chipElement.style.margin = '0 4px'
    chipElement.style.display = 'inline-flex'
    chipElement.style.alignItems = 'center'
    chipElement.style.gap = '5px'
    chipElement.style.verticalAlign = 'middle'
    chipElement.tabIndex = 0
    chipElement.setAttribute('role', 'button')
    chipElement.dataset.annotateChipId = chip.id
    chipElement.dataset.state = chip.state

    const label = document.createElement('span')
    label.dataset.annotateChipLabel = 'true'
    label.textContent = chip.label

    const actionSlot = document.createElement('span')
    actionSlot.style.position = 'relative'
    actionSlot.style.display = 'inline-flex'
    actionSlot.style.alignItems = 'center'
    actionSlot.style.justifyContent = 'center'
    actionSlot.style.width = '14px'
    actionSlot.style.height = '14px'
    actionSlot.style.flex = '0 0 14px'

    const inspectIcon = document.createElement('span')
    inspectIcon.dataset.annotateChipInspectIcon = chip.id
    inspectIcon.setAttribute('aria-hidden', 'true')
    inspectIcon.innerHTML = inspectFilledIconSvg
    inspectIcon.style.display = 'inline-flex'
    inspectIcon.style.alignItems = 'center'
    inspectIcon.style.justifyContent = 'center'
    inspectIcon.style.width = '14px'
    inspectIcon.style.height = '14px'
    inspectIcon.style.opacity = '1'
    inspectIcon.style.transition = 'opacity 0.15s ease'
    inspectIcon.style.color = 'currentColor'

    const inspectIconSvg = inspectIcon.querySelector('svg')
    if (inspectIconSvg) {
      inspectIconSvg.style.width = '12px'
      inspectIconSvg.style.height = '12px'
      inspectIconSvg.style.display = 'block'
    }

    const deleteButton = document.createElement('button')
    deleteButton.type = 'button'
    deleteButton.dataset.annotateChipRemoveId = chip.id
    deleteButton.setAttribute('aria-label', `Remove ${chip.label}`)
    deleteButton.innerHTML = closeIconSvg
    deleteButton.style.appearance = 'none'
    deleteButton.style.border = 'none'
    deleteButton.style.background = 'transparent'
    deleteButton.style.color = 'inherit'
    deleteButton.style.opacity = '0'
    deleteButton.style.pointerEvents = 'none'
    deleteButton.style.cursor = 'pointer'
    deleteButton.style.padding = '0'
    deleteButton.style.margin = '0'
    deleteButton.style.display = 'inline-flex'
    deleteButton.style.alignItems = 'center'
    deleteButton.style.justifyContent = 'center'
    deleteButton.style.position = 'absolute'
    deleteButton.style.inset = '0'
    deleteButton.style.width = '14px'
    deleteButton.style.height = '14px'
    deleteButton.style.transition = 'opacity 0.15s ease'

    const deleteIconSvg = deleteButton.querySelector('svg')
    if (deleteIconSvg) {
      deleteIconSvg.style.width = '12px'
      deleteIconSvg.style.height = '12px'
      deleteIconSvg.style.display = 'block'
    }

    const showPreview = () => {
      const latestChip = getPromptChipRecordById(chip.id)
      if (!latestChip) return
      activeChipId = chip.id
      setChipRemoveButtonVisibility(chipElement, true)
      renderChipPreview(latestChip, chipElement)
    }
    const hidePreview = (nextFocusedTarget?: EventTarget | null) => {
      if (nextFocusedTarget instanceof Node && chipElement.contains(nextFocusedTarget)) return
      if (activeChipId === chip.id) {
        activeChipId = null
        renderChipPreview(null)
      }
      setChipRemoveButtonVisibility(chipElement, false)
    }

    chipElement.addEventListener('mouseenter', showPreview)
    chipElement.addEventListener('focusin', showPreview)
    chipElement.addEventListener('mouseleave', () => hidePreview())
    chipElement.addEventListener('focusout', event =>
      hidePreview((event.relatedTarget as Node | null | undefined) ?? null),
    )

    chipElement.addEventListener('click', event => {
      if ((event.target as HTMLElement | null)?.closest('[data-annotate-chip-remove-id]')) return
      event.preventDefault()
      getOptions().onEditRecord?.(chip.id)
    })

    deleteButton.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      activeChipId = null
      renderChipPreview(null)
      setChipRemoveButtonVisibility(chipElement, false)
      getOptions().onRemovePromptChip(chip.id)
    })

    actionSlot.append(inspectIcon, deleteButton)
    chipElement.append(label, actionSlot)
    return chipElement
  }

  function renderIncludedRecords(records: FeedbackRecord[], recordsList: HTMLElement): void {
    recordsList.replaceChildren()

    if (records.length === 0) {
      const empty = document.createElement('div')
      empty.className = annotateSidebarEmptyClass
      empty.textContent = 'No records included yet.'
      recordsList.appendChild(empty)
      return
    }

    for (const record of records) {
      const item = document.createElement('div')
      item.className = annotateSidebarQueueItemClass
      item.tabIndex = 0
      item.setAttribute('role', 'button')
      item.setAttribute('aria-pressed', 'false')
      item.addEventListener('click', () => getOptions().onEditRecord?.(record.id))
      item.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          getOptions().onEditRecord?.(record.id)
        }
      })

      const label = document.createElement('div')
      label.textContent = record.target.label || 'Unknown target'

      const meta = document.createElement('div')
      meta.className = annotateSidebarQueueMetaClass
      meta.textContent = record.note.trim().length > 0 ? record.note : 'Optional note left empty.'

      item.append(label, meta)
      recordsList.appendChild(item)
    }
  }

  return {
    createPromptChipElement,
    renderIncludedRecords,
    destroy() {
      renderChipPreview(null)
    },
  }
}
