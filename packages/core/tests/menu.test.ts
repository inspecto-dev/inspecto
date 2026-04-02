import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { showIntentMenu } from '../src/menu.js'
import { menuClass, loadingSpinnerClass, menuInputClass, errorMsgClass } from '../src/styles.js'
import * as http from '../src/http.js'

// Mock http module
vi.mock('../src/http.js', () => ({
  fetchSnippet: vi.fn(),
  sendToAi: vi.fn(),
  openFile: vi.fn(),
  fetchIdeInfo: vi.fn(),
}))

describe('Intent Menu DOM Interaction', () => {
  let shadowRoot: ShadowRoot
  let host: HTMLElement
  let onCloseMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetAllMocks()

    // Default happy path mock for fetchIdeInfo
    vi.mocked(http.fetchIdeInfo).mockResolvedValue({
      ide: 'vscode',
      prompts: [
        { id: 'explain', label: 'Explain Code', prompt: 'Explain this code', isAction: false },
        { id: 'open-in-editor', label: 'Open in Editor', isAction: true },
      ],
    })

    host = document.createElement('div')
    document.body.appendChild(host)
    shadowRoot = host.attachShadow({ mode: 'open' })
    onCloseMock = vi.fn()

    vi.mocked(http.openFile).mockResolvedValue(true)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('should render loading state initially', () => {
    // Override mock to not resolve immediately
    vi.mocked(http.fetchIdeInfo).mockReturnValue(new Promise(() => {}))

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { askPlaceholder: 'Test placeholder' },
      onCloseMock,
    )

    const menu = shadowRoot.querySelector(`.${menuClass}`) as HTMLElement
    expect(menu).not.toBeNull()

    const input = shadowRoot.querySelector(`.${menuInputClass}`) as HTMLInputElement
    expect(input.placeholder).toBe('Test placeholder')

    const loader = shadowRoot.querySelector(`.${loadingSpinnerClass}`)
    expect(loader).not.toBeNull()
  })

  it('should render intents when ide info is fetched', async () => {
    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
    )

    // Wait for microtasks to complete (fetchIdeInfo mock to resolve)
    await new Promise(resolve => setTimeout(resolve, 0))

    const menu = shadowRoot.querySelector(`.${menuClass}`) as HTMLElement

    // Loading should be gone
    const loader = shadowRoot.querySelector(`.${loadingSpinnerClass}`)
    expect(loader).toBeNull()

    // Buttons should be rendered
    const buttons = shadowRoot.querySelectorAll('button')
    expect(buttons.length).toBe(2)
    expect(buttons[0].textContent).toContain('Explain Code')
    expect(buttons[1].textContent).toContain('Open in Editor')
  })

  it('should handle open in editor action', async () => {
    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const buttons = shadowRoot.querySelectorAll('button')
    const openBtn = Array.from(buttons).find(b => b.textContent?.includes('Open in Editor'))

    openBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(http.openFile).toHaveBeenCalledWith({ file: '/src/App.tsx', line: 10, column: 5 })
    expect(onCloseMock).toHaveBeenCalled()
  })

  it('shows error when open in editor fails', async () => {
    vi.mocked(http.openFile).mockResolvedValueOnce(false)

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const buttons = shadowRoot.querySelectorAll('button')
    const openBtn = Array.from(buttons).find(b => b.textContent?.includes('Open in Editor'))

    openBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await new Promise(resolve => setTimeout(resolve, 0))

    const errorEl = shadowRoot.querySelector(`.${errorMsgClass}`)
    expect(errorEl?.textContent).toContain('Unable to open file in the IDE.')
    expect(onCloseMock).not.toHaveBeenCalled()
  })
})
