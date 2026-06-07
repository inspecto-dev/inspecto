import type { AnnotateSidebarOptions, AnnotateWorkflowNotice } from './sidebar/types.js'
import type { AnnotateSendScope } from './sidebar/helpers.js'
import type { SelectedTargetOverlayEntry } from './overlay/index.js'
import type {
  AnnotationTarget,
  AnnotationTransport,
  AnnotationWorkSession,
  AnnotationWorkSessionSummary,
  FeedbackRecord,
  FeedbackRecordDraft,
  WorkflowSlotOption,
} from '@inspecto-dev/types'
import type { AnnotationSessionEventStreamConnection } from '../../transport/http-client.js'
import type { createRuntimeContextEnvelope } from '../evidence/runtime-context/index.js'

type RuntimeContextEnvelope = ReturnType<typeof createRuntimeContextEnvelope>

export type AnnotateContext = {
  cleanupMenu: (() => void) | null
  annotateSession: {
    current: {
      id: string
      displayOrder?: number
      target: AnnotationTarget | null
      note: string
      intent: 'review' | 'fix' | 'redesign' | 'ask'
      cssContextEnabled?: boolean
    }
    records: FeedbackRecord[]
  }
  annotateCapturePaused: boolean
  annotateQuickCaptureEnabled: boolean
  annotateSidebar: { update(next: AnnotateSidebarOptions): void; destroy(): void } | null
  annotateOverlay: {
    render(
      targets: SelectedTargetOverlayEntry[],
      current?: {
        targetId: string
        targetLabel: string
        targetMeta: string
        note: string
        onOpenInEditor: () => void
        canAttachCssContext: boolean
        cssContextEnabled: boolean
        canAttachRuntimeContext: boolean
        runtimeContextEnabled: boolean
        runtimeContextSummary: string
        runtimeErrorCount: number
        saveLabel: string
        onToggleCssContext: () => void
        onUpdateNote: (note: string) => void
        onSave: () => void
        onCancel: () => void
        onDelete?: () => void
      },
    ): void
    clear(): void
  } | null
  annotateElements: Map<string, Element>
  annotateDrafts: Map<string, FeedbackRecordDraft>
  annotateEditingRecord: FeedbackRecord | null
  annotateInstructionDraft: string
  annotateErrorMessage: string
  annotateRuntimeContextEnabled: boolean
  annotateCssContextEnabled: boolean
  deliveryMode: 'ide' | 'mcp'
  annotateWorkflows: WorkflowSlotOption[]
  annotateSendState: {
    isSending: boolean
    scope: AnnotateSendScope
  }
  annotateLatestSessionSummary: AnnotationWorkSessionSummary | null
  annotateLatestSessionDetail: AnnotationWorkSession | null
  annotateLatestSessionStream: AnnotationSessionEventStreamConnection | null
  annotateLatestSessionLoading: boolean
  annotateLatestSessionError: string
  annotateWorkflowNotice: AnnotateWorkflowNotice | null
  annotateSuccessScope: 'quick-ask' | 'create-task' | 'clipboard' | null
  annotateSuccessTimeout: ReturnType<typeof setTimeout> | null
  annotateSuccessOnClear: (() => void) | null
  configLoadPromise: Promise<void> | null
  mode: 'inspect' | 'annotate'
  shadowRootEl: ShadowRoot
  overlay: { hide(): void }
  setMode(mode: 'inspect' | 'annotate'): void
  syncModeUi(): void
  syncRuntimeContextCapture(): void
  updateAnnotateSidebar(): void
  getAnnotateSidebarOptions(): AnnotateSidebarOptions
  renderAnnotateSelectionOverlay(): void
  clearAnnotateError(): void
  clearAnnotateSuccess(): void
  showAnnotateSuccess(scope: 'quick-ask' | 'create-task' | 'clipboard'): void
  refreshLatestAnnotateSession(): Promise<void>
  startLatestAnnotateSessionStream(sessionId: string): void
  stopLatestAnnotateSessionStream(): void
  getAnnotateRuntimeContext(
    annotations: AnnotationTransport[],
    includeWhenDisabled?: boolean,
  ): RuntimeContextEnvelope | null
  getAnnotateCssContextPrompt(
    annotations: AnnotationTransport[],
    includeWhenDisabled?: boolean,
  ): string | null
  formatRuntimeContextSummary(runtimeContext: RuntimeContextEnvelope | null): string
  getCollectedRuntimeErrorCount(): number
}

export function asAnnotateContext(ctx: unknown): AnnotateContext {
  return ctx as AnnotateContext
}
