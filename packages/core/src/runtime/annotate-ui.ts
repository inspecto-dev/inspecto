import {
  clearCurrentRecord,
  updateCurrentRecordCssContextEnabled,
  updateCurrentRecordNote,
} from '../features/annotate/session/index.js'
import type { SelectedTargetOverlayEntry } from '../features/annotate/overlay/index.js'
import { openFile } from '../transport/http-client.js'
import { asAnnotateContext } from './annotate-shared.js'
import { canAttachCssContext } from './evidence.js'
import {
  beginEditingRecord,
  clearDraftForTarget,
  findElementForAnnotationTarget,
  getAnnotationTargetKey,
  restoreEditingRecord,
} from '../features/annotate/targets/index.js'
import { t } from '../shared/i18n.js'
import { saveCurrentAnnotationRecord } from './annotate-current-save.js'

export { toAnnotateErrorMessage } from './annotate-errors.js'

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
    canAttachCssContext: canAttachCssContext(),
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
      saveCurrentAnnotationRecord(state, target => clearDraftForTarget(state, target))
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
