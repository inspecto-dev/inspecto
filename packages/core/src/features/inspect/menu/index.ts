import { openAndSendInspectPrompt } from './send.js'
import type {
  Provider,
  InspectorOptions,
  RuntimeContextEnvelope,
  SourceLocation,
  AiIntentConfig,
} from '@inspecto-dev/types'
import { fetchIdeInfo } from '../../../transport/http-client.js'
import { createMenuHeaderDom } from './header.js'
import { syncCssToggleButton, syncRuntimeToggleButton } from './header-actions.js'
import { resolveMenuPosition } from './position.js'
import { showError } from './helpers.js'
import { t } from '../../../shared/i18n.js'
import { attachMenuClickAway } from './click-away.js'
import { attachCustomAskSubmit } from './custom-ask.js'
import { createIntentMenuDom } from './dom.js'
import { attachMenuFocusLifecycle } from './focus.js'
import { createInspectMenuRuntimeContextController } from './runtime-context-controller.js'
import {
  createInspectMenuCssContextToggle,
  resolveInspectMenuCssContextPrompt,
} from './css-context-toggle.js'
import { renderInspectMenuIdeInfo } from './ide-info-renderer.js'

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
  const canAttachRuntimeContext =
    options.runtimeContext?.enabled === true && typeof deps.getRuntimeContext === 'function'
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

  syncCssToggleButton({
    headerActions,
    cssToggleButton,
    runtimeToggleButton,
    openButton,
    canAttachCssContext,
  })
  syncRuntimeToggleButton({
    headerActions,
    runtimeToggleButton,
    openButton,
    canAttachRuntimeContext,
  })
  const cssContextToggle = createInspectMenuCssContextToggle(cssToggleButton)
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

  const runtimeContextController = createInspectMenuRuntimeContextController({
    runtimeContextSection,
    runtimeToggleButton,
    runtimeToggleBadge,
    canAttachRuntimeContext,
    runtimeContextDefaultMode: 'off',
    location,
    ...(deps.getRuntimeContext ? { getRuntimeContext: deps.getRuntimeContext } : {}),
    options,
    updatePosition,
  })

  const teardownFocusLifecycle = attachMenuFocusLifecycle(menu, shadowRoot, input)
  const teardownClickAway = attachMenuClickAway(menu, cleanup)

  function cleanup(): void {
    teardownClickAway()
    teardownFocusLifecycle()
    menu.remove()
    onClose()
  }

  const resolveCssContextPrompt = (intent?: Pick<AiIntentConfig, 'id'>): string | null => {
    return resolveInspectMenuCssContextPrompt({
      cssContextEnabled: cssContextToggle.isEnabled(),
      ...(deps.captureCssContextPrompt
        ? { captureCssContextPrompt: deps.captureCssContextPrompt }
        : {}),
      ...(intent ? { intent } : {}),
    })
  }

  attachCustomAskSubmit({
    input,
    sendIcon,
    location,
    includeSnippet,
    maxSnippetLines,
    ...(deps.targetLabel ? { targetLabel: deps.targetLabel } : {}),
    resolveRuntimeContext: () => runtimeContextController.resolve(),
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

      renderInspectMenuIdeInfo({
        ideInfo,
        input,
        loadingElement,
        actionsSection,
        headerActions,
        runtimeToggleButton,
        openButton,
        location,
        includeSnippet,
        maxSnippetLines,
        options,
        hasRuntimeContextProvider: typeof deps.getRuntimeContext === 'function',
        runtimeContextController,
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
        onCleanup: cleanup,
        updatePosition,
      })
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
