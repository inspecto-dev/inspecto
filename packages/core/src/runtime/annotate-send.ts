import type {
  AiErrorCode,
  AnnotationDeliveryMode,
  AnnotationTransport,
  RuntimeContextEnvelope,
} from '@inspecto-dev/types'
import { buildAnnotateFullPrompt } from '../features/annotate/prompts/full-prompt.js'
import {
  isStandardAnnotateSendScope,
  type AnnotateSendScope,
} from '../features/annotate/sidebar/helpers.js'
import { sendAnnotationsToAi, sendToAi } from '../transport/http-client.js'
import { asAnnotateContext } from './annotate-shared.js'
import { toAnnotateErrorMessage } from './annotate-errors.js'
import {
  completeIdeWorkflowDispatch,
  completeMcpWorkflowDispatch,
} from './annotate-workflow-complete.js'

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
      if (result.errorCode === 'SERVER_UNAVAILABLE') {
        const copied = await copyAnnotationPromptToClipboard({
          instruction,
          annotations,
          ...(runtimeContext ? { runtimeContext } : {}),
          ...(cssContextPrompt ? { cssContextPrompt } : {}),
        })
        if (copied) {
          state.annotateErrorMessage = ''
          state.showAnnotateSuccess('clipboard')
          state.renderAnnotateSelectionOverlay()
          state.updateAnnotateSidebar()
          return
        }

        state.annotateErrorMessage = 'Unable to copy the fallback prompt to the clipboard.'
        state.updateAnnotateSidebar()
        return
      }

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

async function copyAnnotationPromptToClipboard(input: {
  instruction: string
  annotations: AnnotationTransport[]
  runtimeContext?: RuntimeContextEnvelope | null
  cssContextPrompt?: string | null
}): Promise<boolean> {
  const prompt = buildAnnotateFullPrompt({
    instruction: input.instruction,
    annotations: input.annotations,
    ...(input.runtimeContext ? { runtimeContext: input.runtimeContext } : {}),
    ...(input.cssContextPrompt ? { cssContextPrompt: input.cssContextPrompt } : {}),
  })

  try {
    await navigator.clipboard.writeText(prompt)
    return true
  } catch {
    return copyTextWithLegacyClipboard(prompt)
  }
}

function copyTextWithLegacyClipboard(text: string): boolean {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'

  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
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

      completeIdeWorkflowDispatch(state, {
        workflowId,
        workflowLabel: workflow?.label ?? workflowId,
      })
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
      completeMcpWorkflowDispatch(state)
      state.renderAnnotateSelectionOverlay()
    },
    { source: 'workflow', workflowId },
  )
}
