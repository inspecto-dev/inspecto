import type { AnnotateSidebarOptions } from './annotate-sidebar.js'
import type { SelectedTargetOverlayEntry } from './annotate-overlay.js'
import type {
  AnnotationTarget,
  AnnotationTransport,
  FeedbackRecord,
  FeedbackRecordDraft,
  ScreenshotContext,
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
        canAttachScreenshotContext: boolean
        screenshotContextEnabled: boolean
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
  annotateScreenshotContextEnabled: boolean
  annotateCssContextEnabled: boolean
  annotateSendState: {
    isSending: boolean
    scope: 'batch' | null
  }
  annotateSuccessScope: 'batch' | null
  annotateSuccessTimeout: ReturnType<typeof setTimeout> | null
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
  showAnnotateSuccess(scope: 'batch'): void
  getAnnotationResponseMode(): 'unified' | 'per-annotation'
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
  captureAnnotateScreenshotContext(
    annotations: AnnotationTransport[],
    scope: 'current' | 'batch',
  ): Promise<ScreenshotContext | null>
}

export function asAnnotateContext(ctx: unknown): AnnotateContext {
  return ctx as AnnotateContext
}
