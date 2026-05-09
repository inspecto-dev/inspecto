import { createIntentActionButtons } from './menu-actions.js'
import { buildCustomInspectPrompt, openAndSendInspectPrompt } from './menu-send.js'
import type {
  Provider,
  InspectorOptions,
  RuntimeContextEnvelope,
  SourceLocation,
  IntentConfig,
} from '@inspecto-dev/types'
import { openFileWithDiagnostics, fetchIdeInfo } from './http.js'
import { applyIconToggleButtonState, createMenuHeaderDom } from './menu-header.js'
import { resolveMenuPosition } from './menu-position.js'
import {
  createAskInput,
  createMenuSection,
  createRuntimeContextUi,
  formatRuntimeContextSummary,
  formatRuntimeErrorCount,
  isFixIntent,
  isFixUiIntent,
  showError,
} from './menu-helpers.js'
import { t } from './i18n.js'
import { menuClass, loadingSpinnerClass } from './styles.js'

const _DISPLAY_NAMES: Record<Provider, string> = {
  copilot: 'GitHub Copilot',
  'claude-code': 'Claude Code',
  gemini: 'Gemini',
  codex: 'Codex',
  coco: 'Coco CLI',
  trae: 'Trae AI',
  cursor: 'Cursor',
  codebuddy: 'CodeBuddy',
}

type MenuRuntimeContextDeps = {
  getRuntimeContext?: (location: SourceLocation) => RuntimeContextEnvelope | null
  captureCssContextPrompt?: () => string | null
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
  let runtimeContextPreference: boolean | null = null
  let runtimeContextDefaultMode: 'off' | 'all-on' | 'mixed' = 'off'
  let cssContextEnabled = false
  const canAttachCssContext = typeof deps.captureCssContextPrompt === 'function'

  const menu = document.createElement('div')
  menu.className = menuClass
  menu.style.width = '304px'
  menu.style.maxWidth = 'calc(100vw - 16px)'
  menu.style.boxSizing = 'border-box'
  menu.style.pointerEvents = 'auto'

  const {
    header,
    headerActions,
    openButton,
    runtimeToggleButton,
    runtimeToggleBadge,
    cssToggleButton,
  } = createMenuHeaderDom({
    location,
    ...(deps.targetLabel ? { targetLabel: deps.targetLabel } : {}),
    canAttachRuntimeContext,
    canAttachCssContext,
  })

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
      t('menu.cssEnabled'),
      t('menu.attachCss'),
    )
  }

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

  menu.style.left = `${clickX}px`
  menu.style.visibility = 'hidden'
  menu.style.display = 'block'

  shadowRoot.appendChild(menu)

  const updatePosition = () => {
    const rect = menu.getBoundingClientRect()
    const { left: nextLeft, top: nextTop } = resolveMenuPosition({
      clickX,
      clickY,
      menuRect: { width: rect.width, height: rect.height },
      viewport: {
        width: document.documentElement.clientWidth || window.innerWidth || 0,
        height: document.documentElement.clientHeight || window.innerHeight || 0,
      },
    })

    menu.style.left = `${nextLeft}px`
    menu.style.top = `${nextTop}px`
  }
  updatePosition()
  menu.style.visibility = 'visible'

  // When the menu input steals focus from a page-controlled input, some apps immediately
  // steal it back in their `onBlur` handlers (often implemented via document-level
  // focusin/focusout delegation). We suppress those delegated focus events while focus
  // is moving into the menu so the page doesn't re-focus itself.
  const teardownDocFocusGuards = (): void => {
    document.removeEventListener('focusin', onDocFocusIn, true)
    document.removeEventListener('focusout', onDocFocusOut, true)
  }

  const onDocFocusIn = (e: FocusEvent): void => {
    if (!menu.isConnected) {
      teardownDocFocusGuards()
      return
    }
    const path = e.composedPath?.() ?? []
    if (path.includes(menu)) {
      e.stopImmediatePropagation()
    }
  }

  const onDocFocusOut = (e: FocusEvent): void => {
    if (!menu.isConnected) {
      teardownDocFocusGuards()
      return
    }
    const related = (e as FocusEvent).relatedTarget as Node | null
    if (!related) return
    // In Shadow DOM, relatedTarget can be retargeted to the shadow host.
    if (related === shadowRoot.host) {
      e.stopImmediatePropagation()
      return
    }

    if (related instanceof Node && menu.contains(related)) {
      e.stopImmediatePropagation()
    }
  }

  document.addEventListener('focusin', onDocFocusIn, true)
  document.addEventListener('focusout', onDocFocusOut, true)

  // Focus input automatically.
  // NOTE: Do this synchronously to keep it inside the user gesture that opened the menu.
  // Some apps aggressively restore focus to their own inputs on the next tick; the
  // synchronous focus + a couple of follow-up attempts makes the menu reliably typeable.
  const focusAskInput = (): void => {
    try {
      input.focus({ preventScroll: true })
    } catch {
      // Older DOM implementations may not support preventScroll.
      input.focus()
    }
  }

  const isAskInputFocused = (): boolean => {
    // In Shadow DOM, document.activeElement is usually the host element.
    // ShadowRoot.activeElement is the reliable check in browsers, but some test DOM
    // implementations may throw when the host is torn down.
    try {
      return shadowRoot.activeElement === input
    } catch {
      return false
    }
  }

  focusAskInput()
  const rafId = requestAnimationFrame(() => {
    if (!menu.isConnected) return
    if (!isAskInputFocused()) focusAskInput()
  })
  const focusTimeoutId = setTimeout(() => {
    if (!menu.isConnected) return
    if (!isAskInputFocused()) focusAskInput()
  }, 50)

  const onDocClick = (e: MouseEvent): void => {
    // Determine if the click target is within a dialog or modal
    const eventTarget = e.target as HTMLElement | null
    if (eventTarget) {
      // Allow clicks on DOM elements that look like modals or popups to not close the menu
      // E.g., clicking on elements with roles like dialog, menu, tooltip, or inside a portaled floating element
      if (
        eventTarget.closest(
          '[role="dialog"], [role="menu"], [role="tooltip"], [role="presentation"], [role="listbox"], [data-radix-popper-content-wrapper], [data-radix-focus-guard]',
        )
      ) {
        return
      }
    }

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
    teardownDocFocusGuards()
    cancelAnimationFrame(rafId)
    clearTimeout(focusTimeoutId)
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
          ? `${t('menu.runtimeEnabled')} • ${runtimeSummary}`
          : t('menu.runtimeEnabled')
        : ariaPressed === 'mixed'
          ? runtimeSummary
            ? `${t('menu.runtimeFixOnly')} • ${runtimeSummary}`
            : t('menu.runtimeFixOnly')
          : runtimeSummary
            ? `${t('menu.attachRuntime')} • ${runtimeSummary}`
            : t('menu.attachRuntime')

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

  cssToggleButton.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    cssContextEnabled = !cssContextEnabled
    applyCssToggleButtonState()
  })

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
      const requestCssContextPrompt = resolveCssContextPrompt()
      const built = await buildCustomInspectPrompt({
        location,
        ask: input.value.trim(),
        ...(deps.targetLabel ? { targetLabel: deps.targetLabel } : {}),
        includeSnippet,
        maxSnippetLines,
        runtimeContext: requestRuntimeContext,
        cssContextPrompt: requestCssContextPrompt,
      })
      await openAndSendInspectPrompt({
        location,
        promptText: built.prompt,
        snippetText: built.snippetText,
        runtimeContext: requestRuntimeContext,
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

      if (!ideInfo) {
        input.placeholder = t('menu.ask.placeholder.setup')
        showError(menu, 'Client config unavailable', 'CLIENT_CONFIG_UNAVAILABLE')
        updatePosition()
        return
      }

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
            ? t('menu.ask.placeholder.default')
            : t('menu.ask.placeholder.fallback')
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
        resolveCssContextPrompt,
        onSend: async payload => {
          await openAndSendInspectPrompt({
            location,
            promptText: payload.prompt,
            snippetText: payload.snippetText,
            runtimeContext: payload.runtimeContext,
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
        const openResult = await openFileWithDiagnostics(location)
        if (openResult.success) {
          cleanup()
          return
        }
        openButton.disabled = false
        showError(menu, t('menu.error.openIde'), openResult.errorCode ?? 'IDE_UNAVAILABLE')
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
