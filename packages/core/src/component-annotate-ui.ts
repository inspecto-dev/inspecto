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
import type { SelectedTargetOverlayEntry } from './annotate-overlay.js'
import { openFile, sendAnnotationsToAi } from './http.js'
import type { AiErrorCode, AnnotationTransport, FeedbackRecord } from '@inspecto-dev/types'
import { asAnnotateContext } from './component-annotate-shared.js'
import {
  beginEditingRecord,
  clearDraftForTarget,
  findElementForAnnotationTarget,
  getAnnotationTargetKey,
  restoreEditingRecord,
} from './component-annotate-targets.js'

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
  if (hadSuccess) {
    state.updateAnnotateSidebar()
  }
}

export function showAnnotateSuccess(ctx: unknown, scope: 'batch'): void {
  const state = asAnnotateContext(ctx)
  clearAnnotateSuccess(state)
  state.annotateSuccessScope = scope
  state.annotateSuccessTimeout = setTimeout(() => {
    state.annotateSuccessScope = null
    state.annotateSuccessTimeout = null
    state.updateAnnotateSidebar()
  }, 1500)
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
  scope: 'batch',
  instruction: string,
  onSuccess: () => void,
): Promise<void> {
  const state = asAnnotateContext(ctx)
  if (annotations.length === 0 || state.annotateSendState.isSending) return

  state.annotateSendState = { isSending: true, scope }
  state.updateAnnotateSidebar()

  try {
    await state.configLoadPromise
    const runtimeContext = state.getAnnotateRuntimeContext(annotations)
    const screenshotContext = state.annotateScreenshotContextEnabled
      ? await state.captureAnnotateScreenshotContext(annotations, scope)
      : null
    const cssContextPrompt = state.getAnnotateCssContextPrompt(annotations)

    const result = await sendAnnotationsToAi({
      instruction,
      annotations,
      responseMode: state.getAnnotationResponseMode(),
      ...(runtimeContext ? { runtimeContext } : {}),
      ...(screenshotContext ? { screenshotContext } : {}),
      ...(cssContextPrompt ? { cssContextPrompt } : {}),
    })

    if (!result.success) {
      state.annotateErrorMessage = toAnnotateErrorMessage(state, result.errorCode, result.error)
      state.updateAnnotateSidebar()
      return
    }

    onSuccess()
    state.annotateErrorMessage = ''
    state.showAnnotateSuccess(scope)
    state.annotateElements.clear()
    state.renderAnnotateSelectionOverlay()
    state.updateAnnotateSidebar()
  } catch {
    state.annotateErrorMessage = 'Request failed'
    state.updateAnnotateSidebar()
  } finally {
    state.annotateSendState = { isSending: false, scope: null }
    state.updateAnnotateSidebar()
  }
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

  return {
    mode: state.annotateCapturePaused ? 'capture-paused' : 'capture-enabled',
    canAttachScreenshotContext: false,
    screenshotContextEnabled: state.annotateScreenshotContextEnabled,
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
      responseMode: state.getAnnotationResponseMode(),
      runtimeContext: allRuntimeContext,
      cssContextPrompt: allCssContextPrompt,
    }),
    isSending: state.annotateSendState.isSending,
    sendingScope: state.annotateSendState.scope,
    successScope: state.annotateSuccessScope,
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
    onSend: () => {
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
        'batch',
        composeAnnotateInstruction(state),
        () => {
          state.annotateDrafts.clear()
          state.annotateEditingRecord = null
          state.annotateSession = createEmptySession()
        },
      )
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
      return {
        id: record.id,
        element,
        order: record.displayOrder,
        state: 'saved' as const,
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
    canAttachScreenshotContext: false,
    screenshotContextEnabled: false,
    canAttachCssContext: state.canAttachCssContext(),
    cssContextEnabled: state.annotateSession.current.cssContextEnabled ?? false,
    canAttachRuntimeContext: false,
    runtimeContextEnabled: false,
    runtimeContextSummary: '',
    runtimeErrorCount: 0,
    saveLabel: state.annotateEditingRecord ? 'Update note' : 'Save note',
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
