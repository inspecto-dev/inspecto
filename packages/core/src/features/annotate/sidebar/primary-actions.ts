import { t } from '../../../shared/i18n.js'
import type { AnnotateSidebarOptions } from './types.js'
import type { AnnotateSidebarViewState } from './view-state.js'

type PrimaryActionsDom = {
  quickAskButton: HTMLButtonElement
  createTaskButton: HTMLButtonElement
  recommendedActionLabel: HTMLDivElement
}

export function renderAnnotateSidebarPrimaryActions(
  dom: PrimaryActionsDom,
  options: AnnotateSidebarOptions,
  viewState: AnnotateSidebarViewState,
): void {
  const { quickAskButton, createTaskButton, recommendedActionLabel } = dom

  quickAskButton.style.display = viewState.allowQuickAsk ? '' : 'none'
  createTaskButton.style.display = viewState.allowCreateTask ? '' : 'none'

  quickAskButton.disabled = !viewState.canSend
  createTaskButton.disabled = !viewState.canSend

  quickAskButton.classList.toggle('primary', true)
  createTaskButton.classList.toggle('primary', true)
  quickAskButton.dataset.emphasis = 'primary'
  createTaskButton.dataset.emphasis = 'primary'
  quickAskButton.style.flex = '1'
  createTaskButton.style.flex = '1'
  quickAskButton.dataset.layoutRole = 'primary'
  createTaskButton.dataset.layoutRole = 'primary'

  quickAskButton.title = t('annotate.askAiHint')
  createTaskButton.title = t('annotate.createTaskHint')
  recommendedActionLabel.style.display = 'none'
  recommendedActionLabel.textContent =
    viewState.preferredAction === 'quick-ask'
      ? t('annotate.recommendedAction.askHint', {
          action: t('annotate.askAi'),
        })
      : t('annotate.recommendedAction.agentHint', {
          action: t('annotate.createTask'),
        })
  quickAskButton.textContent =
    options.isSending && options.sendingScope === 'quick-ask'
      ? t('menu.sending')
      : !options.isSending && options.successScope === 'quick-ask'
        ? t('annotate.sent')
        : t('annotate.askAi')
  createTaskButton.textContent =
    options.isSending && options.sendingScope === 'create-task'
      ? t('menu.sending')
      : t('annotate.createTask')
}
