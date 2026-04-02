import { buildPrompt, CUSTOM_PROMPT_TEMPLATE } from './intents.js'
import type { Provider, InspectorOptions, SourceLocation, IntentConfig } from '@inspecto-dev/types'
import { fetchSnippet, sendToAi, openFile, fetchIdeInfo } from './http.js'
import {
  menuClass,
  loadingSpinnerClass,
  errorMsgClass,
  menuItemClass,
  menuInputClass,
  menuInputWrapperClass,
  menuInputIconClass,
  shortcutIconClass,
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

export function showIntentMenu(
  shadowRoot: ShadowRoot,
  location: SourceLocation,
  clickX: number,
  clickY: number,
  options: InspectorOptions,
  onClose: () => void,
): () => void {
  const maxSnippetLines = options.maxSnippetLines ?? 100
  const includeSnippet = options.includeSnippet ?? false

  const menu = document.createElement('div')
  menu.className = menuClass

  const { input, inputWrapper, sendIcon } = createAskInput(options.askPlaceholder)
  menu.appendChild(inputWrapper)

  const separator = document.createElement('div')
  separator.style.height = '1px'
  separator.style.background = 'var(--inspecto-menu-border)'
  separator.style.margin = '8px 4px 6px 4px'
  menu.appendChild(separator)

  const loadingEl = document.createElement('div')
  loadingEl.className = loadingSpinnerClass
  menu.appendChild(loadingEl)

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

  // Handle custom ask input
  const handleSend = async (
    promptText: string,
    snippetText: string,
    disable: () => void,
    restore: () => void,
  ) => {
    disable()

    // 1. 必须先 await openFile！
    // 如果不 await，openFile (基于 launch-ide 也就是 node child_process) 和 sendToAi (也就是 vscode:// URI handler)
    // 就会产生非常严重的竞态条件。
    // 如果 `sendToAi` 抢先获得了 focus 转移到了侧边栏，紧接着 `openFile` 才把文件在编辑器里打开，
    // 此时 activeTextEditor 就会被拉回源码文件，导致粘贴失败！
    const opened = await openFile(location)
    if (!opened) {
      restore()
      showError(menu, 'Unable to open file in the IDE.', 'IDE_UNAVAILABLE')
      return
    }

    // 可选：为了保证 IDE 完全缓冲好文件的打开，再微小延迟一点也是好的
    await new Promise(r => setTimeout(r, 100))

    // 2. 发送给 AI (触发 vscode URI handler，执行 focus 和 paste)
    const result = await sendToAi({ location, snippet: snippetText, prompt: promptText })

    if (result.success) {
      // Best-effort browser clipboard fallback. If the extension is not installed,
      // the user still gets the prompt in their clipboard.
      if (result.fallbackPayload?.prompt) {
        try {
          await navigator.clipboard.writeText(result.fallbackPayload.prompt)
        } catch (e) {
          // ignore
        }
      }
      cleanup()
    } else {
      restore()
      showError(menu, result.error ?? 'Unknown error', result.errorCode)
    }
  }

  const submitAsk = async () => {
    if (!input.value.trim()) return
    input.disabled = true
    sendIcon.style.pointerEvents = 'none'

    try {
      let snippetResult = null
      if (includeSnippet) {
        snippetResult = await fetchSnippet(
          location.file,
          location.line,
          location.column,
          maxSnippetLines,
        )
      }

      const prompt = buildPrompt(
        CUSTOM_PROMPT_TEMPLATE(input.value.trim()),
        location,
        snippetResult,
      )
      await handleSend(
        prompt,
        snippetResult?.snippet || '',
        () => {}, // already disabled
        () => {
          input.disabled = false
          sendIcon.style.pointerEvents = 'auto'
        },
      )
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

      const intents = ideInfo?.prompts || []

      // Add intent buttons
      for (const intent of intents) {
        if (intent.isAction && intent.id === 'open-in-editor') {
          const btn = document.createElement('button')
          btn.className = menuItemClass
          const span = document.createElement('span')
          span.textContent = intent.label ?? 'Unknown'
          btn.appendChild(span)

          const shortcutDiv = document.createElement('div')
          shortcutDiv.className = shortcutIconClass
          shortcutDiv.textContent = '↵'
          btn.appendChild(shortcutDiv)

          btn.addEventListener('click', async e => {
            e.stopPropagation()
            btn.disabled = true
            const opened = await openFile(location)
            if (opened) {
              cleanup()
              return
            }
            btn.disabled = false
            showError(menu, 'Unable to open file in the IDE.', 'IDE_UNAVAILABLE')
          })
          menu.appendChild(btn)
          continue
        }

        let fullPromptTemplate = intent.prompt ?? ''
        if (intent.prependPrompt)
          fullPromptTemplate = intent.prependPrompt + '\n\n' + fullPromptTemplate
        if (intent.appendPrompt)
          fullPromptTemplate = fullPromptTemplate + '\n\n' + intent.appendPrompt

        const label = intent.label ?? intent.id ?? 'Unknown'
        const btn = document.createElement('button')
        btn.className = menuItemClass
        btn.textContent = label

        btn.addEventListener('click', async e => {
          e.stopPropagation()
          btn.disabled = true
          btn.textContent = 'Sending...'

          try {
            let snippetResult = null
            if (includeSnippet) {
              snippetResult = await fetchSnippet(
                location.file,
                location.line,
                location.column,
                maxSnippetLines,
              )
            }

            const prompt = buildPrompt(fullPromptTemplate, location, snippetResult)

            await handleSend(
              prompt,
              snippetResult?.snippet || '',
              () => {}, // already disabled
              () => {
                btn.disabled = false
                btn.textContent = label
              },
            )
          } catch (err) {
            btn.disabled = false
            btn.textContent = label
            showError(menu, (err as Error).message, (err as { errorCode?: string }).errorCode)
          }
        })

        menu.appendChild(btn)
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

function createAskInput(placeholder?: string) {
  const inputWrapper = document.createElement('div')
  inputWrapper.className = menuInputWrapperClass

  const input = document.createElement('input')
  input.className = menuInputClass
  input.type = 'text'
  input.placeholder = placeholder ?? 'Describe how to change this component...'

  const sendIcon = document.createElement('div')
  sendIcon.className = menuInputIconClass
  sendIcon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`
  sendIcon.style.cursor = 'pointer'

  inputWrapper.appendChild(input)
  inputWrapper.appendChild(sendIcon)

  return { input, inputWrapper, sendIcon }
}

function showError(menu: HTMLElement, message: string, errorCode?: string): void {
  menu.querySelector(`.${errorMsgClass}`)?.remove()

  const errEl = document.createElement('div')
  errEl.className = errorMsgClass
  errEl.textContent =
    errorCode === 'FILE_NOT_FOUND'
      ? 'Source file not found. Is the server running?'
      : `Error: ${message}`
  menu.appendChild(errEl)
}
