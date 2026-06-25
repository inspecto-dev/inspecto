import type { AnnotateSidebarOptions, DeliveryMode, PreferredAction } from './types.js'

export type AnnotateSidebarViewState = {
  hasSavedRecords: boolean
  hasCurrentDraft: boolean
  hasBatchContent: boolean
  shouldShowBody: boolean
  canSend: boolean
  preferredAction: PreferredAction
  deliveryMode: DeliveryMode
  showDebugHelperActions: boolean
  allowQuickAsk: boolean
  allowCreateTask: boolean
}

export function getAnnotateSidebarViewState(
  options: AnnotateSidebarOptions,
): AnnotateSidebarViewState {
  const hasSavedRecords = options.session.records.length > 0
  const hasCurrentDraft = Boolean(options.session.current.target)
  const hasBatchContent = hasSavedRecords || hasCurrentDraft
  const hasLatestSession = Boolean(options.latestSessionDetail || options.latestSessionSummary)
  const hasWorkflowNotice = Boolean(options.workflowNotice)
  const shouldShowBody =
    hasSavedRecords ||
    hasCurrentDraft ||
    hasLatestSession ||
    hasWorkflowNotice ||
    options.isSending ||
    options.successScope === 'quick-ask' ||
    Boolean(options.errorMessage)
  const canSend = options.isSending ? false : options.includedRecords.length > 0 || hasCurrentDraft
  const preferredAction = options.preferredAction ?? 'create-task'
  const deliveryMode = options.deliveryMode ?? 'mcp'

  return {
    hasSavedRecords,
    hasCurrentDraft,
    hasBatchContent,
    shouldShowBody,
    canSend,
    preferredAction,
    deliveryMode,
    showDebugHelperActions: deliveryMode !== 'mcp',
    allowQuickAsk: deliveryMode === 'ide',
    allowCreateTask: deliveryMode === 'mcp',
  }
}
