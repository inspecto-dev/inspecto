import { createOverlay } from './overlay.js'
import { fetchIdeInfo } from './http.js'
import { inspectorStyles } from './styles.js'
import { setBaseUrl } from './http.js'
import { configureI18n } from './i18n.js'
import type { HotKeys, InspectorOptions } from '@inspecto-dev/types'

type InspectoOptions = InspectorOptions & { mode?: 'inspect' | 'annotate' }

type LifecycleContext = {
  options: InspectoOptions
  mode: 'inspect' | 'annotate'
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
  annotateDeliveryMode: 'ide' | 'agent' | 'both'
  stopLatestAnnotateSessionStream(): void
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  attachShadow(options: ShadowRootInit): ShadowRoot
  createBadge(): HTMLDivElement
  setActive(value: boolean): void
  setupListeners(): void
  teardownListeners(): void
  syncRuntimeContextCapture(): void
  syncModeUi(): void
}

function asLifecycleContext(ctx: unknown): LifecycleContext {
  return ctx as LifecycleContext
}

function applyTheme(state: LifecycleContext, theme?: 'light' | 'dark' | 'auto'): void {
  if (theme === 'dark') {
    state.setAttribute('data-theme', 'dark')
    return
  }
  if (theme === 'light') {
    state.setAttribute('data-theme', 'light')
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

function buildI18nConfig(input: {
  locale?: InspectoOptions['locale']
  messages?: InspectoOptions['messages']
}): {
  locale?: NonNullable<InspectoOptions['locale']>
  messages?: NonNullable<InspectoOptions['messages']>
} {
  const config: {
    locale?: NonNullable<InspectoOptions['locale']>
    messages?: NonNullable<InspectoOptions['messages']>
  } = {}
  if (input.locale !== undefined) {
    config.locale = input.locale
  }
  if (input.messages !== undefined) {
    config.messages = input.messages
  }
  return config
}

export function connect(
  ctx: unknown,
  createAnnotateOverlay: (root: ShadowRoot) => LifecycleContext['annotateOverlay'],
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
  state.badge = state.createBadge()

  state.setupListeners()
  state.syncRuntimeContextCapture()
  state.syncModeUi()

  if (state.options.defaultActive) {
    state.setActive(true)
  }
}

export function disconnect(ctx: unknown): void {
  const state = asLifecycleContext(ctx)
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
  state.teardownListeners()
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

  applyTheme(state, options.theme)

  state.configLoadPromise = fetchIdeInfo(true)
    .then(info => {
      if (info?.hotKeys !== undefined) {
        state.serverHotKeys = info.hotKeys
        state.syncModeUi()
      }
      if (info?.theme !== undefined) {
        applyTheme(state, info.theme)
      }
      if (info?.annotateDeliveryMode !== undefined) {
        state.annotateDeliveryMode = info.annotateDeliveryMode
      }
      if (info?.includeSnippet !== undefined) {
        state.options.includeSnippet = info.includeSnippet
      }
      if (info?.runtimeContext !== undefined) {
        state.options.runtimeContext = {
          ...state.options.runtimeContext,
          ...info.runtimeContext,
        }
        state.syncRuntimeContextCapture()
      }
    })
    .catch(() => {})
    .then(() => {})

  if (state.shadowRootEl) {
    state.syncRuntimeContextCapture()
    state.syncModeUi()
  }
}

export function setMode(ctx: unknown, mode: 'inspect' | 'annotate'): void {
  const state = asLifecycleContext(ctx)
  const previousMode = state.mode
  state.mode = mode

  if (mode === 'annotate') {
    state.overlay.hide()
  } else if (previousMode === 'annotate') {
    resetAnnotateState(state)
  }

  state.syncRuntimeContextCapture()
  state.syncModeUi()
}
