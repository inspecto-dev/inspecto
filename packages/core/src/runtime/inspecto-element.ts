import type { AnnotateSidebarOptions } from '../features/annotate/sidebar/index.js'
import { createAnnotateOverlay } from '../features/annotate/overlay/index.js'
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
import {
  updateBadgeContent as updateLauncherBadgeContent,
  updateLauncherEye as syncLauncherEye,
} from './launcher.js'
import {
  handleKeyDown as handleInspectorKeyDown,
  handleMouseMove as handleInspectorMouseMove,
  handleTrigger as handleInspectorTrigger,
  handleViewportChange as handleInspectorViewportChange,
} from './interactions.js'
import {
  isInspectorActive,
  mountAnnotateSidebar as mountAnnotateSidebarUi,
  setupListeners as setupInspectorListeners,
  syncModeUi as syncInspectorModeUi,
  teardownListeners as teardownInspectorListeners,
  updateAnnotateSidebar as updateAnnotateSidebarUi,
} from './mode-ui.js'
import {
  configure as configureInspector,
  connect as connectInspector,
  disconnect as disconnectInspector,
  setMode as setInspectorMode,
} from './lifecycle.js'
import {
  formatRuntimeContextSummary as formatRuntimeSummary,
  getAnnotateCssContextPrompt as getAnnotateCssPrompt,
  getAnnotateRuntimeContext as getAnnotateRuntimeEvidence,
  getCollectedRuntimeErrorCount as getRuntimeErrorCount,
  isCssContextEnabledForTarget as isCssEnabledForTarget,
  isCssContextEnabledForTransportTarget as isCssEnabledForTransportTarget,
  syncRuntimeContextCapture as syncRuntimeCapture,
} from './evidence.js'
import { createRuntimeContextEnvelope } from '../features/evidence/runtime-context/index.js'
import type { InspectorMode, InspectoOptions } from './inspecto-state.js'
import { InspectoElementState } from './inspecto-state.js'
import type { AnnotationTransport, AnnotationTarget } from '@inspecto-dev/types'
class InspectoElement extends InspectoElementState {
  private readonly onFocusChange = (): void => {
    this.updateLauncherEye()
  }

  connectedCallback(): void {
    connectInspector(
      this,
      root => createAnnotateOverlay(root),
      () => setupInspectorListeners(this, this.listenerHandlers),
    )
  }

  disconnectedCallback(): void {
    disconnectInspector(this, () => teardownInspectorListeners(this, this.listenerHandlers))
  }

  configure(options: InspectoOptions): void {
    configureInspector(this, options)
  }

  setMode(mode: InspectorMode): void {
    setInspectorMode(this, mode)
  }

  getMode(): InspectorMode {
    return this.mode
  }

  // Runtime host hooks consumed through structural context casts.
  // Keep these grouped by owning runtime module.

  // launcher
  protected updateBadgeContent(): void {
    updateLauncherBadgeContent(this)
  }

  private readonly onMouseMove = (e: MouseEvent): void => {
    handleInspectorMouseMove(this, e)
  }

  private readonly onClick = (e: MouseEvent): void => {
    this.handleTrigger(e)
  }

  private readonly onContextMenu = (e: MouseEvent): void => {
    if (isInspectorActive(this, e)) {
      this.handleTrigger(e)
    }
  }

  private handleTrigger(e: MouseEvent): void {
    handleInspectorTrigger(this, e)
  }

  private updateLauncherEye(): void {
    syncLauncherEye(this)
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    handleInspectorKeyDown(this, e)
  }

  private readonly onViewportChange = (): void => {
    handleInspectorViewportChange(this)
  }

  private readonly listenerHandlers = {
    onMouseMove: this.onMouseMove,
    onClick: this.onClick,
    onContextMenu: this.onContextMenu,
    onKeyDown: this.onKeyDown,
    onFocusChange: this.onFocusChange,
    onViewportChange: this.onViewportChange,
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
  ): ReturnType<typeof createRuntimeContextEnvelope> | null {
    return getAnnotateRuntimeEvidence(this, annotations, includeWhenDisabled)
  }

  protected formatRuntimeContextSummary(
    runtimeContext: ReturnType<typeof createRuntimeContextEnvelope> | null,
  ): string {
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

if (typeof customElements !== 'undefined' && !customElements.get('inspecto-overlay')) {
  customElements.define('inspecto-overlay', InspectoElement)
}

export type { InspectorMode } from './inspecto-state.js'
export { InspectoElement }
