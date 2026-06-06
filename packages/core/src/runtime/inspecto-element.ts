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
  createBadge as createLauncherBadge,
  setActive as setLauncherActive,
  setPaused as setLauncherPaused,
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
    connectInspector(this, root => createAnnotateOverlay(root))
  }

  disconnectedCallback(): void {
    disconnectInspector(this)
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

  private createBadge(): HTMLDivElement {
    return createLauncherBadge(this)
  }

  private setPaused(value: boolean): void {
    setLauncherPaused(this, value)
    this.syncModeUi()
  }

  private updateBadgeContent(): void {
    updateLauncherBadgeContent(this)
  }

  private setActive(value: boolean): void {
    setLauncherActive(this, value)
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

  private syncRuntimeContextCapture(): void {
    syncRuntimeCapture(this)
  }

  private isCssContextEnabledForTarget(target: AnnotationTarget): boolean {
    return isCssEnabledForTarget(this, target)
  }

  private isCssContextEnabledForTransportTarget(
    target: AnnotationTransport['targets'][number],
  ): boolean {
    return isCssEnabledForTransportTarget(this, target)
  }

  private getAnnotateCssContextPrompt(
    annotations: AnnotationTransport[],
    includeWhenDisabled = false,
  ): string | null {
    return getAnnotateCssPrompt(this, annotations, includeWhenDisabled)
  }

  private getAnnotateRuntimeContext(
    annotations: AnnotationTransport[],
    includeWhenDisabled = false,
  ): ReturnType<typeof createRuntimeContextEnvelope> | null {
    return getAnnotateRuntimeEvidence(this, annotations, includeWhenDisabled)
  }

  private formatRuntimeContextSummary(
    runtimeContext: ReturnType<typeof createRuntimeContextEnvelope> | null,
  ): string {
    return formatRuntimeSummary(runtimeContext)
  }

  private getCollectedRuntimeErrorCount(): number {
    return getRuntimeErrorCount(this)
  }

  private persistCurrentDraft(): void {
    persistAnnotateDraft(this)
  }

  private clearDraftForTarget(target: AnnotationTarget | null | undefined): void {
    clearAnnotateDraftForTarget(this, target)
  }

  private restoreEditingRecord(): void {
    restoreAnnotateEditingRecord(this)
  }

  private beginEditingRecord(recordId: string): void {
    beginAnnotateEditing(this, recordId)
  }

  private findElementForAnnotationTarget(target: AnnotationTarget): Element | null {
    return findAnnotateTargetElement(this, target)
  }

  private rebindCurrentAnnotationElements(): void {
    rebindAnnotateElements(this)
  }

  private getNextRecordDisplayOrder(): number {
    return getAnnotateNextRecordDisplayOrder(this)
  }

  private clearAnnotateError(): void {
    clearAnnotateErrorState(this)
  }

  private clearAnnotateSuccess(): void {
    clearAnnotateSuccessState(this)
  }

  private showAnnotateSuccess(scope: 'quick-ask' | 'create-task'): void {
    showAnnotateBatchSuccess(this, scope)
  }

  private async refreshLatestAnnotateSession(): Promise<void> {
    return refreshLatestAnnotateSessionState(this)
  }

  private startLatestAnnotateSessionStream(sessionId: string): void {
    startLatestAnnotateSessionStreamState(this, sessionId)
  }

  private stopLatestAnnotateSessionStream(): void {
    stopLatestAnnotateSessionStreamState(this)
  }

  private syncModeUi(): void {
    syncInspectorModeUi(this)
  }

  private mountAnnotateSidebar(): void {
    mountAnnotateSidebarUi(this)
  }

  private updateAnnotateSidebar(): void {
    updateAnnotateSidebarUi(this)
  }

  private getAnnotateSidebarOptions(): AnnotateSidebarOptions {
    return buildAnnotateSidebarOptions(this)
  }

  private renderAnnotateSelectionOverlay(): void {
    renderAnnotateOverlay(this)
  }

  private setupListeners(): void {
    setupInspectorListeners(this, {
      onMouseMove: this.onMouseMove,
      onClick: this.onClick,
      onContextMenu: this.onContextMenu,
      onKeyDown: this.onKeyDown,
      onFocusChange: this.onFocusChange,
      onViewportChange: this.onViewportChange,
    })
  }

  private teardownListeners(): void {
    teardownInspectorListeners(this, {
      onMouseMove: this.onMouseMove,
      onClick: this.onClick,
      onContextMenu: this.onContextMenu,
      onKeyDown: this.onKeyDown,
      onFocusChange: this.onFocusChange,
      onViewportChange: this.onViewportChange,
    })
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('inspecto-overlay')) {
  customElements.define('inspecto-overlay', InspectoElement)
}

export type { InspectorMode } from './inspecto-state.js'
export { InspectoElement }
