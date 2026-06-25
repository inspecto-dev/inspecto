type DisconnectedRuntimeCleanupContext = {
  pendingAnnotateViewportFrame: number | null
  annotateSidebar: { destroy(): void } | null
  annotateElements: Map<string, Element>
  annotateDrafts: Map<string, unknown>
  cleanupRuntimeContextCapture: (() => void) | null
  runtimeContextCollector: { clear(): void }
  stopLatestAnnotateSessionStream(): void
}

export function cleanupDisconnectedRuntime(state: DisconnectedRuntimeCleanupContext): void {
  if (state.pendingAnnotateViewportFrame !== null) {
    cancelAnimationFrame(state.pendingAnnotateViewportFrame)
    state.pendingAnnotateViewportFrame = null
  }
  state.annotateSidebar?.destroy()
  state.annotateSidebar = null
  state.annotateElements.clear()
  state.annotateDrafts.clear()
  state.stopLatestAnnotateSessionStream()
  state.cleanupRuntimeContextCapture?.()
  state.cleanupRuntimeContextCapture = null
  state.runtimeContextCollector.clear()
}
