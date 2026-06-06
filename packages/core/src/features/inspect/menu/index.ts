import { createIntentActionButtons } from './actions.js'
import { openAndSendInspectPrompt } from './send.js'
import type {
  Provider,
  InspectorOptions,
  RuntimeContextEnvelope,
  SourceLocation,
  AiIntentConfig,
} from '@inspecto-dev/types'
import { openFileWithDiagnostics, fetchIdeInfo } from '../../../transport/http-client.js'
import { applyIconToggleButtonState, createMenuHeaderDom } from './header.js'
import { resolveMenuPosition } from './position.js'
import {
  createRuntimeContextUi,
  formatRuntimeContextSummary,
  formatRuntimeErrorCount,
  isFixIntent,
  isFixUiIntent,
  showError,
} from './helpers.js'
import { t } from '../../../shared/i18n.js'
import { isAiIntentConfig } from '@inspecto-dev/types'
import { attachMenuClickAway } from './click-away.js'
import { attachCustomAskSubmit } from './custom-ask.js'
import { createIntentMenuDom } from './dom.js'
import { attachMenuFocusLifecycle } from './focus.js'
import {
  applyRuntimeToggleButtonState,
  getRuntimeToggleAriaPressed,
  getRuntimeToggleVisualState,
  type RuntimeContextDefaultMode,
} from './runtime-toggle.js'

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
  let runtimeContextDefaultMode: RuntimeContextDefaultMode = 'off'
  let cssContextEnabled = false
  const canAttachCssContext = typeof deps.captureCssContextPrompt === 'function'

  const {
    menu,
    runtimeContextSection,
    askAiSection,
    actionsSection,
    input,
    sendIcon,
    loadingElement,
  } = createIntentMenuDom(options.askPlaceholder)

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

  menu.appendChild(runtimeContextSection)

  menu.appendChild(askAiSection)

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

  const teardownFocusLifecycle = attachMenuFocusLifecycle(menu, shadowRoot, input)
  const teardownClickAway = attachMenuClickAway(menu, cleanup)

  function cleanup(): void {
    teardownClickAway()
    teardownFocusLifecycle()
    menu.remove()
    onClose()
  }

  const resolveRuntimeContext = (
    intent?: Pick<AiIntentConfig, 'id' | 'aiIntent'>,
  ): RuntimeContextEnvelope | null => {
    if (!canAttachRuntimeContext) return null

    const ariaPressed = getRuntimeToggleAriaPressed(
      runtimeContextPreference,
      runtimeContextDefaultMode,
    )
    const shouldAttach =
      ariaPressed === 'true' || (ariaPressed === 'mixed' && Boolean(intent && isFixIntent(intent)))

    if (!shouldAttach) return null
    return deps.getRuntimeContext?.(location) ?? null
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

    const ariaPressed = getRuntimeToggleAriaPressed(
      runtimeContextPreference,
      runtimeContextDefaultMode,
    )

    runtimeToggleButton.setAttribute('aria-pressed', ariaPressed)
    applyRuntimeToggleButtonState(runtimeToggleButton, getRuntimeToggleVisualState(ariaPressed))
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

  const resolveCssContextPrompt = (intent?: Pick<AiIntentConfig, 'id'>): string | null => {
    const shouldAttachCssContext = cssContextEnabled || Boolean(intent && isFixUiIntent(intent))
    if (!shouldAttachCssContext) return null
    try {
      return deps.captureCssContextPrompt?.() ?? null
    } catch {
      return null
    }
  }

  attachCustomAskSubmit({
    input,
    sendIcon,
    location,
    includeSnippet,
    maxSnippetLines,
    ...(deps.targetLabel ? { targetLabel: deps.targetLabel } : {}),
    resolveRuntimeContext: () => resolveRuntimeContext(),
    resolveCssContextPrompt: () => resolveCssContextPrompt(),
    onSuccess: cleanup,
    onError: (message, errorCode) => showError(menu, message, errorCode),
  })

  // Fetch only IDE info to render the menu immediately
  fetchIdeInfo()
    .then(ideInfo => {
      loadingElement.remove()

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
      const aiIntents = intents.filter(isAiIntentConfig)
      const hasFixIntent = aiIntents.some(isFixIntent)
      const hasNonFixIntent = aiIntents.some(intent => !isFixIntent(intent))
      runtimeContextDefaultMode = hasFixIntent ? (hasNonFixIntent ? 'mixed' : 'all-on') : 'off'
      renderRuntimeContextUi()
      const aiActions = createIntentActionButtons({
        intents: aiIntents,
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
      loadingElement.remove()
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
