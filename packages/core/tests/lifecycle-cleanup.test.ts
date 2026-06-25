import { describe, expect, it, vi } from 'vitest'
import { cleanupDisconnectedRuntime } from '../src/runtime/lifecycle-cleanup.js'

describe('lifecycle cleanup', () => {
  it('clears runtime resources when the custom element disconnects', () => {
    const cancelAnimationFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {})
    const ctx = {
      pendingAnnotateViewportFrame: 12,
      annotateSidebar: { destroy: vi.fn() },
      annotateElements: new Map([['a', document.createElement('button')]]),
      annotateDrafts: new Map([['a', { note: 'draft' }]]),
      stopLatestAnnotateSessionStream: vi.fn(),
      cleanupRuntimeContextCapture: vi.fn(),
      runtimeContextCollector: { clear: vi.fn() },
    }
    const destroySidebar = ctx.annotateSidebar.destroy
    const cleanupRuntimeContextCapture = ctx.cleanupRuntimeContextCapture

    cleanupDisconnectedRuntime(ctx)

    expect(cancelAnimationFrame).toHaveBeenCalledWith(12)
    expect(ctx.pendingAnnotateViewportFrame).toBeNull()
    expect(destroySidebar).toHaveBeenCalled()
    expect(ctx.annotateSidebar).toBeNull()
    expect(ctx.annotateElements.size).toBe(0)
    expect(ctx.annotateDrafts.size).toBe(0)
    expect(ctx.stopLatestAnnotateSessionStream).toHaveBeenCalled()
    expect(cleanupRuntimeContextCapture).toHaveBeenCalled()
    expect(ctx.cleanupRuntimeContextCapture).toBeNull()
    expect(ctx.runtimeContextCollector.clear).toHaveBeenCalled()

    cancelAnimationFrame.mockRestore()
  })

  it('does not cancel a missing viewport frame or call a missing runtime cleanup', () => {
    const cancelAnimationFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {})
    const ctx = {
      pendingAnnotateViewportFrame: null,
      annotateSidebar: null,
      annotateElements: new Map(),
      annotateDrafts: new Map(),
      stopLatestAnnotateSessionStream: vi.fn(),
      cleanupRuntimeContextCapture: null,
      runtimeContextCollector: { clear: vi.fn() },
    }

    cleanupDisconnectedRuntime(ctx)

    expect(cancelAnimationFrame).not.toHaveBeenCalled()
    expect(ctx.stopLatestAnnotateSessionStream).toHaveBeenCalled()
    expect(ctx.runtimeContextCollector.clear).toHaveBeenCalled()

    cancelAnimationFrame.mockRestore()
  })
})
