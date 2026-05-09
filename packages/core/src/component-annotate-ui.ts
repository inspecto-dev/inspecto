import {
  clearCurrentRecord,
  createEmptySession,
  removeRecord,
  saveCurrentRecord,
  updateCurrentRecordCssContextEnabled,
  updateCurrentRecordNote,
} from './annotate-session.js'
import { buildAnnotateFullPrompt } from './annotate-full-prompt.js'
import type { AnnotateSidebarOptions } from './annotate-sidebar.js'
import { isStandardAnnotateSendScope, type AnnotateSendScope } from './annotate-sidebar-helpers.js'
import type { SelectedTargetOverlayEntry } from './annotate-overlay.js'
import {
  fetchAnnotationSession,
  openAnnotationSessionEventStream,
  openFile,
  sendToAi,
  sendAnnotationsToAi,
} from './http.js'
import type {
  AiErrorCode,
  AnnotationDeliveryMode,
  AnnotationSessionEvent,
  AnnotationTransport,
  FeedbackRecord,
  AnnotationWorkSession,
} from '@inspecto-dev/types'
import { asAnnotateContext } from './component-annotate-shared.js'
import {
  beginEditingRecord,
  clearDraftForTarget,
  findElementForAnnotationTarget,
  getAnnotationTargetKey,
  restoreEditingRecord,
} from './component-annotate-targets.js'
import { t } from './i18n.js'

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

export function hasCurrentRecordUi(ctx: unknown): boolean {
  return Boolean(asAnnotateContext(ctx).annotateSession.current.target)
}

export function getNextRecordDisplayOrderUi(ctx: unknown): number {
  const state = asAnnotateContext(ctx)
  return (
    state.annotateSession.records.reduce(
      (maxOrder, record) => Math.max(maxOrder, record.displayOrder),
      0,
    ) + 1
  )
}

export function clearAnnotateError(ctx: unknown): void {
  const state = asAnnotateContext(ctx)
  if (!state.annotateErrorMessage) return
  state.annotateErrorMessage = ''
  state.updateAnnotateSidebar()
}

export function clearAnnotateSuccess(ctx: unknown): void {
  const state = asAnnotateContext(ctx)
  const hadSuccess = state.annotateSuccessScope !== null
  state.annotateSuccessScope = null
  if (state.annotateSuccessTimeout) {
    clearTimeout(state.annotateSuccessTimeout)
    state.annotateSuccessTimeout = null
  }
  state.annotateSuccessOnClear = null
  if (hadSuccess) {
    state.updateAnnotateSidebar()
  }
}

export function showAnnotateSuccess(ctx: unknown, scope: 'quick-ask' | 'create-task'): void {
  const state = asAnnotateContext(ctx)
  clearAnnotateSuccess(state)
  state.annotateSuccessScope = scope
  state.annotateSuccessTimeout = setTimeout(() => {
    const onClear = state.annotateSuccessOnClear
    state.annotateSuccessScope = null
    state.annotateSuccessTimeout = null
    state.annotateSuccessOnClear = null
    onClear?.()
    state.updateAnnotateSidebar()
  }, 1500)
}

function updateLatestSessionState(ctx: unknown, session: AnnotationWorkSession): void {
  const state = asAnnotateContext(ctx)
  state.annotateLatestSessionDetail = session
  state.annotateLatestSessionSummary = {
    id: session.id,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }
  state.annotateLatestSessionError = ''

  if (session.status === 'resolved' || session.status === 'dismissed') {
    state.stopLatestAnnotateSessionStream()
  }

  // Trigger overlay re-render to update badge colors/states dynamically
  state.renderAnnotateSelectionOverlay()
}

export function toAnnotateErrorMessage(
  _ctx: unknown,
  errorCode?: AiErrorCode,
  fallback?: string,
): string {
  if (errorCode === 'FORBIDDEN_PATH') {
    return 'Some selected targets are outside the current project workspace.'
  }
  if (errorCode === 'INVALID_REQUEST') {
    return 'The current annotation batch is incomplete. Check your targets and try again.'
  }
  if (errorCode === 'SERVER_UNAVAILABLE') {
    return 'Inspecto could not reach the local dev server. Restart your dev server, then try again. If it still fails, run `inspecto doctor` or `npx @inspecto-dev/cli doctor` from the project root.'
  }
  return fallback ?? 'Request failed'
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

export async function sendAnnotationBatch(
  ctx: unknown,
  annotations: AnnotationTransport[],
  scope: AnnotateSendScope,
  instruction: string,
  deliveryMode: AnnotationDeliveryMode,
  onSuccess: () => void,
  extraPayload?: { source?: 'annotation' | 'workflow'; workflowId?: string },
): Promise<void> {
  const state = asAnnotateContext(ctx)
  if (state.annotateSendState.isSending) return
  if (annotations.length === 0 && extraPayload?.source !== 'workflow') return

  state.annotateSendState = { isSending: true, scope }
  state.updateAnnotateSidebar()

  try {
    await state.configLoadPromise
    const runtimeContext = state.getAnnotateRuntimeContext(annotations)
    const cssContextPrompt = state.getAnnotateCssContextPrompt(annotations)

    const result = await sendAnnotationsToAi({
      instruction,
      annotations,
      ...(runtimeContext ? { runtimeContext } : {}),
      ...(cssContextPrompt ? { cssContextPrompt } : {}),
      deliveryMode,
      ...(extraPayload || {}),
    })

    if (!result.success) {
      state.annotateErrorMessage = toAnnotateErrorMessage(state, result.errorCode, result.error)
      state.updateAnnotateSidebar()
      return
    }

    state.annotateLatestSessionSummary = result.session ?? null
    state.annotateLatestSessionDetail = null
    state.annotateLatestSessionError = ''
    if (result.session?.id) {
      state.startLatestAnnotateSessionStream(result.session.id)
      void state.refreshLatestAnnotateSession()
    } else {
      state.stopLatestAnnotateSessionStream()
    }

    onSuccess()

    state.annotateErrorMessage = ''
    // For quick-ask: show transient success banner.
    // For create-task: only announce via aria-live (no visual banner); the
    // sidebar's live session section shows status from that point on.
    if (isStandardAnnotateSendScope(scope)) {
      state.showAnnotateSuccess(scope)
    }
    state.renderAnnotateSelectionOverlay()
    state.updateAnnotateSidebar()
  } catch (err) {
    state.annotateErrorMessage = toAnnotateErrorMessage(
      state,
      (err as { errorCode?: AiErrorCode }).errorCode,
      (err as Error).message,
    )
    state.updateAnnotateSidebar()
  } finally {
    state.annotateSendState = { isSending: false, scope: null }
    state.updateAnnotateSidebar()
  }
}

export async function triggerWorkflow(ctx: unknown, workflowId: string): Promise<void> {
  const state = asAnnotateContext(ctx)
  if (state.annotateSendState.isSending) return

  const workflow = state.annotateWorkflows.find(w => w.id === workflowId)
  const workflowPrompt = workflow?.prompt || ''
  if (!workflowPrompt.trim()) return

  const deliveryMode = state.annotateChannel ?? 'mcp'

  if (deliveryMode === 'ide') {
    const scope: AnnotateSendScope = `workflow:${workflowId}`
    state.annotateSendState = { isSending: true, scope }
    state.updateAnnotateSidebar()

    try {
      await state.configLoadPromise
      const result = await sendToAi({
        prompt: workflowPrompt,
      })

      if (!result.success) {
        state.annotateErrorMessage = toAnnotateErrorMessage(state, result.errorCode, result.error)
        state.updateAnnotateSidebar()
        return
      }

      state.annotateInstructionDraft = ''
      state.annotateSession = createEmptySession()
      state.annotateEditingRecord = null
      state.annotateElements.clear()
      state.annotateLatestSessionSummary = null
      state.annotateLatestSessionDetail = null
      state.stopLatestAnnotateSessionStream()
      state.annotateLatestSessionError = ''
      state.annotateWorkflowNotice = {
        kind: 'ide-dispatch',
        workflowId,
        workflowLabel: workflow?.label ?? workflowId,
      }
      state.annotateErrorMessage = ''
      state.renderAnnotateSelectionOverlay()
      state.updateAnnotateSidebar()
    } catch (err) {
      state.annotateErrorMessage = toAnnotateErrorMessage(
        state,
        (err as { errorCode?: AiErrorCode }).errorCode,
        (err as Error).message,
      )
      state.updateAnnotateSidebar()
    } finally {
      state.annotateSendState = { isSending: false, scope: null }
      state.updateAnnotateSidebar()
    }
    return
  }

  state.annotateWorkflowNotice = null

  await sendAnnotationBatch(
    ctx,
    [],
    `workflow:${workflowId}`,
    workflowPrompt,
    'mcp',
    () => {
      state.annotateInstructionDraft = ''
      state.annotateSession = createEmptySession()
      state.annotateEditingRecord = null
      state.annotateElements.clear()
      state.renderAnnotateSelectionOverlay()
    },
    { source: 'workflow', workflowId },
  )
}

export async function refreshLatestAnnotateSession(ctx: unknown): Promise<void> {
  const state = asAnnotateContext(ctx)
  const sessionId = state.annotateLatestSessionSummary?.id ?? state.annotateLatestSessionDetail?.id
  if (!sessionId || state.annotateLatestSessionLoading) return

  state.annotateLatestSessionLoading = true
  state.annotateLatestSessionError = ''
  state.updateAnnotateSidebar()

  try {
    const result = await fetchAnnotationSession(sessionId)
    if (!result.success || !result.session) {
      state.annotateLatestSessionError = toAnnotateErrorMessage(
        state,
        result.errorCode,
        result.error ?? 'Failed to refresh latest session.',
      )
      return
    }

    updateLatestSessionState(state, result.session)
  } finally {
    state.annotateLatestSessionLoading = false
    state.updateAnnotateSidebar()
  }
}

export function startLatestAnnotateSessionStream(ctx: unknown, sessionId: string): void {
  const state = asAnnotateContext(ctx)
  state.stopLatestAnnotateSessionStream()

  const connection = openAnnotationSessionEventStream(sessionId, {
    onEvent: (event: AnnotationSessionEvent) => {
      if (event.session.id !== sessionId) return
      updateLatestSessionState(state, event.session)
      state.updateAnnotateSidebar()
    },
    onError: () => {
      state.annotateLatestSessionError =
        'Live session updates disconnected. You can refresh to reconnect.'
      state.updateAnnotateSidebar()
    },
  })

  state.annotateLatestSessionStream = connection
}

export function stopLatestAnnotateSessionStream(ctx: unknown): void {
  const state = asAnnotateContext(ctx)
  state.annotateLatestSessionStream?.close()
  state.annotateLatestSessionStream = null
}

export function getAnnotateSidebarOptions(ctx: unknown): AnnotateSidebarOptions {
  const state = asAnnotateContext(ctx)
  const includedRecords = state.annotateSession.records
  const savedAnnotations = state.annotateSession.records.map(record =>
    toAnnotationTransportFromRecordUi(null, record),
  )
  const allAnnotations = [...savedAnnotations]
  if (hasCurrentRecordUi(state) && state.annotateSession.current.target) {
    allAnnotations.push({
      note: state.annotateSession.current.note,
      intent: state.annotateSession.current.intent,
      targets: [
        {
          location: state.annotateSession.current.target.location,
          ...(state.annotateSession.current.target.label
            ? { label: state.annotateSession.current.target.label }
            : {}),
          ...(state.annotateSession.current.target.selector
            ? { selector: state.annotateSession.current.target.selector }
            : {}),
        },
      ],
    })
  }
  const fullInstruction = composeAnnotateInstruction(state)
  const allRuntimeContext = state.getAnnotateRuntimeContext(allAnnotations)
  const allCssContextPrompt = state.getAnnotateCssContextPrompt(allAnnotations)

  const channelPreference = state.annotateChannel ?? 'mcp'
  let preferredAction: 'quick-ask' | 'create-task' = 'create-task'
  if (channelPreference === 'ide') preferredAction = 'quick-ask'
  if (channelPreference === 'mcp') preferredAction = 'create-task'

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
    annotateChannel: state.annotateChannel,
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

      void sendAnnotationBatch(
        state,
        transports,
        'create-task',
        composeAnnotateInstruction(state),
        'mcp',
        () => {
          // Records are kept visible so the user can see badge status updates
          // (saved → completed) driven by the live session stream. The session
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

export function composeAnnotateInstruction(ctx: unknown): string {
  return asAnnotateContext(ctx).annotateInstructionDraft.trim()
}

export function renderAnnotateSelectionOverlay(ctx: unknown): void {
  const state = asAnnotateContext(ctx)
  if (!state.annotateOverlay) return

  if (state.mode !== 'annotate') {
    state.annotateOverlay.clear()
    return
  }

  const overlayTargets: SelectedTargetOverlayEntry[] = state.annotateSession.records
    .map((record): SelectedTargetOverlayEntry | null => {
      if (state.annotateEditingRecord?.id === record.id) return null
      const element = findElementForAnnotationTarget(state, record.target)
      if (!element) return null
      const overlayState: SelectedTargetOverlayEntry['state'] =
        state.annotateLatestSessionSummary?.status === 'resolved' ||
        state.annotateLatestSessionDetail?.status === 'resolved'
          ? 'completed'
          : 'saved'
      return {
        id: record.id,
        element,
        order: record.displayOrder,
        state: overlayState,
        note: record.note,
        onActivate: () => {
          state.clearAnnotateError()
          state.clearAnnotateSuccess()
          beginEditingRecord(state, record.id)
        },
      }
    })
    .filter((entry): entry is SelectedTargetOverlayEntry => entry !== null)

  const target = state.annotateSession.current.target
  const currentElement = target
    ? state.annotateElements.get(state.annotateSession.current.id)
    : null

  if (!target || !currentElement) {
    state.annotateOverlay.render(overlayTargets)
    return
  }

  overlayTargets.push({
    id: state.annotateSession.current.id,
    element: currentElement,
    order: state.annotateSession.current.displayOrder ?? getNextRecordDisplayOrderUi(state),
    state: 'current',
  })

  state.annotateOverlay.render(overlayTargets, {
    targetId: getAnnotationTargetKey(state, target),
    targetLabel: target.label,
    targetMeta: `${target.location.file.split('/').pop() || target.location.file}:${target.location.line}:${target.location.column}`,
    note: state.annotateSession.current.note,
    onOpenInEditor: () => {
      void openFile(target.location)
    },
    canAttachCssContext: state.canAttachCssContext(),
    cssContextEnabled: state.annotateSession.current.cssContextEnabled ?? false,
    canAttachRuntimeContext: false,
    runtimeContextEnabled: false,
    runtimeContextSummary: '',
    runtimeErrorCount: 0,
    saveLabel: state.annotateEditingRecord ? t('annotate.updateNote') : t('annotate.saveNote'),
    onToggleCssContext: () => {
      state.annotateSession = updateCurrentRecordCssContextEnabled(
        state.annotateSession,
        !(state.annotateSession.current.cssContextEnabled ?? false),
      )
      state.updateAnnotateSidebar()
      state.renderAnnotateSelectionOverlay()
    },
    onUpdateNote: note => {
      state.clearAnnotateError()
      state.clearAnnotateSuccess()
      state.annotateSession = updateCurrentRecordNote(state.annotateSession, note)
      state.updateAnnotateSidebar()
    },
    onSave: () => {
      if (!hasCurrentRecordUi(state)) return
      state.clearAnnotateError()
      state.clearAnnotateSuccess()
      // If saving a record into a new batch, clear the stale resolved session
      // so its 'completed' color doesn't bleed onto the fresh annotations.
      if (
        state.annotateLatestSessionSummary?.status === 'resolved' ||
        state.annotateLatestSessionDetail?.status === 'resolved'
      ) {
        // Previous batch is resolved — clear only the stale task state so the
        // new annotation can start a fresh batch without losing the current
        // note being saved.
        const currentDraft = state.annotateSession.current
        state.annotateLatestSessionSummary = null
        state.annotateLatestSessionDetail = null
        state.stopLatestAnnotateSessionStream()
        state.annotateInstructionDraft = ''
        state.annotateDrafts.clear()
        state.annotateEditingRecord = null
        state.annotateSession = {
          current: currentDraft,
          records: [],
        }
      }
      clearDraftForTarget(state, state.annotateSession.current.target)
      state.annotateSession = saveCurrentRecord(state.annotateSession)
      state.annotateEditingRecord = null
      state.annotateElements.clear()
      state.renderAnnotateSelectionOverlay()
      state.updateAnnotateSidebar()
    },
    onCancel: () => {
      state.clearAnnotateError()
      state.clearAnnotateSuccess()
      clearDraftForTarget(state, state.annotateSession.current.target)
      state.annotateSession = clearCurrentRecord(state.annotateSession)
      restoreEditingRecord(state)
      state.annotateElements.clear()
      state.renderAnnotateSelectionOverlay()
      state.updateAnnotateSidebar()
    },
    ...(state.annotateEditingRecord
      ? {
          onDelete: () => {
            state.clearAnnotateError()
            state.clearAnnotateSuccess()
            clearDraftForTarget(state, state.annotateSession.current.target)
            state.annotateEditingRecord = null
            state.annotateSession = clearCurrentRecord(state.annotateSession)
            state.annotateElements.clear()
            state.renderAnnotateSelectionOverlay()
            state.updateAnnotateSidebar()
          },
        }
      : {}),
  })
}
