import type { AiErrorCode, AnnotationDeliveryMode, AnnotationTransport } from '@inspecto-dev/types'
import { createEmptySession } from '../features/annotate/session/index.js'
import {
  isStandardAnnotateSendScope,
  type AnnotateSendScope,
} from '../features/annotate/sidebar/helpers.js'
import { sendAnnotationsToAi, sendToAi } from '../transport/http-client.js'
import { asAnnotateContext } from './annotate-shared.js'
import { toAnnotateErrorMessage } from './annotate-errors.js'

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

    if (deliveryMode === 'mcp') {
      state.annotateLatestSessionSummary = result.session ?? null
      state.annotateLatestSessionDetail = null
      state.annotateLatestSessionError = ''
      if (result.session?.id) {
        state.startLatestAnnotateSessionStream(result.session.id)
        void state.refreshLatestAnnotateSession()
      } else {
        state.stopLatestAnnotateSessionStream()
      }
    } else {
      state.annotateLatestSessionSummary = null
      state.annotateLatestSessionDetail = null
      state.annotateLatestSessionError = ''
      state.stopLatestAnnotateSessionStream()
    }

    onSuccess()

    state.annotateErrorMessage = ''
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

  const deliveryMode = state.deliveryMode ?? 'mcp'

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
