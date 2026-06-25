import type { FeedbackRecord } from '@inspecto-dev/types'
import { annotateSidebarChipClass } from '../../../shared/styles/index.js'
import { closeIconSvg, inspectFilledIconSvg } from '../../../shared/icons.js'
import type { PromptChipRecord } from './helpers.js'
import type { AnnotateSidebarOptions } from './types.js'
import { createAnnotateSidebarChipPreview } from './chip-preview.js'
import { renderIncludedRecords as renderIncludedRecordRows } from './included-records.js'

type PromptChipElement = HTMLSpanElement & {
  dataset: DOMStringMap & {
    annotateChipId?: string
    state?: 'draft' | 'saved' | 'completed'
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
  let activeChipId: string | null = null
  const chipPreview = createAnnotateSidebarChipPreview({ shadowRoot, sidebarElement })

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

  function createPromptChipElement(chip: PromptChipRecord): PromptChipElement {
    const chipElement = document.createElement('span') as PromptChipElement
    chipElement.className = annotateSidebarChipClass
    chipElement.contentEditable = 'false'
    chipElement.style.margin = '0 4px'
    chipElement.style.boxSizing = 'border-box'
    chipElement.style.display = 'inline-flex'
    chipElement.style.alignItems = 'center'
    chipElement.style.gap = '5px'
    chipElement.style.minWidth = '0'
    chipElement.style.maxWidth = 'calc(100% - 8px)'
    chipElement.style.verticalAlign = 'middle'
    chipElement.tabIndex = 0
    chipElement.setAttribute('role', 'button')
    chipElement.dataset.annotateChipId = chip.id
    chipElement.dataset.state = chip.state

    const label = document.createElement('span')
    label.dataset.annotateChipLabel = 'true'
    label.style.flex = '1 1 auto'
    label.style.minWidth = '0'
    label.style.overflow = 'hidden'
    label.style.textOverflow = 'ellipsis'
    label.style.whiteSpace = 'nowrap'
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
      chipPreview.render(latestChip, chipElement)
    }
    const hidePreview = (nextFocusedTarget?: EventTarget | null) => {
      if (nextFocusedTarget instanceof Node && chipElement.contains(nextFocusedTarget)) return
      if (activeChipId === chip.id) {
        activeChipId = null
        chipPreview.render(null)
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
      chipPreview.render(null)
      setChipRemoveButtonVisibility(chipElement, false)
      getOptions().onRemovePromptChip(chip.id)
    })

    actionSlot.append(inspectIcon, deleteButton)
    chipElement.append(label, actionSlot)
    return chipElement
  }

  function renderIncludedRecords(records: FeedbackRecord[], recordsList: HTMLElement): void {
    const onEditRecord = getOptions().onEditRecord
    renderIncludedRecordRows(records, recordsList, {
      ...(onEditRecord ? { onEditRecord } : {}),
    })
  }

  return {
    createPromptChipElement,
    renderIncludedRecords,
    destroy() {
      chipPreview.destroy()
    },
  }
}
