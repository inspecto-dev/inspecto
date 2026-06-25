import { createOverlay } from '../features/inspect/overlay/index.js'
import { fetchIdeInfo } from '../transport/http-client.js'
import { inspectorStyles } from '../shared/styles/index.js'
import { setBaseUrl, setClientTransport } from '../transport/http-client.js'
import { configureI18n } from '../shared/i18n.js'
import { createBadge, setActive, updateBadgeContent } from './launcher.js'
import { cleanupDisconnectedRuntime } from './lifecycle-cleanup.js'
import {
  buildI18nConfig,
  canUseInspectMode,
  getThemeAttributeValue,
  mergeServerRuntimeContext,
  shouldFallbackToAnnotateMode,
} from './lifecycle-config.js'
import { syncRuntimeContextCapture } from './evidence.js'
import { syncModeUi, updateAnnotateSidebar } from './mode-ui.js'
import type { InspectoOptions, InspectorMode } from './inspecto-state.js'
import type { HotKeys, IdeType, WorkflowSlotOption } from '@inspecto-dev/types'

type LifecycleContext = {
  options: InspectoOptions
  mode: InspectorMode
  ide: IdeType
  ideConnected: boolean
  ideConnectionKnown: boolean
  serverHotKeys: HotKeys | null
  shadowRootEl: ShadowRoot
  overlay: ReturnType<typeof createOverlay>
  annotateOverlay: { clear(): void } | null
  badge: HTMLDivElement
  configLoadPromise: Promise<void> | null
  annotateSidebar: { destroy(): void } | null
  annotateElements: Map<string, Element>
  annotateDrafts: Map<string, unknown>
  cleanupRuntimeContextCapture: (() => void) | null
  runtimeContextCollector: { clear(): void }
  pendingAnnotateViewportFrame: number | null
  annotateCapturePaused: boolean
  annotateQuickCaptureEnabled: boolean
  annotateRuntimeContextEnabled: boolean
  annotateCssContextEnabled: boolean
  deliveryMode: 'ide' | 'mcp'
  annotateWorkflows: WorkflowSlotOption[]
  stopLatestAnnotateSessionStream(): void
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  attachShadow(options: ShadowRootInit): ShadowRoot
}

function asLifecycleContext(ctx: unknown): LifecycleContext {
  return ctx as LifecycleContext
}

function applyTheme(state: LifecycleContext, theme?: 'light' | 'dark' | 'auto'): void {
  const themeAttribute = getThemeAttributeValue(theme)
  if (themeAttribute) {
    state.setAttribute('data-theme', themeAttribute)
    return
  }
  state.removeAttribute('data-theme')
}

function resetAnnotateState(state: LifecycleContext): void {
  state.annotateCapturePaused = false
  state.annotateQuickCaptureEnabled = false
  state.annotateRuntimeContextEnabled = false
  state.annotateCssContextEnabled = false
  state.stopLatestAnnotateSessionStream()
}

export function connect(
  ctx: unknown,
  createAnnotateOverlay: (root: ShadowRoot) => LifecycleContext['annotateOverlay'],
  setupListeners: () => void,
): void {
  const state = asLifecycleContext(ctx)
  configureI18n(buildI18nConfig(state.options))
  const host = state as unknown as HTMLElement
  host.style.position = 'fixed'
  host.style.inset = '0'
  host.style.pointerEvents = 'none'
  host.style.zIndex = '2147483646'
  state.shadowRootEl = state.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = inspectorStyles
  state.shadowRootEl.appendChild(style)

  state.overlay = createOverlay(state.shadowRootEl)
  state.annotateOverlay = createAnnotateOverlay(state.shadowRootEl)
  state.badge = createBadge(state)

  setupListeners()
  syncRuntimeContextCapture(state)
  syncModeUi(state)

  if (state.options.defaultActive) {
    setActive(state, true)
  }
}

export function disconnect(ctx: unknown, teardownListeners: () => void): void {
  const state = asLifecycleContext(ctx)
  cleanupDisconnectedRuntime(state)
  teardownListeners()
  setClientTransport(null)
}

export function configure(ctx: unknown, options: InspectoOptions): void {
  const state = asLifecycleContext(ctx)
  state.options = options
  configureI18n(buildI18nConfig(options))
  if (options.mode !== undefined) {
    const previousMode = state.mode
    state.mode = options.mode
    if (options.mode !== 'annotate' && previousMode === 'annotate') {
      resetAnnotateState(state)
    }
  }
  if (options.serverUrl) {
    setBaseUrl(options.serverUrl)
  }
  setClientTransport(options.transport)

  applyTheme(state, options.theme)

  state.configLoadPromise = fetchIdeInfo(true)
    .then(info => {
      if (info?.hotKeys !== undefined) {
        state.serverHotKeys = info.hotKeys
      }
      if (info?.theme !== undefined) {
        applyTheme(state, info.theme)
      }
      if (info?.ide !== undefined) {
        state.ide = info.ide
      }
      if (info && Object.prototype.hasOwnProperty.call(info, 'ideConnected')) {
        state.ideConnectionKnown = true
        state.ideConnected = (info as { ideConnected?: boolean }).ideConnected === true
      }
      if (info?.deliveryMode !== undefined) {
        state.deliveryMode = info.deliveryMode
      }
      if (info?.workflows !== undefined) {
        state.annotateWorkflows = info.workflows
      }
      if (info?.includeSnippet !== undefined) {
        state.options.includeSnippet = info.includeSnippet
      }
      if (info?.runtimeContext !== undefined) {
        state.options.runtimeContext = mergeServerRuntimeContext(
          state.options.runtimeContext,
          info.runtimeContext,
        )
        syncRuntimeContextCapture(state)
      }

      const modeChanged = shouldFallbackToAnnotateMode(state)
      if (modeChanged) {
        state.mode = 'annotate'
      }

      if (modeChanged) {
        syncRuntimeContextCapture(state)
        syncModeUi(state)
      } else {
        updateBadgeContent(state)
      }

      if (state.mode === 'annotate' && state.annotateSidebar) {
        updateAnnotateSidebar(state)
      }
    })
    .catch(() => {})
    .then(() => {})

  if (state.shadowRootEl) {
    syncRuntimeContextCapture(state)
    syncModeUi(state)
  }
}

export function setMode(ctx: unknown, mode: 'inspect' | 'annotate'): void {
  const state = asLifecycleContext(ctx)
  const previousMode = state.mode
  state.mode = mode === 'inspect' && !canUseInspectMode(state) ? 'annotate' : mode

  if (state.mode === 'annotate') {
    state.overlay.hide()
  } else if (previousMode === 'annotate') {
    resetAnnotateState(state)
  }

  syncRuntimeContextCapture(state)
  syncModeUi(state)
}

export function exitAnnotateMode(ctx: unknown): void {
  const state = asLifecycleContext(ctx)
  if (state.mode === 'annotate') {
    resetAnnotateState(state)
  }
  state.mode = 'inspect'
  setActive(state, false)
  syncRuntimeContextCapture(state)
  syncModeUi(state)
}
