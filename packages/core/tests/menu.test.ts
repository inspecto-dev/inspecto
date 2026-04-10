import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountInspector, unmountInspector } from '../src/index.js'
import { showIntentMenu } from '../src/menu.js'
import {
  menuClass,
  loadingSpinnerClass,
  menuInputClass,
  menuInputIconClass,
  errorMsgClass,
  menuContextSummaryClass,
  runtimeToggleBadgeClass,
} from '../src/styles.js'
import * as http from '../src/http.js'
import * as promptModule from '../src/fix-bug-prompt.js'
import type { RuntimeContextEnvelope } from '@inspecto-dev/types'
import {
  attachRuntimeContextCapture,
  createRuntimeContextCollector,
  createRuntimeContextEnvelope,
  selectRuntimeEvidence,
} from '../src/runtime-context.js'

// Mock http module
vi.mock('../src/http.js', () => ({
  fetchSnippet: vi.fn(),
  sendToAi: vi.fn(),
  openFile: vi.fn(),
  fetchIdeInfo: vi.fn(),
}))

vi.mock('../src/fix-bug-prompt.js', () => ({
  buildPromptForIntent: vi.fn(
    (
      intent: { id?: string },
      _location: unknown,
      _snippet: unknown,
      runtimeContext?: RuntimeContextEnvelope | null,
    ) => `${intent.id ?? 'custom'} PROMPT ${runtimeContext?.records.length ?? 0}`,
  ),
  appendRuntimeContextToPrompt: vi.fn((prompt: string, records: unknown[]) =>
    records.length ? `${prompt}\n\nRUNTIME ${records.length}` : prompt,
  ),
  appendScreenshotContextToPrompt: vi.fn(
    (prompt: string, screenshotContext?: { mimeType?: string } | null) =>
      screenshotContext?.mimeType
        ? `${prompt}\n\nSCREENSHOT ${screenshotContext.mimeType}`
        : prompt,
  ),
  selectFixBugEvidence: vi.fn((records: unknown[]) => records),
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
        { id: 'explain', label: 'Explain Code', aiIntent: 'ask', prompt: 'Explain this code' },
      ],
    })

    host = document.createElement('div')
    document.body.appendChild(host)
    shadowRoot = host.attachShadow({ mode: 'open' })
    onCloseMock = vi.fn()

    vi.mocked(http.openFile).mockResolvedValue(true)
    vi.mocked(http.sendToAi).mockResolvedValue({ success: true })
    vi.mocked(promptModule.buildPromptForIntent).mockImplementation(
      (
        intent: { id?: string },
        _location: unknown,
        _snippet: unknown,
        runtimeContext?: RuntimeContextEnvelope | null,
      ) => `${intent.id ?? 'custom'} PROMPT ${runtimeContext?.records.length ?? 0}`,
    )
    vi.mocked(promptModule.appendRuntimeContextToPrompt).mockImplementation(
      (prompt: string, records: unknown[]) =>
        records.length ? `${prompt}\n\nRUNTIME ${records.length}` : prompt,
    )
    vi.mocked(promptModule.appendScreenshotContextToPrompt).mockImplementation(
      (prompt: string, screenshotContext?: { mimeType?: string } | null) =>
        screenshotContext?.mimeType
          ? `${prompt}\n\nSCREENSHOT ${screenshotContext.mimeType}`
          : prompt,
    )
  })

  afterEach(() => {
    unmountInspector()
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

    expect(menu.textContent).toContain('App.tsx')
    expect(menu.textContent).toContain('App.tsx:10:5')
    expect(menu.textContent).not.toContain('Quick actions')
    expect(menu.textContent).not.toContain('Ask AI')

    // Buttons should be rendered
    const buttons = shadowRoot.querySelectorAll('button')
    expect(buttons.length).toBe(2)
    expect(buttons[0].getAttribute('aria-label')).toContain('Open in Editor')
    expect(buttons[1].textContent).toContain('Explain Code')
  })

  it('uses a supplemental custom-ask placeholder when preset actions are available', async () => {
    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const input = shadowRoot.querySelector(`.${menuInputClass}`) as HTMLInputElement
    expect(input.placeholder).toBe('Add a custom ask or extra instruction...')
    expect(input.getAttribute('aria-label')).toBe('Custom ask')
  })

  it('uses a primary ask placeholder when no preset actions are available', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [],
    })

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const input = shadowRoot.querySelector(`.${menuInputClass}`) as HTMLInputElement
    expect(input.placeholder).toBe('Ask anything about this component...')
  })

  it('styles the header open icon consistently with annotate composer actions', async () => {
    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const openButton = shadowRoot.querySelector(
      'button[data-role="open-icon"]',
    ) as HTMLButtonElement

    expect(openButton.style.width).toBe('28px')
    expect(openButton.style.height).toBe('28px')
    expect(openButton.style.background).toBe('var(--inspecto-surface-subtle)')
    expect(openButton.style.color).toBe('var(--inspecto-text-secondary)')
    expect(openButton.style.borderWidth).toBe('1px')
    expect(openButton.style.borderStyle).toBe('solid')
    expect(openButton.style.borderColor).toBe('var(--inspecto-border-subtle)')
    expect(openButton.style.transition).toContain('box-shadow 0.15s ease')
  })

  it('keeps the inspect header actions aligned after hiding screenshot entry points', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [{ id: 'fix-bug', label: 'Fix Bug', aiIntent: 'fix', prompt: 'Fix this' }],
      screenshotContext: { enabled: true },
    } as any)

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { runtimeContext: { enabled: true }, screenshotContext: { enabled: true } } as any,
      onCloseMock,
      {
        getRuntimeContext: vi.fn(() => null),
        captureScreenshotContext: vi.fn().mockResolvedValue(null),
      },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const labels = Array.from(shadowRoot.querySelectorAll(`.${menuClass} button`)).map(
      button => button.getAttribute('aria-label') ?? button.textContent ?? '',
    )

    expect(labels.slice(0, 3)).toEqual(['Attach runtime context', 'Open in Editor', 'Fix Bug'])
    expect(labels).not.toContain('Attach screenshot context')
  })

  it('keeps screenshot context hidden in inspect even when the server advertises screenshot support', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [{ id: 'fix-bug', label: 'Fix Bug', aiIntent: 'fix', prompt: 'Fix this' }],
      screenshotContext: { enabled: true },
    } as any)

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { runtimeContext: { enabled: true }, screenshotContext: { enabled: true } } as any,
      onCloseMock,
      {
        getRuntimeContext: vi.fn(() => null),
        captureScreenshotContext: vi.fn().mockResolvedValue(null),
      },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(shadowRoot.querySelector('[data-role="screenshot-context-toggle"]')).toBeNull()
  })

  it('keeps the runtime bug icon state intact without exposing screenshot controls', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [{ id: 'fix-bug', label: 'Fix Bug', aiIntent: 'fix', prompt: 'Fix this' }],
      screenshotContext: { enabled: true },
    } as any)

    const runtimeContext: RuntimeContextEnvelope = {
      summary: {
        runtimeErrorCount: 2,
        failedRequestCount: 0,
        includedRecordIds: ['err-1'],
      },
      records: [
        {
          id: 'err-1',
          kind: 'runtime-error',
          timestamp: 100,
          message: 'boom',
          occurrenceCount: 2,
          relevanceScore: 0.9,
          relevanceLevel: 'high',
          relevanceReasons: ['stack references target file'],
        },
      ],
    }

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { runtimeContext: { enabled: true }, screenshotContext: { enabled: true } } as any,
      onCloseMock,
      {
        getRuntimeContext: vi.fn(() => runtimeContext),
        captureScreenshotContext: vi.fn().mockResolvedValue(null),
      },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const runtimeToggle = shadowRoot.querySelector(
      'button[aria-label="Attach runtime context"]',
    ) as HTMLButtonElement
    const badge = runtimeToggle.querySelector(`.${runtimeToggleBadgeClass}`) as HTMLElement

    expect(shadowRoot.querySelector('button[aria-label="Attach screenshot context"]')).toBeNull()
    expect(runtimeToggle.getAttribute('aria-pressed')).toBe('true')
    expect(runtimeToggle.getAttribute('data-visual-state')).toBe('active')
    expect(badge.hidden).toBe(false)
  })

  it('preserves the mixed runtime bug icon state without screenshot controls', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [
        { id: 'fix-bug', label: 'Fix Bug', aiIntent: 'fix', prompt: 'Fix this' },
        { id: 'explain', label: 'Explain Code', aiIntent: 'ask', prompt: 'Explain this' },
      ],
      screenshotContext: { enabled: true },
    } as any)

    const runtimeContext: RuntimeContextEnvelope = {
      summary: {
        runtimeErrorCount: 1,
        failedRequestCount: 0,
        includedRecordIds: ['err-1'],
      },
      records: [
        {
          id: 'err-1',
          kind: 'runtime-error',
          timestamp: 100,
          message: 'boom',
          occurrenceCount: 1,
          relevanceScore: 0.9,
          relevanceLevel: 'high',
          relevanceReasons: ['stack references target file'],
        },
      ],
    }

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { runtimeContext: { enabled: true }, screenshotContext: { enabled: true } } as any,
      onCloseMock,
      {
        getRuntimeContext: vi.fn(() => runtimeContext),
        captureScreenshotContext: vi.fn().mockResolvedValue(null),
      },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const runtimeToggle = shadowRoot.querySelector(
      'button[aria-label="Attach runtime context"]',
    ) as HTMLButtonElement
    const badge = runtimeToggle.querySelector(`.${runtimeToggleBadgeClass}`) as HTMLElement

    expect(shadowRoot.querySelector('button[aria-label="Attach screenshot context"]')).toBeNull()
    expect(runtimeToggle.getAttribute('aria-pressed')).toBe('mixed')
    expect(runtimeToggle.getAttribute('data-visual-state')).toBe('mixed')
    expect(badge.hidden).toBe(true)
  })

  it('does not expose the screenshot toggle after server config finishes loading', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [{ id: 'fix-bug', label: 'Fix Bug', aiIntent: 'fix', prompt: 'Fix this' }],
      screenshotContext: { enabled: true },
    } as any)

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
      { captureScreenshotContext: vi.fn().mockResolvedValue(null) },
    )

    expect(shadowRoot.querySelector('[data-role="screenshot-context-toggle"]')).toBeNull()

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(shadowRoot.querySelector('[data-role="screenshot-context-toggle"]')).toBeNull()
  })

  it('shows the runtime bug icon once server config finishes loading even if menu options were not preloaded', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [{ id: 'fix-bug', label: 'Fix Bug', aiIntent: 'fix', prompt: 'Fix this' }],
      runtimeContext: { enabled: true, preview: true },
    } as any)

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
      { getRuntimeContext: vi.fn(() => null) },
    )

    expect(shadowRoot.querySelector('button[aria-label="Attach runtime context"]')).toBeNull()

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(shadowRoot.querySelector('button[aria-label="Attach runtime context"]')).not.toBeNull()
  })

  it('does not attach screenshot context in inspect sends because the screenshot entry is hidden', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [{ id: 'fix-bug', label: 'Fix Bug', aiIntent: 'fix', prompt: 'Fix this' }],
      screenshotContext: { enabled: true },
    } as any)

    const captureScreenshotContext = vi.fn().mockResolvedValue({
      enabled: true,
      capturedAt: '2026-04-04T12:00:00.000Z',
      mimeType: 'image/png',
      imageDataUrl: 'data:image/png;base64,AAA=',
    })

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { runtimeContext: { enabled: true }, screenshotContext: { enabled: true } } as any,
      onCloseMock,
      { captureScreenshotContext },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const fixBugBtn = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Fix Bug',
    )
    fixBugBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 130))

    expect(shadowRoot.querySelector('[data-role="screenshot-context-toggle"]')).toBeNull()
    expect(captureScreenshotContext).not.toHaveBeenCalled()
    expect(vi.mocked(http.sendToAi)).toHaveBeenCalledWith(
      expect.not.objectContaining({ screenshotContext: expect.anything() }),
    )
  })

  it('normalizes the CSS header icon size to match sibling header actions', async () => {
    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
      {
        captureCssContextPrompt: vi.fn(() => 'Relevant CSS context'),
      },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const cssToggleIcon = shadowRoot.querySelector(
      'button[aria-label="Attach CSS context"] svg',
    ) as SVGElement | null

    expect(cssToggleIcon).not.toBeNull()
    expect(cssToggleIcon?.style.width).toBe('18px')
    expect(cssToggleIcon?.style.height).toBe('18px')
  })

  it('applies the same active CSS toggle feedback as the annotate composer', async () => {
    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
      {
        captureCssContextPrompt: vi.fn(() => 'Relevant CSS context'),
      },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const cssToggle = shadowRoot.querySelector(
      'button[aria-label="Attach CSS context"]',
    ) as HTMLButtonElement | null

    expect(cssToggle).not.toBeNull()
    expect(cssToggle?.getAttribute('aria-pressed')).toBe('false')
    expect(cssToggle?.dataset.visualState).toBe('inactive')
    expect(cssToggle?.style.background).toBe('var(--inspecto-surface-subtle)')
    expect(cssToggle?.style.boxShadow).toBe('none')

    cssToggle?.click()

    expect(cssToggle?.getAttribute('aria-pressed')).toBe('true')
    expect(cssToggle?.dataset.visualState).toBe('active')
    expect(cssToggle?.title).toBe('CSS context enabled')
    expect(cssToggle?.style.background).not.toBe('var(--inspecto-surface-subtle)')
    expect(cssToggle?.style.boxShadow).toBe('var(--inspecto-shadow-accent)')
  })

  it('keeps the header open-in-editor action visible even when only AI prompts are configured', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [
        { id: 'explain', label: 'Explain Code', aiIntent: 'ask', prompt: 'Explain this code' },
      ],
    })

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const openButton = shadowRoot.querySelector(
      'button[aria-label="Open in Editor"]',
    ) as HTMLButtonElement | null
    expect(openButton).not.toBeNull()
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
    const openBtn = Array.from(buttons).find(b => b.getAttribute('aria-label') === 'Open in Editor')

    openBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(http.openFile).toHaveBeenCalledWith({ file: '/src/App.tsx', line: 10, column: 5 })
    expect(onCloseMock).toHaveBeenCalled()
  })

  it('should handle open in editor clicks without any prompts configured', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [],
    })

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
    const openBtn = Array.from(buttons).find(b => b.getAttribute('aria-label') === 'Open in Editor')

    openBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(http.openFile).toHaveBeenCalledWith({ file: '/src/App.tsx', line: 10, column: 5 })
    expect(onCloseMock).toHaveBeenCalled()
  })

  it('routes built-in fix-bug through the evidence-guided builder and leaves other intents on buildPrompt', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [
        { id: 'fix-bug', label: 'Fix Bug', aiIntent: 'fix', prompt: 'legacy fix-bug template' },
        { id: 'explain', label: 'Explain Code', aiIntent: 'ask', prompt: 'Explain this code' },
      ],
    })

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const buttons = Array.from(shadowRoot.querySelectorAll('button'))
    const fixBugBtn = buttons.find(button => button.textContent === 'Fix Bug')
    const explainBtn = buttons.find(button => button.textContent === 'Explain Code')

    expect(fixBugBtn).toBeTruthy()
    expect(explainBtn).toBeTruthy()

    fixBugBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 130))

    expect(vi.mocked(promptModule.buildPromptForIntent)).toHaveBeenCalledWith(
      { id: 'fix-bug', label: 'Fix Bug', aiIntent: 'fix', prompt: 'legacy fix-bug template' },
      { file: '/src/App.tsx', line: 10, column: 5 },
      null,
      null,
    )
    expect(vi.mocked(http.sendToAi)).toHaveBeenCalledTimes(1)

    vi.mocked(http.sendToAi).mockClear()
    vi.mocked(promptModule.buildPromptForIntent).mockClear()

    explainBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 130))

    expect(vi.mocked(promptModule.buildPromptForIntent)).toHaveBeenCalledWith(
      { id: 'explain', label: 'Explain Code', aiIntent: 'ask', prompt: 'Explain this code' },
      { file: '/src/App.tsx', line: 10, column: 5 },
      null,
      null,
    )
    expect(vi.mocked(http.sendToAi)).toHaveBeenCalledTimes(1)
  })

  it('shows a header-level runtime context toggle and defaults it on when fix-bug exists', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [{ id: 'fix-bug', label: 'Fix Bug', aiIntent: 'fix', prompt: 'Fix {{file}}' }],
    } as any)

    const runtimeContext: RuntimeContextEnvelope = {
      summary: {
        runtimeErrorCount: 2,
        failedRequestCount: 1,
        includedRecordIds: ['a', 'b', 'c'],
      },
      records: [],
    }
    const getRuntimeContext = vi.fn(() => runtimeContext)

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { runtimeContext: { enabled: true } },
      onCloseMock,
      { getRuntimeContext },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(getRuntimeContext).toHaveBeenCalledWith({ file: '/src/App.tsx', line: 10, column: 5 })
    const toggle = shadowRoot.querySelector('button[aria-label="Attach runtime context"]')
    expect(toggle).not.toBeNull()
    expect(toggle?.getAttribute('aria-pressed')).toBe('true')
    expect(toggle?.getAttribute('data-visual-state')).toBe('active')
    expect(toggle?.getAttribute('title')).toBe(
      'Runtime context enabled • 2 runtime errors • 1 failed request',
    )
    const badge = toggle?.querySelector(`.${runtimeToggleBadgeClass}`)
    expect(badge?.textContent).toBe('2')
    expect((badge as HTMLElement | null)?.hidden).toBe(false)
    const summary = shadowRoot.querySelector(`.${menuContextSummaryClass}`)
    expect(summary?.textContent).toContain('2 runtime errors')
    expect(summary?.textContent).toContain('1 failed request')
  })

  it('applies visible active feedback when the runtime bug icon is enabled', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [
        { id: 'explain', label: 'Explain Code', aiIntent: 'ask', prompt: 'Explain this code' },
      ],
    } as any)

    const runtimeContext: RuntimeContextEnvelope = {
      summary: {
        runtimeErrorCount: 1,
        failedRequestCount: 0,
        includedRecordIds: ['err-1'],
      },
      records: [
        {
          id: 'err-1',
          kind: 'runtime-error',
          timestamp: 100,
          message: 'boom',
          occurrenceCount: 1,
          relevanceScore: 0.9,
          relevanceLevel: 'high',
          relevanceReasons: ['stack references target file'],
        },
      ],
    }

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { runtimeContext: { enabled: true } },
      onCloseMock,
      { getRuntimeContext: vi.fn(() => runtimeContext) },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const toggle = shadowRoot.querySelector(
      'button[aria-label="Attach runtime context"]',
    ) as HTMLButtonElement

    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(toggle.dataset.visualState).toBe('inactive')
    expect(toggle.style.boxShadow).toBe('none')

    toggle.click()

    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(toggle.dataset.visualState).toBe('active')
    expect(toggle.title).toBe('Runtime context enabled • 1 runtime error')
    expect(toggle.style.background).not.toBe('var(--inspecto-surface-subtle)')
    expect(toggle.style.boxShadow).toBe('var(--inspecto-shadow-accent)')
  })

  it('defaults runtime context on for custom fix intents that declare aiIntent', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [
        { id: 'repair-layout', label: 'Repair Layout', aiIntent: 'fix', prompt: 'Fix layout' },
        { id: 'explain', label: 'Explain Code', aiIntent: 'ask', prompt: 'Explain this code' },
      ],
    } as any)

    const runtimeContext: RuntimeContextEnvelope = {
      summary: {
        runtimeErrorCount: 1,
        failedRequestCount: 0,
        includedRecordIds: ['err-1'],
      },
      records: [
        {
          id: 'err-1',
          kind: 'runtime-error',
          timestamp: 100,
          message: 'layout boom',
          occurrenceCount: 1,
          relevanceScore: 0.9,
          relevanceLevel: 'high',
          relevanceReasons: ['stack references target file'],
        },
      ],
    }

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { runtimeContext: { enabled: true } },
      onCloseMock,
      { getRuntimeContext: vi.fn(() => runtimeContext) },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const toggle = shadowRoot.querySelector('button[aria-label="Attach runtime context"]')
    expect(toggle?.getAttribute('aria-pressed')).toBe('mixed')
    expect(toggle?.getAttribute('title')).toContain('Runtime context defaults to fix actions only')
    expect(toggle?.getAttribute('title')).not.toContain('fix-bug')
    expect((toggle as HTMLButtonElement | null)?.style.boxShadow).toBe('none')

    const repairBtn = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Repair Layout',
    )
    repairBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 130))

    expect(http.sendToAi).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        runtimeContext,
      }),
    )
  })

  it('defaults the runtime context toggle off when only non-fix prompts are available', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [
        { id: 'explain', label: 'Explain Code', aiIntent: 'ask', prompt: 'Explain this code' },
      ],
    })

    const runtimeContext: RuntimeContextEnvelope = {
      summary: {
        runtimeErrorCount: 1,
        failedRequestCount: 1,
        includedRecordIds: ['err-1', 'req-1'],
      },
      records: [
        {
          id: 'err-1',
          kind: 'runtime-error',
          timestamp: 100,
          message: 'Cannot read properties of undefined',
          occurrenceCount: 2,
          relevanceScore: 0.9,
          relevanceLevel: 'high',
          relevanceReasons: ['stack references target file'],
        },
      ],
    }
    const getRuntimeContext = vi.fn(() => runtimeContext)

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { runtimeContext: { enabled: true } },
      onCloseMock,
      { getRuntimeContext },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const toggle = shadowRoot.querySelector('button[aria-label="Attach runtime context"]')
    expect(toggle).not.toBeNull()
    expect(toggle?.getAttribute('aria-pressed')).toBe('false')
    expect(toggle?.getAttribute('data-visual-state')).toBe('inactive')
    const badge = toggle?.querySelector(`.${runtimeToggleBadgeClass}`)
    expect((badge as HTMLElement | null)?.hidden).toBe(true)
  })

  it('uses a mixed default when fix-bug and non-fix prompts coexist', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [
        { id: 'fix-bug', label: 'Fix Bug', aiIntent: 'fix', prompt: 'Fix {{file}}' },
        { id: 'explain', label: 'Explain Code', aiIntent: 'ask', prompt: 'Explain this code' },
      ],
    })

    const runtimeContext: RuntimeContextEnvelope = {
      summary: {
        runtimeErrorCount: 1,
        failedRequestCount: 0,
        includedRecordIds: ['err-1'],
      },
      records: [
        {
          id: 'err-1',
          kind: 'runtime-error',
          timestamp: 100,
          message: 'Cannot read properties of undefined',
          occurrenceCount: 2,
          relevanceScore: 0.9,
          relevanceLevel: 'high',
          relevanceReasons: ['stack references target file'],
        },
      ],
    }
    const getRuntimeContext = vi.fn(() => runtimeContext)

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { runtimeContext: { enabled: true } },
      onCloseMock,
      { getRuntimeContext },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const toggle = shadowRoot.querySelector('button[aria-label="Attach runtime context"]')
    expect(toggle?.getAttribute('aria-pressed')).toBe('mixed')
    expect(toggle?.getAttribute('data-visual-state')).toBe('mixed')
    const badge = toggle?.querySelector(`.${runtimeToggleBadgeClass}`)
    expect((badge as HTMLElement | null)?.hidden).toBe(true)

    const buttons = Array.from(shadowRoot.querySelectorAll('button'))
    const explainBtn = buttons.find(button => button.textContent === 'Explain Code')
    const fixBugBtn = buttons.find(button => button.textContent === 'Fix Bug')

    explainBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 130))
    expect(vi.mocked(http.sendToAi).mock.calls[0]?.[0]).not.toHaveProperty('runtimeContext')

    vi.mocked(http.sendToAi).mockClear()

    fixBugBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 130))
    expect(http.sendToAi).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        runtimeContext,
      }),
    )
  })

  it('includes runtime context in non-fix intent sends when the header toggle is enabled', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [
        { id: 'explain', label: 'Explain Code', aiIntent: 'ask', prompt: 'Explain this code' },
      ],
    })

    const runtimeContext: RuntimeContextEnvelope = {
      summary: {
        runtimeErrorCount: 1,
        failedRequestCount: 1,
        includedRecordIds: ['err-1', 'req-1'],
      },
      records: [
        {
          id: 'err-1',
          kind: 'runtime-error',
          timestamp: 100,
          message: 'Cannot read properties of undefined',
          occurrenceCount: 2,
          relevanceScore: 0.9,
          relevanceLevel: 'high',
          relevanceReasons: ['stack references target file'],
        },
      ],
    }
    const getRuntimeContext = vi.fn(() => runtimeContext)

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { runtimeContext: { enabled: true } },
      onCloseMock,
      { getRuntimeContext },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const toggle = shadowRoot.querySelector('button[aria-label="Attach runtime context"]')
    toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const explainBtn = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Explain Code',
    )
    explainBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 130))

    expect(http.sendToAi).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        location: { file: '/src/App.tsx', line: 10, column: 5 },
        prompt: 'explain PROMPT 1',
        runtimeContext,
      }),
    )
  })

  it('includes runtime context in custom ask sends when the header toggle is enabled', async () => {
    const runtimeContext: RuntimeContextEnvelope = {
      summary: {
        runtimeErrorCount: 1,
        failedRequestCount: 0,
        includedRecordIds: ['err-1'],
      },
      records: [
        {
          id: 'err-1',
          kind: 'runtime-error',
          timestamp: 100,
          message: 'Cannot read properties of undefined',
          occurrenceCount: 2,
          relevanceScore: 0.9,
          relevanceLevel: 'high',
          relevanceReasons: ['stack references target file'],
        },
      ],
    }
    const getRuntimeContext = vi.fn(() => runtimeContext)

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { runtimeContext: { enabled: true } },
      onCloseMock,
      { getRuntimeContext },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const toggle = shadowRoot.querySelector('button[aria-label="Attach runtime context"]')
    toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const input = shadowRoot.querySelector(`.${menuInputClass}`) as HTMLInputElement
    const sendIcon = shadowRoot.querySelector(`.${menuInputIconClass}`) as HTMLElement
    input.value = 'Why is this broken?'
    sendIcon.click()
    await new Promise(resolve => setTimeout(resolve, 220))

    expect(http.sendToAi).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        location: { file: '/src/App.tsx', line: 10, column: 5 },
        runtimeContext,
      }),
    )
  })

  it('appends CSS context to inspect sends when the CSS header toggle is enabled', async () => {
    const captureCssContextPrompt = vi.fn(
      () =>
        'Relevant CSS context:\n- button.primary\n  file=/src/App.tsx:10:5\n  computed: display=flex',
    )

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
      { captureCssContextPrompt },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const cssToggle = shadowRoot.querySelector(
      'button[aria-label="Attach CSS context"]',
    ) as HTMLButtonElement | null
    expect(cssToggle).not.toBeNull()
    expect(cssToggle?.getAttribute('aria-pressed')).toBe('false')
    cssToggle?.click()
    expect(cssToggle?.getAttribute('aria-pressed')).toBe('true')
    expect(cssToggle?.getAttribute('data-visual-state')).toBe('active')
    expect(cssToggle?.title).toBe('CSS context enabled')

    const explainBtn = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Explain Code',
    )
    explainBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 130))

    expect(captureCssContextPrompt).toHaveBeenCalledTimes(1)
    expect(http.sendToAi).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        prompt: expect.stringContaining('Relevant CSS context:'),
      }),
    )
  })

  it('automatically appends CSS context for the fix-ui intent without enabling the CSS header toggle', async () => {
    const captureCssContextPrompt = vi.fn(
      () =>
        'Relevant CSS context:\n- button.primary\n  file=/src/App.tsx:10:5\n  computed: display=flex',
    )

    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [
        { id: 'fix-ui', label: 'Fix UI', aiIntent: 'fix', prompt: 'Fix UI issue' },
        { id: 'explain', label: 'Explain Code', aiIntent: 'ask', prompt: 'Explain this code' },
      ],
    } as any)

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
      { captureCssContextPrompt },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const cssToggle = shadowRoot.querySelector(
      'button[aria-label="Attach CSS context"]',
    ) as HTMLButtonElement | null
    expect(cssToggle?.getAttribute('aria-pressed')).toBe('false')

    const fixUiBtn = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Fix UI',
    )
    fixUiBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 130))

    expect(captureCssContextPrompt).toHaveBeenCalledTimes(1)
    expect(http.sendToAi).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        prompt: expect.stringContaining('Relevant CSS context:'),
      }),
    )

    vi.mocked(http.sendToAi).mockClear()
    captureCssContextPrompt.mockClear()

    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [
        { id: 'fix-ui', label: 'Fix UI', aiIntent: 'fix', prompt: 'Fix UI issue' },
        { id: 'explain', label: 'Explain Code', aiIntent: 'ask', prompt: 'Explain this code' },
      ],
    } as any)

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
      { captureCssContextPrompt },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const explainBtn = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Explain Code',
    )
    explainBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 130))

    expect(captureCssContextPrompt).not.toHaveBeenCalled()
    expect(http.sendToAi).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        prompt: expect.not.stringContaining('Relevant CSS context:'),
      }),
    )
  })

  it('includes runtime evidence in the final prompt when the bug icon is enabled and a real console.error was captured', async () => {
    const actualPromptModule = await vi.importActual<typeof import('../src/fix-bug-prompt.js')>(
      '../src/fix-bug-prompt.js',
    )
    vi.mocked(promptModule.buildPromptForIntent).mockImplementation(
      actualPromptModule.buildPromptForIntent,
    )
    vi.mocked(promptModule.appendRuntimeContextToPrompt).mockImplementation(
      actualPromptModule.appendRuntimeContextToPrompt,
    )

    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [
        { id: 'explain', label: 'Explain Code', aiIntent: 'ask', prompt: 'Explain {{file}}' },
      ],
    } as any)

    const collector = createRuntimeContextCollector()
    const stopCapture = attachRuntimeContextCapture(collector)

    try {
      const error = new Error('console boom')
      error.stack = 'Error: console boom\n    at App (/src/App.tsx:10:5)'
      console.error('Runtime issue', error)

      showIntentMenu(
        shadowRoot,
        { file: '/src/App.tsx', line: 10, column: 5 },
        100,
        100,
        { runtimeContext: { enabled: true } } as any,
        onCloseMock,
        {
          getRuntimeContext: location =>
            createRuntimeContextEnvelope(
              selectRuntimeEvidence(collector.snapshot().records, location),
            ),
        },
      )

      await new Promise(resolve => setTimeout(resolve, 0))

      const runtimeToggle = shadowRoot.querySelector(
        'button[aria-label="Attach runtime context"]',
      ) as HTMLButtonElement
      runtimeToggle.click()

      const explainBtn = Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Explain Code',
      ) as HTMLButtonElement
      explainBtn.click()

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(http.sendToAi).toHaveBeenCalledWith(
        expect.objectContaining({
          runtimeContext: expect.objectContaining({
            records: expect.arrayContaining([
              expect.objectContaining({ message: expect.stringContaining('console boom') }),
            ]),
          }),
          prompt: expect.stringMatching(
            /Relevant runtime context:|High-confidence runtime evidence:/,
          ),
        }),
      )
    } finally {
      stopCapture()
    }
  })

  it('includes runtime evidence in the final prompt when a real uncaught window error matches the inspected file', async () => {
    const actualPromptModule = await vi.importActual<typeof import('../src/fix-bug-prompt.js')>(
      '../src/fix-bug-prompt.js',
    )
    vi.mocked(promptModule.buildPromptForIntent).mockImplementation(
      actualPromptModule.buildPromptForIntent,
    )
    vi.mocked(promptModule.appendRuntimeContextToPrompt).mockImplementation(
      actualPromptModule.appendRuntimeContextToPrompt,
    )

    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [{ id: 'fix-bug', label: 'Fix Bug', aiIntent: 'fix', prompt: 'Fix {{file}}' }],
    } as any)

    const collector = createRuntimeContextCollector()
    const stopCapture = attachRuntimeContextCapture(collector)

    try {
      const runtimeError = new Error('Inspecto runtime test error')
      runtimeError.stack =
        'Error: Inspecto runtime test error\n' +
        '    at http://localhost:5173/src/App.vue:76:19\n' +
        '    at _createElementVNode.onClick._cache.<computed> (http://localhost:5173/src/App.vue:77:13)'

      const event = new Event('error') as ErrorEvent
      Object.defineProperties(event, {
        message: { value: 'Uncaught Error: Inspecto runtime test error' },
        filename: { value: 'http://localhost:5173/src/App.vue' },
        lineno: { value: 76 },
        colno: { value: 19 },
        error: { value: runtimeError },
      })
      window.dispatchEvent(event)

      const snapshot = collector.snapshot()
      const selected = selectRuntimeEvidence(snapshot.records, {
        file: '/Users/dev/inspecto/playground/vue-vite/src/App.vue',
        line: 61,
        column: 9,
      })
      expect(snapshot.records.length).toBeGreaterThan(0)
      expect(selected.length).toBeGreaterThan(0)

      showIntentMenu(
        shadowRoot,
        {
          file: '/Users/dev/inspecto/playground/vue-vite/src/App.vue',
          line: 61,
          column: 9,
        },
        100,
        100,
        { runtimeContext: { enabled: true } } as any,
        onCloseMock,
        {
          getRuntimeContext: location =>
            createRuntimeContextEnvelope(
              selectRuntimeEvidence(collector.snapshot().records, location),
            ),
        },
      )

      await new Promise(resolve => setTimeout(resolve, 0))

      const runtimeToggle = shadowRoot.querySelector(
        'button[aria-label="Attach runtime context"]',
      ) as HTMLButtonElement
      expect(runtimeToggle.getAttribute('aria-pressed')).toBe('true')

      const fixBugBtn = Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Fix Bug',
      ) as HTMLButtonElement
      fixBugBtn.click()

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(http.sendToAi).toHaveBeenCalledWith(
        expect.objectContaining({
          runtimeContext: expect.objectContaining({
            records: expect.arrayContaining([
              expect.objectContaining({
                message: expect.stringContaining('Inspecto runtime test error'),
              }),
            ]),
          }),
          prompt: expect.stringContaining('High-confidence runtime evidence:'),
        }),
      )
    } finally {
      stopCapture()
    }
  })

  it('includes runtime evidence in the final prompt through the real mountInspector inspect flow', async () => {
    const actualPromptModule = await vi.importActual<typeof import('../src/fix-bug-prompt.js')>(
      '../src/fix-bug-prompt.js',
    )
    vi.mocked(promptModule.buildPromptForIntent).mockImplementation(
      actualPromptModule.buildPromptForIntent,
    )
    vi.mocked(promptModule.appendRuntimeContextToPrompt).mockImplementation(
      actualPromptModule.appendRuntimeContextToPrompt,
    )

    vi.mocked(http.fetchIdeInfo).mockResolvedValue({
      ide: 'vscode',
      prompts: [{ id: 'fix-bug', label: 'Fix Bug', aiIntent: 'fix', prompt: 'Fix {{file}}' }],
      runtimeContext: { enabled: true, preview: true },
    } as any)

    document.body.innerHTML =
      '<button data-inspecto="/Users/dev/inspecto/playground/vue-vite/src/App.vue:61:9" id="target">Target</button>'

    await mountInspector({
      defaultActive: true,
      runtimeContext: { enabled: true, preview: true },
    } as any)

    const runtimeError = new Error('Inspecto runtime test error')
    runtimeError.stack =
      'Error: Inspecto runtime test error\n' +
      '    at http://localhost:5173/src/App.vue:76:19\n' +
      '    at _createElementVNode.onClick._cache.<computed> (http://localhost:5173/src/App.vue:77:13)'

    const event = new Event('error') as ErrorEvent
    Object.defineProperties(event, {
      message: { value: 'Uncaught Error: Inspecto runtime test error' },
      filename: { value: 'http://localhost:5173/src/App.vue' },
      lineno: { value: 76 },
      colno: { value: 19 },
      error: { value: runtimeError },
    })
    window.dispatchEvent(event)

    document
      .getElementById('target')!
      .dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }),
      )

    await new Promise(resolve => setTimeout(resolve, 0))

    const mountedShadowRoot = (document.querySelector('inspecto-overlay') as HTMLElement)
      .shadowRoot!
    const fixBugBtn = Array.from(mountedShadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Fix Bug',
    ) as HTMLButtonElement
    fixBugBtn.click()

    await new Promise(resolve => setTimeout(resolve, 150))

    expect(http.sendToAi).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeContext: expect.objectContaining({
          records: expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringContaining('Inspecto runtime test error'),
            }),
          ]),
        }),
        prompt: expect.stringContaining('High-confidence runtime evidence:'),
      }),
    )
  })

  it('resets the runtime context toggle to its default when the menu is reopened', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValue({
      ide: 'vscode',
      prompts: [
        { id: 'explain', label: 'Explain Code', aiIntent: 'ask', prompt: 'Explain this code' },
      ],
    })

    const cleanup = showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { runtimeContext: { enabled: true } },
      onCloseMock,
      { getRuntimeContext: vi.fn(() => null) },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    let toggle = shadowRoot.querySelector('button[aria-label="Attach runtime context"]')
    toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(toggle?.getAttribute('aria-pressed')).toBe('true')

    cleanup()

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { runtimeContext: { enabled: true } },
      onCloseMock,
      { getRuntimeContext: vi.fn(() => null) },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    toggle = shadowRoot.querySelector('button[aria-label="Attach runtime context"]')
    expect(toggle?.getAttribute('aria-pressed')).toBe('false')
  })

  it('hides the runtime error badge again after the toggle is turned off', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [{ id: 'fix-bug', label: 'Fix Bug', aiIntent: 'fix', prompt: 'Fix {{file}}' }],
    })

    const runtimeContext: RuntimeContextEnvelope = {
      summary: {
        runtimeErrorCount: 3,
        failedRequestCount: 0,
        includedRecordIds: ['err-1'],
      },
      records: [
        {
          id: 'err-1',
          kind: 'runtime-error',
          timestamp: 100,
          message: 'boom',
          occurrenceCount: 3,
          relevanceScore: 0.9,
          relevanceLevel: 'high',
          relevanceReasons: ['stack references target file'],
        },
      ],
    }

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      { runtimeContext: { enabled: true } },
      onCloseMock,
      { getRuntimeContext: vi.fn(() => runtimeContext) },
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const toggle = shadowRoot.querySelector(
      'button[aria-label="Attach runtime context"]',
    ) as HTMLButtonElement
    const badge = toggle.querySelector(`.${runtimeToggleBadgeClass}`) as HTMLElement
    expect(badge.hidden).toBe(false)

    toggle.click()

    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(badge.hidden).toBe(true)
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
    const openBtn = Array.from(buttons).find(b => b.getAttribute('aria-label') === 'Open in Editor')

    openBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await new Promise(resolve => setTimeout(resolve, 0))

    const errorEl = shadowRoot.querySelector(`.${errorMsgClass}`)
    expect(errorEl?.textContent).toContain('Unable to open file in the IDE.')
    expect(onCloseMock).not.toHaveBeenCalled()
  })

  it('captures runtime context while inspect mode is active', async () => {
    const inspector = (await mountInspector({
      defaultActive: true,
      hotKeys: 'alt',
      runtimeContext: { enabled: true },
    })) as any
    expect(inspector).not.toBeNull()

    const runtimeError = new Error('boom')
    runtimeError.stack = 'Error: boom\n    at App (/src/App.tsx:10:5)'
    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'boom',
        filename: '/src/App.tsx',
        error: runtimeError,
      }),
    )

    expect(inspector.runtimeContextCollector.snapshot().records).toHaveLength(1)
  })

  it('opens the source directly on hotkey-click without opening the inspect menu', async () => {
    document.body.innerHTML =
      '<button data-inspecto="/src/App.tsx:10:5" id="target">Target</button>'

    const inspector = await mountInspector({ hotKeys: 'alt' })
    expect(inspector).not.toBeNull()

    document.getElementById('target')!.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
        altKey: true,
      }),
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const mountedShadowRoot = (document.querySelector('inspecto-overlay') as HTMLElement)
      .shadowRoot!

    expect(http.openFile).toHaveBeenCalledWith({ file: '/src/App.tsx', line: 10, column: 5 })
    expect(http.sendToAi).not.toHaveBeenCalled()
    expect(mountedShadowRoot.querySelector(`.${menuClass}`)).toBeNull()
  })

  it('opens the source directly on hotkey-click even when inspect mode is already active', async () => {
    document.body.innerHTML =
      '<button data-inspecto="/src/App.tsx:10:5" id="target">Target</button>'

    const inspector = await mountInspector({ defaultActive: true, hotKeys: 'alt' })
    expect(inspector).not.toBeNull()

    document.getElementById('target')!.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
        altKey: true,
      }),
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const mountedShadowRoot = (document.querySelector('inspecto-overlay') as HTMLElement)
      .shadowRoot!

    expect(http.openFile).toHaveBeenCalledWith({ file: '/src/App.tsx', line: 10, column: 5 })
    expect(http.sendToAi).not.toHaveBeenCalled()
    expect(mountedShadowRoot.querySelector(`.${menuClass}`)).toBeNull()
  })

  it('keeps the header open-in-editor action available even when prompts omit open-in-editor', async () => {
    vi.mocked(http.fetchIdeInfo).mockResolvedValueOnce({
      ide: 'vscode',
      prompts: [{ id: 'explain', label: 'Explain Code', prompt: 'Explain this code' }],
    } as any)

    showIntentMenu(
      shadowRoot,
      { file: '/src/App.tsx', line: 10, column: 5 },
      100,
      100,
      {},
      onCloseMock,
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const openButton = shadowRoot.querySelector(
      'button[aria-label="Open in Editor"]',
    ) as HTMLButtonElement | null

    expect(openButton).not.toBeNull()
    openButton?.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(http.openFile).toHaveBeenCalledWith({ file: '/src/App.tsx', line: 10, column: 5 })
  })

  it('opens the inspect menu on click by default when mounted through the public API', async () => {
    document.body.innerHTML =
      '<button data-inspecto="/src/App.tsx:10:5" id="target">Target</button>'

    const inspector = await mountInspector({ defaultActive: true })
    expect(inspector).not.toBeNull()

    document.getElementById('target')!.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      }),
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const mountedShadowRoot = (document.querySelector('inspecto-overlay') as HTMLElement)
      .shadowRoot!

    expect(mountedShadowRoot.querySelector(`.${menuClass}`)).not.toBeNull()
    expect(
      Array.from(mountedShadowRoot.querySelectorAll('button')).some(
        button => button.getAttribute('aria-label') === 'Open in Editor',
      ),
    ).toBe(true)
  })
})
