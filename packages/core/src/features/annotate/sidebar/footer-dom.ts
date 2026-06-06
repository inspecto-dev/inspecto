import {
  annotateConfirmDialogClass,
  annotateSidebarActionsClass,
  annotateSidebarButtonClass,
  annotateSidebarFooterClass,
  annotateSidebarQueueMetaClass,
  errorMsgClass,
} from '../../../shared/styles/index.js'
import { t } from '../../../shared/i18n.js'
import { createSidebarButton } from './helpers.js'

export type AnnotateSidebarFooterDom = {
  footer: HTMLElement
  workflowRow: HTMLDivElement
  footerLeftActions: HTMLDivElement
  recommendedActionLabel: HTMLDivElement
  statusMessage: HTMLDivElement
  errorMessage: HTMLDivElement
  previewFloat: HTMLDivElement
  previewFloatContent: HTMLPreElement
  quickAskButton: HTMLButtonElement
  createTaskButton: HTMLButtonElement
  confirmDialog: HTMLDivElement
  confirmContent: HTMLDivElement
  showConfirmDialog(message: string, onConfirm: () => void): void
  hideConfirmDialog(): void
}

export function createAnnotateSidebarFooterDom(): AnnotateSidebarFooterDom {
  const footer = document.createElement('footer')
  footer.className = annotateSidebarFooterClass
  footer.style.position = 'relative'

  const statusMessage = document.createElement('div')
  statusMessage.setAttribute('role', 'status')
  statusMessage.setAttribute('aria-live', 'polite')
  statusMessage.setAttribute('aria-atomic', 'true')
  statusMessage.style.position = 'absolute'
  statusMessage.style.width = '1px'
  statusMessage.style.height = '1px'
  statusMessage.style.padding = '0'
  statusMessage.style.margin = '-1px'
  statusMessage.style.overflow = 'hidden'
  statusMessage.style.clip = 'rect(0, 0, 0, 0)'
  statusMessage.style.whiteSpace = 'nowrap'
  statusMessage.style.border = '0'

  const errorMessage = document.createElement('div')
  errorMessage.className = errorMsgClass
  errorMessage.style.display = 'none'

  const footerLayout = document.createElement('div')
  footerLayout.style.display = 'flex'
  footerLayout.style.flexDirection = 'column'
  footerLayout.style.gap = '8px'
  footerLayout.style.width = '100%'

  const recommendedActionLabel = document.createElement('div')
  recommendedActionLabel.className = annotateSidebarQueueMetaClass
  recommendedActionLabel.style.display = 'none'
  recommendedActionLabel.style.textAlign = 'center'
  recommendedActionLabel.style.marginBottom = '2px'

  const footerActionRow = document.createElement('div')
  footerActionRow.style.display = 'flex'
  footerActionRow.style.flexDirection = 'column'
  footerActionRow.style.alignItems = 'stretch'
  footerActionRow.style.gap = '8px'
  footerActionRow.style.width = '100%'

  const footerActionRowContainer = document.createElement('div')
  footerActionRowContainer.style.display = 'flex'
  footerActionRowContainer.style.alignItems = 'center'
  footerActionRowContainer.style.justifyContent = 'space-between'
  footerActionRowContainer.style.width = '100%'
  footerActionRowContainer.style.gap = '8px'

  const workflowRow = document.createElement('div')
  workflowRow.className = annotateSidebarActionsClass
  workflowRow.style.display = 'none'
  workflowRow.style.gap = '8px'
  workflowRow.style.width = '100%'

  const footerLeftActions = document.createElement('div')
  footerLeftActions.className = annotateSidebarActionsClass
  footerLeftActions.style.flex = '0 0 auto'
  footerLeftActions.style.display = 'none'
  footerLeftActions.style.alignItems = 'center'
  footerLeftActions.style.gap = '8px'

  const previewFloat = document.createElement('div')
  previewFloat.dataset.inspectoAnnotateRawPreview = 'true'
  previewFloat.style.display = 'none'
  previewFloat.style.position = 'absolute'
  previewFloat.style.left = '0'
  previewFloat.style.right = '0'
  previewFloat.style.top = 'auto'
  previewFloat.style.bottom = 'calc(100% + 8px)'
  previewFloat.style.maxHeight = '400px'
  previewFloat.style.overflow = 'auto'
  previewFloat.style.background = 'rgba(28, 28, 28, 0.95)'
  previewFloat.style.border = '1px solid rgba(255, 255, 255, 0.1)'
  previewFloat.style.borderRadius = 'var(--inspecto-radius-md)'
  previewFloat.style.boxShadow = 'var(--inspecto-shadow-floating)'
  previewFloat.style.backdropFilter = 'blur(16px)'
  previewFloat.style.setProperty('-webkit-backdrop-filter', 'blur(16px)')
  previewFloat.style.padding = '12px'
  previewFloat.style.zIndex = '100'

  const previewFloatContent = document.createElement('pre')
  previewFloatContent.style.margin = '0'
  previewFloatContent.style.whiteSpace = 'pre-wrap'
  previewFloatContent.style.fontFamily = 'monospace'
  previewFloatContent.style.fontSize = '11px'
  previewFloatContent.style.lineHeight = '1.4'
  previewFloatContent.style.color = 'rgba(255, 255, 255, 0.7)'
  previewFloat.appendChild(previewFloatContent)

  const confirmDialog = document.createElement('div')
  confirmDialog.className = annotateConfirmDialogClass
  confirmDialog.style.display = 'none'

  const confirmContent = document.createElement('div')
  confirmContent.className = 'content'

  const confirmMessage = document.createElement('p')
  const confirmActions = document.createElement('div')
  confirmActions.className = 'actions'

  const confirmCancelBtn = createSidebarButton(t('annotate.cancel'), annotateSidebarButtonClass)
  confirmCancelBtn.dataset.emphasis = 'secondary'
  const confirmOkBtn = createSidebarButton(t('workflow.confirm.ok'), annotateSidebarButtonClass)
  confirmOkBtn.classList.add('primary')

  confirmActions.append(confirmCancelBtn, confirmOkBtn)
  confirmContent.append(confirmMessage, confirmActions)
  confirmDialog.append(confirmContent)

  let currentConfirmCallback: (() => void) | null = null

  function hideConfirmDialog(): void {
    confirmDialog.style.display = 'none'
    currentConfirmCallback = null
  }

  confirmCancelBtn.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    hideConfirmDialog()
  })

  confirmOkBtn.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    confirmDialog.style.display = 'none'

    if (currentConfirmCallback) {
      currentConfirmCallback()
      currentConfirmCallback = null
    }

    const toast = document.createElement('div')
    toast.className = 'inspecto-workflow-toast'
    toast.textContent = t('workflow.feedback.executed')

    workflowRow.style.position = 'relative'
    workflowRow.appendChild(toast)

    setTimeout(() => {
      toast.remove()
    }, 2000)
  })

  function showConfirmDialog(message: string, onConfirm: () => void): void {
    confirmMessage.textContent = message
    currentConfirmCallback = onConfirm
    confirmDialog.style.display = 'flex'
  }

  const footerActions = document.createElement('div')
  footerActions.className = annotateSidebarActionsClass
  footerActions.style.display = 'flex'
  footerActions.style.gap = '8px'
  footerActions.style.flex = '1'

  const quickAskButton = createSidebarButton(t('annotate.askAi'), annotateSidebarButtonClass)
  quickAskButton.dataset.role = 'quick-ask'
  quickAskButton.style.flex = '1'
  quickAskButton.style.justifyContent = 'center'
  quickAskButton.style.whiteSpace = 'nowrap'

  const createTaskButton = createSidebarButton(t('annotate.createTask'), annotateSidebarButtonClass)
  createTaskButton.dataset.role = 'create-task'
  createTaskButton.classList.add('primary')
  createTaskButton.style.flex = '1'
  createTaskButton.style.justifyContent = 'center'
  createTaskButton.style.whiteSpace = 'nowrap'

  footerActions.append(quickAskButton, createTaskButton)
  footerActionRowContainer.append(footerLeftActions, footerActions)
  footerActionRow.append(footerActionRowContainer, workflowRow)
  footerLayout.append(recommendedActionLabel, footerActionRow)
  footer.append(previewFloat, statusMessage, errorMessage, footerLayout)

  return {
    footer,
    workflowRow,
    footerLeftActions,
    recommendedActionLabel,
    statusMessage,
    errorMessage,
    previewFloat,
    previewFloatContent,
    quickAskButton,
    createTaskButton,
    confirmDialog,
    confirmContent,
    showConfirmDialog,
    hideConfirmDialog,
  }
}
