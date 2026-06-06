import type { AnnotateSidebarOptions } from '../features/annotate/sidebar/index.js'
import {
  beginEditingRecord as beginAnnotateEditing,
  clearAnnotateError as clearAnnotateErrorState,
  clearAnnotateSuccess as clearAnnotateSuccessState,
  clearDraftForTarget as clearAnnotateDraftForTarget,
  findElementForAnnotationTarget as findAnnotateTargetElement,
  getAnnotateSidebarOptions as buildAnnotateSidebarOptions,
  getNextRecordDisplayOrder as getAnnotateNextRecordDisplayOrder,
  persistCurrentDraft as persistAnnotateDraft,
  rebindCurrentAnnotationElements as rebindAnnotateElements,
  renderAnnotateSelectionOverlay as renderAnnotateOverlay,
  refreshLatestAnnotateSession as refreshLatestAnnotateSessionState,
  restoreEditingRecord as restoreAnnotateEditingRecord,
  showAnnotateSuccess as showAnnotateBatchSuccess,
  startLatestAnnotateSessionStream as startLatestAnnotateSessionStreamState,
  stopLatestAnnotateSessionStream as stopLatestAnnotateSessionStreamState,
} from './annotate.js'
import { updateBadgeContent as updateLauncherBadgeContent } from './launcher.js'
import {
  mountAnnotateSidebar as mountAnnotateSidebarUi,
  syncModeUi as syncInspectorModeUi,
  updateAnnotateSidebar as updateAnnotateSidebarUi,
} from './mode-ui.js'
import {
  formatRuntimeContextSummary as formatRuntimeSummary,
  getAnnotateCssContextPrompt as getAnnotateCssPrompt,
  getAnnotateRuntimeContext as getAnnotateRuntimeEvidence,
  getCollectedRuntimeErrorCount as getRuntimeErrorCount,
  isCssContextEnabledForTarget as isCssEnabledForTarget,
  isCssContextEnabledForTransportTarget as isCssEnabledForTransportTarget,
  syncRuntimeContextCapture as syncRuntimeCapture,
} from './evidence.js'
import type { createRuntimeContextEnvelope } from '../features/evidence/runtime-context/index.js'
import { InspectoElementState } from './inspecto-state.js'
import type { AnnotationTarget, AnnotationTransport } from '@inspecto-dev/types'

type RuntimeContextEnvelope = ReturnType<typeof createRuntimeContextEnvelope>

// Runtime host hooks consumed through structural context casts.
// Keep these grouped by owning runtime module.
export abstract class InspectoRuntimeHost extends InspectoElementState {
  // launcher
  protected updateBadgeContent(): void {
    updateLauncherBadgeContent(this)
  }

  // evidence
  protected syncRuntimeContextCapture(): void {
    syncRuntimeCapture(this)
  }

  protected isCssContextEnabledForTarget(target: AnnotationTarget): boolean {
    return isCssEnabledForTarget(this, target)
  }

  protected isCssContextEnabledForTransportTarget(
    target: AnnotationTransport['targets'][number],
  ): boolean {
    return isCssEnabledForTransportTarget(this, target)
  }

  protected getAnnotateCssContextPrompt(
    annotations: AnnotationTransport[],
    includeWhenDisabled = false,
  ): string | null {
    return getAnnotateCssPrompt(this, annotations, includeWhenDisabled)
  }

  protected getAnnotateRuntimeContext(
    annotations: AnnotationTransport[],
    includeWhenDisabled = false,
  ): RuntimeContextEnvelope | null {
    return getAnnotateRuntimeEvidence(this, annotations, includeWhenDisabled)
  }

  protected formatRuntimeContextSummary(runtimeContext: RuntimeContextEnvelope | null): string {
    return formatRuntimeSummary(runtimeContext)
  }

  protected getCollectedRuntimeErrorCount(): number {
    return getRuntimeErrorCount(this)
  }

  // annotate targets and UI
  protected persistCurrentDraft(): void {
    persistAnnotateDraft(this)
  }

  protected clearDraftForTarget(target: AnnotationTarget | null | undefined): void {
    clearAnnotateDraftForTarget(this, target)
  }

  protected restoreEditingRecord(): void {
    restoreAnnotateEditingRecord(this)
  }

  protected beginEditingRecord(recordId: string): void {
    beginAnnotateEditing(this, recordId)
  }

  protected findElementForAnnotationTarget(target: AnnotationTarget): Element | null {
    return findAnnotateTargetElement(this, target)
  }

  protected rebindCurrentAnnotationElements(): void {
    rebindAnnotateElements(this)
  }

  protected getNextRecordDisplayOrder(): number {
    return getAnnotateNextRecordDisplayOrder(this)
  }

  protected clearAnnotateError(): void {
    clearAnnotateErrorState(this)
  }

  protected clearAnnotateSuccess(): void {
    clearAnnotateSuccessState(this)
  }

  protected showAnnotateSuccess(scope: 'quick-ask' | 'create-task'): void {
    showAnnotateBatchSuccess(this, scope)
  }

  protected async refreshLatestAnnotateSession(): Promise<void> {
    return refreshLatestAnnotateSessionState(this)
  }

  protected startLatestAnnotateSessionStream(sessionId: string): void {
    startLatestAnnotateSessionStreamState(this, sessionId)
  }

  protected stopLatestAnnotateSessionStream(): void {
    stopLatestAnnotateSessionStreamState(this)
  }

  // mode UI
  protected syncModeUi(): void {
    syncInspectorModeUi(this)
  }

  protected mountAnnotateSidebar(): void {
    mountAnnotateSidebarUi(this)
  }

  protected updateAnnotateSidebar(): void {
    updateAnnotateSidebarUi(this)
  }

  protected getAnnotateSidebarOptions(): AnnotateSidebarOptions {
    return buildAnnotateSidebarOptions(this)
  }

  protected renderAnnotateSelectionOverlay(): void {
    renderAnnotateOverlay(this)
  }
}
