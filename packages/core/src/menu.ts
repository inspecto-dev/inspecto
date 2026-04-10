import { createIntentActionButtons } from './menu-actions.js'
import { buildCustomInspectPrompt, openAndSendInspectPrompt } from './menu-send.js'
import type {
  Provider,
  InspectorOptions,
  RuntimeContextEnvelope,
  ScreenshotContext,
  SourceLocation,
  IntentConfig,
} from '@inspecto-dev/types'
import { openFile, fetchIdeInfo } from './http.js'
import { applyIconToggleButtonState, createMenuHeaderDom } from './menu-header.js'
import {
  createAskInput,
  createMenuSection,
  createRuntimeContextUi,
  formatRuntimeContextSummary,
  formatRuntimeErrorCount,
  formatSourceAnchor,
  isFixIntent,
  isFixUiIntent,
  showError,
} from './menu-helpers.js'
import {
  menuClass,
  menuMetaClass,
  loadingSpinnerClass,
  menuItemClass,
  runtimeToggleBadgeClass,
  runtimeToggleClass,
} from './styles.js'

const MENU_WIDTH = 280

const DISPLAY_NAMES: Record<Provider, string> = {
  copilot: 'GitHub Copilot',
  'claude-code': 'Claude Code',
  gemini: 'Gemini',
  codex: 'Codex',
  coco: 'Coco CLI',
  trae: 'Trae AI',
  cursor: 'Cursor',
}

type MenuRuntimeContextDeps = {
  getRuntimeContext?: (location: SourceLocation) => RuntimeContextEnvelope | null
  captureScreenshotContext?: () => Promise<ScreenshotContext | null>
  captureCssContextPrompt?: () => string | null
  canAttachScreenshotContext?: boolean
  targetLabel?: string
}

export function showIntentMenu(
  shadowRoot: ShadowRoot,
  location: SourceLocation,
  clickX: number,
  clickY: number,
  options: InspectorOptions,
  onClose: () => void,
  deps: MenuRuntimeContextDeps = {},
): () => void {
  const maxSnippetLines = options.maxSnippetLines ?? 100
  const includeSnippet = options.includeSnippet ?? false
  let canAttachRuntimeContext =
    options.runtimeContext?.enabled === true && typeof deps.getRuntimeContext === 'function'
  const canAttachScreenshotContext = false
  let runtimeContextPreference: boolean | null = null
  let runtimeContextDefaultMode: 'off' | 'all-on' | 'mixed' = 'off'
  let screenshotContextEnabled = false
  let cssContextEnabled = false
  const canAttachCssContext = typeof deps.captureCssContextPrompt === 'function'

  const menu = document.createElement('div')
  menu.className = menuClass

  const {
    header,
    headerActions,
    openButton,
    runtimeToggleButton,
    runtimeToggleBadge,
    screenshotToggleButton,
    cssToggleButton,
  } = createMenuHeaderDom({
    location,
    ...(deps.targetLabel ? { targetLabel: deps.targetLabel } : {}),
    canAttachRuntimeContext,
    canAttachScreenshotContext,
    canAttachCssContext,
  })

  const syncScreenshotToggleButton = () => {
    screenshotToggleButton.hidden = !canAttachScreenshotContext

    if (!canAttachScreenshotContext) {
      screenshotToggleButton.remove()
      return
    }

    if (!headerActions.contains(screenshotToggleButton)) {
      const referenceNode = headerActions.contains(runtimeToggleButton)
        ? runtimeToggleButton
        : headerActions.contains(openButton)
          ? openButton
          : null
      if (referenceNode) {
        headerActions.insertBefore(screenshotToggleButton, referenceNode)
      } else {
        headerActions.appendChild(screenshotToggleButton)
      }
    }
  }

  const syncCssToggleButton = () => {
    cssToggleButton.hidden = !canAttachCssContext
    if (!canAttachCssContext) {
      cssToggleButton.remove()
      return
    }

    if (!headerActions.contains(cssToggleButton)) {
      const referenceNode = headerActions.contains(runtimeToggleButton)
        ? runtimeToggleButton
        : headerActions.contains(openButton)
          ? openButton
          : null
      if (referenceNode) {
        headerActions.insertBefore(cssToggleButton, referenceNode)
      } else {
        headerActions.appendChild(cssToggleButton)
      }
    }
  }

  const syncRuntimeToggleButton = () => {
    runtimeToggleButton.hidden = !canAttachRuntimeContext
    if (!canAttachRuntimeContext) {
      runtimeToggleButton.remove()
      return
    }

    if (!headerActions.contains(runtimeToggleButton)) {
      const referenceNode = headerActions.contains(openButton) ? openButton : null
      if (referenceNode) {
        headerActions.insertBefore(runtimeToggleButton, referenceNode)
      } else {
        headerActions.appendChild(runtimeToggleButton)
      }
    }
  }

  const applyCssToggleButtonState = () => {
    applyIconToggleButtonState(
      cssToggleButton,
      cssContextEnabled,
      'CSS context enabled',
      'Attach CSS context',
    )
  }

  syncScreenshotToggleButton()
  syncCssToggleButton()
  syncRuntimeToggleButton()
  applyCssToggleButtonState()
  headerActions.appendChild(openButton)
  menu.appendChild(header)

  const runtimeContextSection = createMenuSection()
  runtimeContextSection.hidden = true
  menu.appendChild(runtimeContextSection)

  const askAiSection = createMenuSection()
  const { input, inputWrapper, sendIcon } = createAskInput(options.askPlaceholder)
  askAiSection.appendChild(inputWrapper)
  const loadingEl = document.createElement('div')
  loadingEl.className = loadingSpinnerClass
  askAiSection.appendChild(loadingEl)
  menu.appendChild(askAiSection)

  const actionsSection = createMenuSection()
  menu.appendChild(actionsSection)

  const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
  const safeWidth = viewportWidth > 0 ? viewportWidth : MENU_WIDTH
  menu.style.left = `${Math.min(clickX, Math.max(safeWidth - MENU_WIDTH, 0))}px`
  menu.style.visibility = 'hidden'
  menu.style.display = 'block'

  shadowRoot.appendChild(menu)

  const updatePosition = () => {
    const rect = menu.getBoundingClientRect()
    const viewportHeight = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0,
    )
    const safeHeight = viewportHeight > 0 ? viewportHeight : rect.height + 16
    menu.style.top = `${Math.min(clickY + 8, Math.max(safeHeight - rect.height - 8, 0))}px`
  }
  updatePosition()
  menu.style.visibility = 'visible'

  // Focus input automatically
  setTimeout(() => input.focus(), 0)

  const onDocClick = (e: MouseEvent): void => {
    // Because the menu is inside a Shadow DOM, e.target from the document's perspective
    // is just the <inspecto-overlay> custom element.
    const path = e.composedPath()
    if (path.includes(menu)) return
    cleanup()
  }
  // Use a small timeout so the click that opened the menu doesn't immediately close it
  setTimeout(() => document.addEventListener('click', onDocClick, { capture: true }), 0)

  function cleanup(): void {
    document.removeEventListener('click', onDocClick, { capture: true })
    menu.remove()
    onClose()
  }

  const resolveRuntimeContext = (
    intent?: Pick<IntentConfig, 'id' | 'aiIntent'>,
  ): RuntimeContextEnvelope | null => {
    if (!canAttachRuntimeContext) return null

    const shouldAttach =
      runtimeContextPreference !== null
        ? runtimeContextPreference
        : runtimeContextDefaultMode === 'all-on'
          ? true
          : runtimeContextDefaultMode === 'mixed'
            ? Boolean(intent && isFixIntent(intent))
            : false

    if (!shouldAttach) return null
    return deps.getRuntimeContext?.(location) ?? null
  }

  const applyRuntimeToggleButtonState = (visualState: 'inactive' | 'mixed' | 'active'): void => {
    runtimeToggleButton.dataset.visualState = visualState

    if (visualState === 'active') {
      runtimeToggleButton.style.background = 'var(--inspecto-accent-primary)'
      runtimeToggleButton.style.borderColor = 'transparent'
      runtimeToggleButton.style.color = '#ffffff'
      runtimeToggleButton.style.boxShadow = 'var(--inspecto-shadow-accent)'
      return
    }

    if (visualState === 'mixed') {
      runtimeToggleButton.style.background = 'var(--inspecto-surface-subtle)'
      runtimeToggleButton.style.borderColor = 'var(--inspecto-border-subtle)'
      runtimeToggleButton.style.color = 'var(--inspecto-text-secondary)'
      runtimeToggleButton.style.boxShadow = 'none'
      return
    }

    runtimeToggleButton.style.background = 'var(--inspecto-surface-subtle)'
    runtimeToggleButton.style.borderColor = 'var(--inspecto-border-subtle)'
    runtimeToggleButton.style.color = 'var(--inspecto-text-secondary)'
    runtimeToggleButton.style.boxShadow = 'none'
  }

  const renderRuntimeContextUi = () => {
    runtimeContextSection.replaceChildren()

    if (!canAttachRuntimeContext) {
      runtimeContextSection.hidden = true
      return
    }

    const runtimeContextForUi = deps.getRuntimeContext?.(location) ?? null
    const runtimeErrorCount = runtimeContextForUi?.summary.runtimeErrorCount ?? 0
    const runtimeSummary = runtimeContextForUi
      ? formatRuntimeContextSummary(runtimeContextForUi)
      : ''
    runtimeToggleBadge.textContent = formatRuntimeErrorCount(runtimeErrorCount)

    const ariaPressed =
      runtimeContextPreference !== null
        ? runtimeContextPreference
          ? 'true'
          : 'false'
        : runtimeContextDefaultMode === 'mixed'
          ? 'mixed'
          : runtimeContextDefaultMode === 'all-on'
            ? 'true'
            : 'false'

    runtimeToggleButton.setAttribute('aria-pressed', ariaPressed)
    applyRuntimeToggleButtonState(
      ariaPressed === 'true' ? 'active' : ariaPressed === 'mixed' ? 'mixed' : 'inactive',
    )
    runtimeToggleBadge.hidden = ariaPressed !== 'true' || runtimeErrorCount <= 0
    runtimeToggleButton.title =
      ariaPressed === 'true'
        ? runtimeSummary
          ? `Runtime context enabled • ${runtimeSummary}`
          : 'Runtime context enabled'
        : ariaPressed === 'mixed'
          ? runtimeSummary
            ? `Runtime context defaults to fix actions only • ${runtimeSummary}`
            : 'Runtime context defaults to fix actions only until you choose otherwise'
          : runtimeSummary
            ? `Attach runtime context • ${runtimeSummary}`
            : 'Attach runtime context'

    if (ariaPressed !== 'true') {
      runtimeContextSection.hidden = true
      updatePosition()
      return
    }

    const runtimeContextUi = createRuntimeContextUi(runtimeContextForUi, options)
    runtimeContextSection.hidden = runtimeContextUi === null
    if (runtimeContextUi) {
      runtimeContextSection.appendChild(runtimeContextUi)
    }
    updatePosition()
  }

  runtimeToggleButton.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    const currentEnabled = runtimeToggleButton.getAttribute('aria-pressed') === 'true'
    runtimeContextPreference = !currentEnabled
    renderRuntimeContextUi()
  })

  screenshotToggleButton.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    screenshotContextEnabled = !screenshotContextEnabled
    screenshotToggleButton.setAttribute('aria-pressed', screenshotContextEnabled ? 'true' : 'false')
    screenshotToggleButton.dataset.visualState = screenshotContextEnabled ? 'active' : 'inactive'
  })

  cssToggleButton.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    cssContextEnabled = !cssContextEnabled
    applyCssToggleButtonState()
  })

  const resolveScreenshotContext = async (): Promise<ScreenshotContext | null> => {
    if (!screenshotContextEnabled) return null

    try {
      return (await deps.captureScreenshotContext?.()) ?? null
    } catch {
      return null
    }
  }

  const resolveCssContextPrompt = (intent?: Pick<IntentConfig, 'id'>): string | null => {
    const shouldAttachCssContext = cssContextEnabled || Boolean(intent && isFixUiIntent(intent))
    if (!shouldAttachCssContext) return null
    try {
      return deps.captureCssContextPrompt?.() ?? null
    } catch {
      return null
    }
  }

  // Handle custom ask input
  const submitAsk = async () => {
    if (!input.value.trim()) return
    input.disabled = true
    sendIcon.style.pointerEvents = 'none'

    try {
      const requestRuntimeContext = resolveRuntimeContext()
      const requestScreenshotContext = await resolveScreenshotContext()
      const requestCssContextPrompt = resolveCssContextPrompt()
      const built = await buildCustomInspectPrompt({
        location,
        ask: input.value.trim(),
        includeSnippet,
        maxSnippetLines,
        runtimeContext: requestRuntimeContext,
        screenshotContext: requestScreenshotContext,
        cssContextPrompt: requestCssContextPrompt,
      })
      await openAndSendInspectPrompt({
        location,
        promptText: built.prompt,
        snippetText: built.snippetText,
        runtimeContext: requestRuntimeContext,
        screenshotContext: requestScreenshotContext,
        onSuccess: cleanup,
        onRestore: () => {
          input.disabled = false
          sendIcon.style.pointerEvents = 'auto'
        },
        onError: (message, errorCode) => showError(menu, message, errorCode),
      })
    } catch (err) {
      input.disabled = false
      sendIcon.style.pointerEvents = 'auto'
      showError(menu, (err as Error).message, (err as { errorCode?: string }).errorCode)
    }
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitAsk()
  })
  sendIcon.addEventListener('click', submitAsk)

  // Fetch only IDE info to render the menu immediately
  fetchIdeInfo()
    .then(ideInfo => {
      loadingEl.remove()

      if (
        ideInfo?.runtimeContext?.enabled === true &&
        typeof deps.getRuntimeContext === 'function'
      ) {
        canAttachRuntimeContext = true
        syncRuntimeToggleButton()
      }

      const intents = ideInfo?.prompts || []
      if (!options.askPlaceholder) {
        input.placeholder =
          intents.length > 0
            ? 'Add a custom ask or extra instruction...'
            : 'Ask anything about this component...'
      }
      const aiIntents = intents
      const hasFixIntent = aiIntents.some(isFixIntent)
      const hasNonFixIntent = aiIntents.some(intent => !isFixIntent(intent))
      runtimeContextDefaultMode = hasFixIntent ? (hasNonFixIntent ? 'mixed' : 'all-on') : 'off'
      renderRuntimeContextUi()
      const aiActions = createIntentActionButtons({
        intents,
        location,
        includeSnippet,
        maxSnippetLines,
        resolveRuntimeContext,
        resolveScreenshotContext,
        resolveCssContextPrompt,
        onSend: async payload => {
          await openAndSendInspectPrompt({
            location,
            promptText: payload.prompt,
            snippetText: payload.snippetText,
            runtimeContext: payload.runtimeContext,
            screenshotContext: payload.screenshotContext,
            onSuccess: cleanup,
            onRestore: () => {
              payload.button.disabled = false
              payload.button.textContent = payload.label
            },
            onError: (message, errorCode) => showError(menu, message, errorCode),
          })
        },
        onError: (message, errorCode) => showError(menu, message, errorCode),
      })

      openButton.addEventListener('click', async e => {
        e.stopPropagation()
        openButton.disabled = true
        const opened = await openFile(location)
        if (opened) {
          cleanup()
          return
        }
        openButton.disabled = false
        showError(menu, 'Unable to open file in the IDE.', 'IDE_UNAVAILABLE')
      })

      for (const action of aiActions) {
        actionsSection.appendChild(action)
      }
      updatePosition()
    })
    .catch((err: Error) => {
      loadingEl.remove()
      const isServerDown = err instanceof TypeError
      showError(
        menu,
        isServerDown
          ? 'Cannot connect to inspector server. Is the dev server running?'
          : err.message,
        (err as { errorCode?: string }).errorCode ?? 'UNKNOWN',
      )
      updatePosition()
    })

  return cleanup
}
