import { buildAnnotateFullPrompt } from '../features/annotate/prompts/full-prompt.js'
import type { AnnotateSidebarOptions } from '../features/annotate/sidebar/types.js'
import type { AnnotationTransport, FeedbackRecord } from '@inspecto-dev/types'
import { asAnnotateContext } from './annotate-shared.js'
import { beginEditingRecord, clearDraftForTarget } from '../features/annotate/targets/index.js'
import { t } from '../shared/i18n.js'
import { completeQuickAskAnnotationBatch } from './annotate-quick-ask-complete.js'
import { removeAnnotatePromptChip } from './annotate-sidebar-remove-chip.js'
import { sendAnnotationBatch, triggerWorkflow } from './annotate-send.js'
import { canAttachRuntimeContext } from './evidence.js'
import {
  collectAnnotationTransportsFromSession,
  formatAnnotationContextAsMarkdown,
  toAnnotationTransportFromRecordUi as toAnnotationTransportFromRecord,
} from './annotate-sidebar-transport.js'

export function composeAnnotateInstruction(ctx: unknown): string {
  return asAnnotateContext(ctx).annotateInstructionDraft.trim()
}

export function toAnnotationTransportFromRecordUi(
  _ctx: unknown,
  record: FeedbackRecord,
): AnnotationTransport {
  return toAnnotationTransportFromRecord(record)
}

function collectAnnotationTransports(ctx: unknown): AnnotationTransport[] {
  const state = asAnnotateContext(ctx)
  return collectAnnotationTransportsFromSession(state.annotateSession)
}

export function getAnnotateSidebarOptions(ctx: unknown): AnnotateSidebarOptions {
  const state = asAnnotateContext(ctx)
  const includedRecords = state.annotateSession.records
  const allAnnotations = collectAnnotationTransports(state)
  const fullInstruction = composeAnnotateInstruction(state)
  const allRuntimeContext = state.getAnnotateRuntimeContext(allAnnotations)
  const allCssContextPrompt = state.getAnnotateCssContextPrompt(allAnnotations)

  const deliveryMode = state.deliveryMode ?? 'mcp'
  let preferredAction: 'quick-ask' | 'create-task' = 'create-task'
  if (deliveryMode === 'ide') preferredAction = 'quick-ask'
  if (deliveryMode === 'mcp') preferredAction = 'create-task'

  return {
    mode: state.annotateCapturePaused ? 'capture-paused' : 'capture-enabled',
    canAttachCssContext: false,
    cssContextEnabled: false,
    canAttachRuntimeContext: canAttachRuntimeContext(state),
    runtimeContextEnabled: state.annotateRuntimeContextEnabled,
    runtimeContextSummary: state.formatRuntimeContextSummary(allRuntimeContext),
    runtimeErrorCount: state.getCollectedRuntimeErrorCount(),
    session: state.annotateSession,
    instruction: state.annotateInstructionDraft,
    includedRecords,
    fullPrompt: buildAnnotateFullPrompt({
      instruction: fullInstruction,
      annotations: allAnnotations,
      runtimeContext: allRuntimeContext,
      cssContextPrompt: allCssContextPrompt,
    }),
    isSending: state.annotateSendState.isSending,
    sendingScope: state.annotateSendState.scope,
    successScope: state.annotateSuccessScope,
    preferredAction,
    deliveryMode: state.deliveryMode,
    workflows: state.annotateWorkflows,
    latestSessionSummary: state.annotateLatestSessionSummary,
    latestSessionDetail: state.annotateLatestSessionDetail,
    latestSessionLoading: state.annotateLatestSessionLoading,
    latestSessionError: state.annotateLatestSessionError,
    workflowNotice: state.annotateWorkflowNotice,
    quickCaptureEnabled: state.annotateQuickCaptureEnabled,
    errorMessage: state.annotateErrorMessage,
    onPauseCapture: () => {
      state.annotateCapturePaused = true
      state.overlay.hide()
      state.syncRuntimeContextCapture()
      state.updateAnnotateSidebar()
    },
    onResumeCapture: () => {
      state.annotateCapturePaused = false
      state.syncRuntimeContextCapture()
      state.updateAnnotateSidebar()
    },
    onToggleQuickCapture: () => {
      state.clearAnnotateError()
      state.clearAnnotateSuccess()
      state.annotateQuickCaptureEnabled = !state.annotateQuickCaptureEnabled
      state.renderAnnotateSelectionOverlay()
      state.updateAnnotateSidebar()
    },
    onToggleRuntimeContext: () => {
      state.annotateRuntimeContextEnabled = !state.annotateRuntimeContextEnabled
      state.updateAnnotateSidebar()
      state.renderAnnotateSelectionOverlay()
    },
    onUpdateInstruction: (instruction: string) => {
      state.clearAnnotateError()
      state.clearAnnotateSuccess()
      state.annotateInstructionDraft = instruction
      state.updateAnnotateSidebar()
    },
    onRemovePromptChip: (recordId: string) => {
      state.clearAnnotateError()
      state.clearAnnotateSuccess()
      removeAnnotatePromptChip(state, recordId, target => clearDraftForTarget(state, target))

      state.renderAnnotateSelectionOverlay()
      state.updateAnnotateSidebar()
    },
    onEditRecord: recordId => {
      state.clearAnnotateError()
      state.clearAnnotateSuccess()
      beginEditingRecord(state, recordId)
    },
    onRefreshLatestSession: () => {
      void state.refreshLatestAnnotateSession()
    },
    onCopyContext: () => {
      const transports = collectAnnotationTransports(state)
      const instruction = composeAnnotateInstruction(state)
      const markdown = formatAnnotationContextAsMarkdown(instruction, transports)

      return navigator.clipboard
        .writeText(markdown)
        .then(() => {
          state.annotateErrorMessage = ''
        })
        .catch(err => {
          console.error('Failed to copy to clipboard:', err)
          state.annotateErrorMessage = t('annotate.copyContext.failed')
          state.updateAnnotateSidebar()
          throw err
        })
    },
    onQuickAsk: () => {
      const transports = collectAnnotationTransports(state)

      void sendAnnotationBatch(
        state,
        transports,
        'quick-ask',
        composeAnnotateInstruction(state),
        'ide',
        () => {
          completeQuickAskAnnotationBatch(state)
          state.renderAnnotateSelectionOverlay()
        },
      )
    },
    onCreateTask: () => {
      const transports = collectAnnotationTransports(state)

      void sendAnnotationBatch(
        state,
        transports,
        'create-task',
        composeAnnotateInstruction(state),
        'mcp',
        () => {
          // Records are kept visible so the user can see badge status updates
          // (saved -> completed) driven by the live session stream. The session
          // will be cleared when the user starts a new annotation batch (onSave).
        },
      )
    },
    onWorkflow: workflowId => {
      void triggerWorkflow(state, workflowId)
    },
    onExit: () => {
      state.exitAnnotateMode()
    },
  }
}
