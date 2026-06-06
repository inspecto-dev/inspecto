import type { WorkflowSlotOption } from '@inspecto-dev/types'
import type { AnnotateSendScope } from './helpers.js'
import { createSidebarButton } from './helpers.js'
import { annotateSidebarButtonClass } from '../../../shared/styles/index.js'
import { t } from '../../../shared/i18n.js'

type WorkflowRowDom = {
  workflowRow: HTMLElement
  showConfirmDialog(message: string, onConfirm: () => void): void
}

type RenderWorkflowRowOptions = {
  workflows?: WorkflowSlotOption[]
  isSending: boolean
  sendingScope: AnnotateSendScope
  onWorkflow?: (workflowId: string) => void
}

export function renderWorkflowRow(dom: WorkflowRowDom, options: RenderWorkflowRowOptions): void {
  const workflows = options.workflows ?? []
  dom.workflowRow.style.display = workflows.length > 0 ? 'flex' : 'none'
  dom.workflowRow.innerHTML = ''

  for (const workflow of workflows) {
    const button = createSidebarButton(workflow.label, annotateSidebarButtonClass)
    button.dataset.workflowId = workflow.id
    button.style.flex = '1'
    button.style.justifyContent = 'center'
    button.style.whiteSpace = 'nowrap'

    const isSendingWorkflow =
      options.isSending && options.sendingScope === `workflow:${workflow.id}`
    button.disabled = options.isSending
    button.textContent = isSendingWorkflow ? t('menu.sending') : workflow.label

    button.addEventListener('click', () => {
      if (workflow.confirm) {
        dom.showConfirmDialog(t('workflow.confirm', { label: workflow.label }), () => {
          options.onWorkflow?.(workflow.id)
        })
        return
      }
      options.onWorkflow?.(workflow.id)
    })

    dom.workflowRow.appendChild(button)
  }
}
