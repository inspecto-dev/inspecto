import type { AnnotateSidebarOptions, AnnotateWorkflowNotice } from './annotate-sidebar.js'
import type { AnnotateSendScope } from './annotate-sidebar-helpers.js'
import type { SelectedTargetOverlayEntry } from './annotate-overlay.js'
import type {
  AnnotationTarget,
  AnnotationTransport,
  AnnotationWorkSession,
  AnnotationWorkSessionSummary,
  FeedbackRecord,
  FeedbackRecordDraft,
} from '@inspecto-dev/types'

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
  annotateChannel: 'ide' | 'mcp'
  annotateWorkflows: import('@inspecto-dev/types').WorkflowSlotOption[]
  annotateSendState: {
    isSending: boolean
    scope: AnnotateSendScope
  }
  annotateLatestSessionSummary: AnnotationWorkSessionSummary | null
  annotateLatestSessionDetail: AnnotationWorkSession | null
  annotateLatestSessionStream: import('./http.js').AnnotationSessionEventStreamConnection | null
  annotateLatestSessionLoading: boolean
  annotateLatestSessionError: string
  annotateWorkflowNotice: AnnotateWorkflowNotice | null
  annotateSuccessScope: 'quick-ask' | 'create-task' | null
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
  showAnnotateSuccess(scope: 'quick-ask' | 'create-task'): void
  refreshLatestAnnotateSession(): Promise<void>
  startLatestAnnotateSessionStream(sessionId: string): void
  stopLatestAnnotateSessionStream(): void
  getAnnotateRuntimeContext(
    annotations: AnnotationTransport[],
    includeWhenDisabled?: boolean,
  ): ReturnType<typeof import('./runtime-context.js').createRuntimeContextEnvelope> | null
  getAnnotateCssContextPrompt(
    annotations: AnnotationTransport[],
    includeWhenDisabled?: boolean,
  ): string | null
  canAttachRuntimeContext(): boolean
  formatRuntimeContextSummary(
    runtimeContext: ReturnType<
      typeof import('./runtime-context.js').createRuntimeContextEnvelope
    > | null,
  ): string
  getCollectedRuntimeErrorCount(): number
  canAttachCssContext(): boolean
}

export function asAnnotateContext(ctx: unknown): AnnotateContext {
  return ctx as AnnotateContext
}
