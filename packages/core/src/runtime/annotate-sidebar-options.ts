import {
  clearCurrentRecord,
  createEmptySession,
  removeRecord,
} from '../features/annotate/session/index.js'
import { buildAnnotateFullPrompt } from '../features/annotate/prompts/full-prompt.js'
import type { AnnotateSidebarOptions } from '../features/annotate/sidebar/index.js'
import type { AnnotationTransport, FeedbackRecord } from '@inspecto-dev/types'
import { asAnnotateContext } from './annotate-shared.js'
import { beginEditingRecord, clearDraftForTarget } from '../features/annotate/targets/index.js'
import { t } from '../shared/i18n.js'
import { sendAnnotationBatch, triggerWorkflow } from './annotate-send.js'
import { getNextRecordDisplayOrderUi, hasCurrentRecordUi } from './annotate-ui.js'

function formatContextAsMarkdown(instruction: string, annotations: AnnotationTransport[]): string {
  let md = ''
  if (instruction) {
    md += `${instruction}\n\n`
  }
  if (annotations.length > 0) {
    md += '### Selected Elements\n\n'
    annotations.forEach((ann, index) => {
      md += `**Annotation ${index + 1}**\n`
      if (ann.note) {
        md += `* Note: ${ann.note}\n`
      }
      ann.targets.forEach((target, targetIndex) => {
        md += `\n* Target ${targetIndex + 1}:\n`
        if (target.label) md += `  - Label: \`${target.label}\`\n`
        if (target.location)
          md += `  - Location: \`${target.location.file.split('/').pop() || target.location.file}:${target.location.line}:${target.location.column}\`\n`
        if (target.selector) md += `  - Selector: \`${target.selector}\`\n`
        if (target.snippet) md += `\n  \`\`\`\n${target.snippet}\n  \`\`\`\n`
      })
      md += '\n---\n\n'
    })
  }
  return md.trim()
}

export function composeAnnotateInstruction(ctx: unknown): string {
  return asAnnotateContext(ctx).annotateInstructionDraft.trim()
}

export function toAnnotationTransportFromRecordUi(
  _ctx: unknown,
  record: FeedbackRecord,
): AnnotationTransport {
  return {
    note: record.note,
    intent: record.intent,
    targets: [
      {
        location: record.target.location,
        ...(record.target.label ? { label: record.target.label } : {}),
        ...(record.target.selector ? { selector: record.target.selector } : {}),
      },
    ],
  }
}

function collectAnnotationTransports(ctx: unknown): AnnotationTransport[] {
  const state = asAnnotateContext(ctx)
  const transports = state.annotateSession.records.map(record =>
    toAnnotationTransportFromRecordUi(null, record),
  )
  if (hasCurrentRecordUi(state) && state.annotateSession.current.target) {
    transports.push(
      toAnnotationTransportFromRecordUi(null, {
        id: state.annotateSession.current.id,
        displayOrder:
          state.annotateSession.current.displayOrder ?? getNextRecordDisplayOrderUi(state),
        target: state.annotateSession.current.target,
        note: state.annotateSession.current.note,
        intent: state.annotateSession.current.intent,
      }),
    )
  }
  return transports
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
    canAttachRuntimeContext: state.canAttachRuntimeContext(),
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

      const currentTarget =
        state.annotateSession.current.id === recordId ? state.annotateSession.current.target : null
      const savedRecord =
        state.annotateSession.records.find(record => record.id === recordId) ?? null

      if (currentTarget) {
        clearDraftForTarget(state, currentTarget)
        state.annotateSession = clearCurrentRecord(state.annotateSession)
        state.annotateEditingRecord = null
        state.annotateElements.clear()
      } else if (savedRecord) {
        clearDraftForTarget(state, savedRecord.target)
        state.annotateSession = removeRecord(state.annotateSession, recordId)
      }

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
      const markdown = formatContextAsMarkdown(instruction, transports)

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
          state.annotateInstructionDraft = ''
          state.annotateDrafts.clear()
          state.annotateEditingRecord = null
          state.annotateSession = createEmptySession()
          state.annotateElements.clear()

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
      state.setMode('inspect')
    },
  }
}
