import { createOverlay } from './overlay.js'
import { showIntentMenu } from './menu.js'
import { createEmptySession, updateCurrentRecordIntent } from './annotate-session.js'
import { createAnnotateSidebar } from './annotate-sidebar.js'
import type { AnnotateSidebarOptions } from './annotate-sidebar.js'
import { createAnnotateOverlay } from './annotate-overlay.js'
import {
  addTargetToCurrentAnnotation as addAnnotateTarget,
  beginEditingRecord as beginAnnotateEditing,
  clearAnnotateError as clearAnnotateErrorState,
  clearAnnotateSuccess as clearAnnotateSuccessState,
  clearDraftForTarget as clearAnnotateDraftForTarget,
  composeAnnotateInstruction as composeAnnotateBatchInstruction,
  createAnnotationTarget as createAnnotateTarget,
  describeElement as describeInspectableElement,
  findElementForAnnotationTarget as findAnnotateTargetElement,
  findElementForLocation as findElementByLocation,
  getAnnotateSidebarOptions as buildAnnotateSidebarOptions,
  getAnnotationTargetKey as getAnnotateTargetKey,
  getNextRecordDisplayOrder as getAnnotateNextRecordDisplayOrder,
  hasCurrentRecord as hasAnnotateCurrentRecord,
  markTargetInAnnotateSession as markAnnotateTarget,
  persistCurrentDraft as persistAnnotateDraft,
  rebindCurrentAnnotationElements as rebindAnnotateElements,
  renderAnnotateSelectionOverlay as renderAnnotateOverlay,
  restoreEditingRecord as restoreAnnotateEditingRecord,
  sendAnnotationBatch as sendAnnotateBatch,
  showAnnotateSuccess as showAnnotateBatchSuccess,
  toAnnotateErrorMessage as toAnnotateRequestErrorMessage,
  toAnnotationTransportFromRecord as toAnnotateTransportFromRecord,
} from './component-annotate.js'
import {
  createBadge as createLauncherBadge,
  dismiss as dismissLauncher,
  getEffectiveHotKeys as getLauncherHotKeys,
  getHotKeyLabel as getLauncherHotKeyLabel,
  setActive as setLauncherActive,
  setPaused as setLauncherPaused,
  shouldInvertLauncherEye as shouldInvertBadgeEye,
  shouldQuickJumpOnTrigger as shouldQuickJump,
  updateBadgeContent as updateLauncherBadgeContent,
  updateLauncherEye as syncLauncherEye,
} from './component-launcher.js'
import {
  handleKeyDown as handleInspectorKeyDown,
  handleMouseMove as handleInspectorMouseMove,
  handleTrigger as handleInspectorTrigger,
  handleViewportChange as handleInspectorViewportChange,
  openInspectMenu as openInspectorIntentMenu,
} from './component-interactions.js'
import {
  isInspectorActive as resolveInspectorActive,
  mountAnnotateSidebar as mountAnnotateSidebarUi,
  setupListeners as setupInspectorListeners,
  syncModeUi as syncInspectorModeUi,
  teardownListeners as teardownInspectorListeners,
  updateAnnotateSidebar as updateAnnotateSidebarUi,
} from './component-mode-ui.js'
import {
  configure as configureInspector,
  connect as connectInspector,
  disconnect as disconnectInspector,
  setMode as setInspectorMode,
} from './component-lifecycle.js'
import {
  canAttachCssContext as canAttachCssEvidence,
  canAttachRuntimeContext as canAttachRuntimeEvidence,
  canAttachScreenshotContext as canAttachScreenshotEvidence,
  captureAnnotateScreenshotContext as captureAnnotateScreenshotEvidence,
  captureCssContextPromptForElement as captureCssPromptForElement,
  formatRuntimeContextSummary as formatRuntimeSummary,
  getAnnotateCssContextPrompt as getAnnotateCssPrompt,
  getAnnotateRuntimeContext as getAnnotateRuntimeEvidence,
  getCollectedRuntimeErrorCount as getRuntimeErrorCount,
  getRuntimeContextLimits as getRuntimeEvidenceLimits,
  isCssContextEnabledForTarget as isCssEnabledForTarget,
  isCssContextEnabledForTransportTarget as isCssEnabledForTransportTarget,
  resolveAnnotateScreenshotElement as resolveAnnotateScreenshotTarget,
  syncRuntimeContextCapture as syncRuntimeCapture,
} from './component-evidence.js'
import {
  ATTR_NAME,
  createElementSelector,
  findInspectable,
  hotKeysHeld,
  parseAttrValue,
} from './component-utils.js'
import {
  createRuntimeContextCollector,
  createRuntimeContextEnvelope,
  selectRuntimeEvidence,
} from './runtime-context.js'
import { captureElementScreenshot } from './screenshot-context.js'
import type {
  AnnotationTransport,
  AnnotationTarget,
  AiErrorCode,
  FeedbackRecord,
  FeedbackRecordDraft,
  InspectorOptions,
  SourceLocation,
  HotKeys,
  ScreenshotContext,
} from '@inspecto-dev/types'
import { sendAnnotationsToAi } from './http.js'
export type InspectorMode = 'inspect' | 'annotate'
type InspectoOptions = InspectorOptions & { mode?: InspectorMode }

const DEFAULT_ANNOTATE_INSTRUCTION = ''

// Fallback class for SSR environments
const BaseElement =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as typeof HTMLElement)

class InspectoElement extends BaseElement {
  private options: InspectoOptions = {}
  private serverHotKeys: HotKeys | null = null
  private active = false
  private disabled = false
  private prePauseState: { active: boolean; mode: InspectorMode } = {
    active: false,
    mode: 'inspect',
  }
  private mode: InspectorMode = 'inspect'
  private launcherPanelOpen = false
  private shadowRootEl!: ShadowRoot
  private overlay!: ReturnType<typeof createOverlay>
  private annotateOverlay: ReturnType<typeof createAnnotateOverlay> | null = null
  private cleanupMenu: (() => void) | null = null
  private annotateSession = createEmptySession()
  private annotateCapturePaused = false
  private annotateQuickCaptureEnabled = false
  private annotateSidebar: ReturnType<typeof createAnnotateSidebar> | null = null
  private annotateElements = new Map<string, Element>()
  private annotateDrafts = new Map<string, FeedbackRecordDraft>()
  private annotateEditingRecord: FeedbackRecord | null = null
  private badge!: HTMLDivElement
  private configLoadPromise: Promise<void> | null = null
  private annotationResponseMode: 'unified' | 'per-annotation' = 'unified'
  private annotateInstructionDraft = DEFAULT_ANNOTATE_INSTRUCTION
  private annotateErrorMessage = ''
  private annotateRuntimeContextEnabled = false
  private annotateScreenshotContextEnabled = false
  private annotateCssContextEnabled = false
  private annotateSendState: {
    isSending: boolean
    scope: 'batch' | null
  } = {
    isSending: false,
    scope: null,
  }
  private annotateSuccessScope: 'batch' | null = null
  private annotateSuccessTimeout: ReturnType<typeof setTimeout> | null = null
  private pendingAnnotateViewportFrame: number | null = null
  private runtimeContextCollector = createRuntimeContextCollector()
  private cleanupRuntimeContextCapture: (() => void) | null = null
  private lastPointerX = 0
  private lastPointerY = 0
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

  private dismiss(): void {
    dismissLauncher(this)
  }

  private getHotKeyLabel(): string {
    return getLauncherHotKeyLabel(this)
  }

  private getEffectiveHotKeys(): HotKeys {
    return getLauncherHotKeys(this)
  }

  private getAnnotationResponseMode(): 'unified' | 'per-annotation' {
    return this.annotationResponseMode
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
    if (this.isInspectorActive(e)) {
      this.handleTrigger(e)
    }
  }

  private handleTrigger(e: MouseEvent): void {
    handleInspectorTrigger(this, e)
  }

  private shouldQuickJumpOnTrigger(e: MouseEvent): boolean {
    return shouldQuickJump(this, e)
  }

  private shouldInvertLauncherEye(): boolean {
    return shouldInvertBadgeEye(this)
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

  private openInspectMenu(
    loc: SourceLocation,
    clientX: number,
    clientY: number,
    targetElement: Element,
  ): void {
    openInspectorIntentMenu(this, loc, clientX, clientY, targetElement)
  }

  private syncRuntimeContextCapture(): void {
    syncRuntimeCapture(this)
  }

  private canAttachRuntimeContext(): boolean {
    return canAttachRuntimeEvidence(this)
  }

  private canAttachScreenshotContext(): boolean {
    return canAttachScreenshotEvidence(this)
  }

  private canAttachCssContext(): boolean {
    return canAttachCssEvidence()
  }

  private captureCssContextPromptForElement(
    element: Element,
    location: SourceLocation,
  ): string | null {
    return captureCssPromptForElement(this, element, location)
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

  private getRuntimeContextLimits(): {
    maxRuntimeErrors?: number
    maxFailedRequests?: number
  } {
    return getRuntimeEvidenceLimits(this)
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

  private resolveAnnotateScreenshotElement(
    annotations: AnnotationTransport[],
    scope: 'current' | 'batch',
  ): Element | null {
    return resolveAnnotateScreenshotTarget(this, annotations, scope)
  }

  private async captureAnnotateScreenshotContext(
    annotations: AnnotationTransport[],
    scope: 'current' | 'batch',
  ): Promise<ScreenshotContext | null> {
    return captureAnnotateScreenshotEvidence(this, annotations, scope)
  }

  private addTargetToCurrentAnnotation(element: Element, location: SourceLocation): void {
    addAnnotateTarget(this, element, location)
  }

  private markTargetInAnnotateSession(element: Element, location: SourceLocation): void {
    markAnnotateTarget(this, element, location)
  }

  private getAnnotationTargetKey(target: AnnotationTarget): string {
    return getAnnotateTargetKey(this, target)
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

  private findElementForLocation(location: SourceLocation, selector?: string): Element | null {
    return findElementByLocation(this, location, selector)
  }

  private rebindCurrentAnnotationElements(): void {
    rebindAnnotateElements(this)
  }

  private createAnnotationTarget(element: Element, location: SourceLocation): AnnotationTarget {
    return createAnnotateTarget(this, element, location)
  }

  private describeElement(element: Element): string {
    return describeInspectableElement(this, element)
  }

  private createSelector(element: Element): string {
    return createElementSelector(element)
  }

  private hasCurrentRecord(): boolean {
    return hasAnnotateCurrentRecord(this)
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

  private showAnnotateSuccess(scope: 'batch'): void {
    showAnnotateBatchSuccess(this, scope)
  }

  private toAnnotateErrorMessage(errorCode?: AiErrorCode, fallback?: string): string {
    return toAnnotateRequestErrorMessage(this, errorCode, fallback)
  }

  private toAnnotationTransportFromRecord(record: FeedbackRecord): AnnotationTransport {
    return toAnnotateTransportFromRecord(this, record)
  }

  private async sendAnnotationBatch(
    annotations: AnnotationTransport[],
    scope: 'batch',
    instruction: string,
    onSuccess: () => void,
  ): Promise<void> {
    return sendAnnotateBatch(this, annotations, scope, instruction, onSuccess)
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

  private composeAnnotateInstruction(): string {
    return composeAnnotateBatchInstruction(this)
  }

  private renderAnnotateSelectionOverlay(): void {
    renderAnnotateOverlay(this)
  }

  private isInspectorActive(e: MouseEvent): boolean {
    return resolveInspectorActive(this, e)
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

export { InspectoElement }
