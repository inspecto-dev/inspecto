import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type SendAnnotationsToAiRequest } from '@inspecto-dev/types'
import { mountInspector, unmountInspector } from '../src/index.js'
import { buildAnnotateFullPrompt } from '../src/annotate-full-prompt.js'
import { openFileWithDiagnostics, sendAnnotationsToAi, setBaseUrl } from '../src/http.js'
import { toAnnotateErrorMessage } from '../src/component-annotate-ui.js'

const SYSTEM_STARTED_MESSAGE = 'Agent claimed this task through MCP.'

describe('annotate mode transport', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    setBaseUrl('http://0.0.0.0:5678')
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('posts annotations to the batch dispatch endpoint', async () => {
    const req: SendAnnotationsToAiRequest = {
      annotations: [
        {
          note: 'Review this button spacing.',
          intent: 'review',
          targets: [
            {
              location: { file: '/repo/App.tsx', line: 12, column: 4 },
            },
          ],
        },
      ],
    }

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    await sendAnnotationsToAi(req)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://0.0.0.0:5678/inspecto/api/v1/ai/dispatch/annotations',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      }),
    )
  })

  it('opens source files through the plugin server source endpoint', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    await expect(
      openFileWithDiagnostics({
        file: '/repo/App.tsx',
        line: 12,
        column: 4,
      }),
    ).resolves.toEqual({ success: true })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://0.0.0.0:5678/inspecto/api/v1/source/open',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: '/repo/App.tsx',
          line: 12,
          column: 4,
        }),
      }),
    )
  })

  it('returns server unavailable when annotation dispatch cannot reach the dev server', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))

    const result = await sendAnnotationsToAi({
      annotations: [
        {
          note: 'Review this button spacing.',
          intent: 'review',
          targets: [
            {
              location: { file: '/repo/App.tsx', line: 12, column: 4 },
            },
          ],
        },
      ],
    })

    expect(result).toEqual({
      success: false,
      error: 'Local dev server unavailable',
      errorCode: 'SERVER_UNAVAILABLE',
    })
  })

  it('formats server unavailable annotation errors with a clear next step', () => {
    expect(toAnnotateErrorMessage(null, 'SERVER_UNAVAILABLE')).toContain(
      'Inspecto could not reach the local dev server',
    )
    expect(toAnnotateErrorMessage(null, 'SERVER_UNAVAILABLE')).toContain('inspecto doctor')
  })
})

describe('annotate mode integration', () => {
  class FakeEventSource {
    static instances: FakeEventSource[] = []

    readonly listeners = new Map<string, Array<(event: Event) => void>>()
    closed = false

    constructor(readonly url: string) {
      FakeEventSource.instances.push(this)
    }

    addEventListener(type: string, listener: (event: Event) => void): void {
      const listeners = this.listeners.get(type) ?? []
      listeners.push(listener)
      this.listeners.set(type, listeners)
    }

    close(): void {
      this.closed = true
    }

    emit(type: string, payload: unknown): void {
      const listeners = this.listeners.get(type) ?? []
      const event = { data: JSON.stringify(payload) } as Event
      for (const listener of listeners) {
        listener(event)
      }
    }

    static reset(): void {
      FakeEventSource.instances = []
    }
  }

  function configResponse(overrides: Record<string, unknown> = {}) {
    return {
      ok: true,
      json: async () => ({ ide: 'vscode', ideConnected: true, prompts: [], ...overrides }),
    }
  }

  function createDeferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise
      reject = rejectPromise
    })
    return { promise, resolve, reject }
  }

  function clickQuickCaptureToggle(shadowRoot: ShadowRoot): void {
    const pureMarkButton = shadowRoot.querySelector(
      'button[aria-label="Toggle quick capture"]',
    ) as HTMLButtonElement | null

    expect(pureMarkButton).not.toBeNull()
    pureMarkButton!.click()
  }

  beforeEach(() => {
    vi.useFakeTimers()
    FakeEventSource.reset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    unmountInspector()
    document.body.innerHTML = ''
  })

  it('repositions the composer on scroll with a single coalesced reflow', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('requestAnimationFrame', ((cb: FrameRequestCallback) => {
      return window.setTimeout(() => cb(performance.now()), 0)
    }) as typeof requestAnimationFrame)
    vi.stubGlobal('cancelAnimationFrame', ((id: number) => {
      window.clearTimeout(id)
    }) as typeof cancelAnimationFrame)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    const target = document.getElementById('target') as HTMLButtonElement
    const rectSpy = vi.fn(() => ({
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      width: 100,
      height: 30,
      right: 110,
      bottom: 50,
      toJSON: () => {},
    }))
    target.getBoundingClientRect = rectSpy as unknown as typeof target.getBoundingClientRect

    const inspector = (await mountInspector({ defaultActive: true, mode: 'annotate' })) as any
    inspector.runtimeContextCollector.recordError({
      message: 'boom',
      stack: 'at App (/repo/App.tsx:10:2)',
      timestamp: Date.now(),
    })
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    rectSpy.mockClear()
    document.dispatchEvent(new Event('scroll'))
    document.dispatchEvent(new Event('scroll'))

    expect(rectSpy).toHaveBeenCalledTimes(0)

    await vi.runAllTimersAsync()

    expect(rectSpy).toHaveBeenCalledTimes(2)
  })

  it('positions a newly clicked target using viewport coordinates after scrolling', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('requestAnimationFrame', ((cb: FrameRequestCallback) => {
      return window.setTimeout(() => cb(performance.now()), 0)
    }) as typeof requestAnimationFrame)
    vi.stubGlobal('cancelAnimationFrame', ((id: number) => {
      window.clearTimeout(id)
    }) as typeof cancelAnimationFrame)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <button data-inspecto="/repo/App.tsx:20:2" id="third">Third</button>
    `

    const first = document.getElementById('first') as HTMLButtonElement
    const third = document.getElementById('third') as HTMLButtonElement

    first.getBoundingClientRect = () =>
      ({
        x: 40,
        y: 80,
        left: 40,
        top: 80,
        width: 120,
        height: 36,
        right: 160,
        bottom: 116,
        toJSON: () => {},
      }) as DOMRect

    third.getBoundingClientRect = () =>
      ({
        x: 320,
        y: 260,
        left: 320,
        top: 260,
        width: 180,
        height: 36,
        right: 500,
        bottom: 296,
        toJSON: () => {},
      }) as DOMRect

    const _inspector = (await mountInspector({
      defaultActive: true,
      mode: 'annotate',
      runtimeContext: { enabled: true, preview: true },
    })) as any
    await Promise.resolve()
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    first.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    document.dispatchEvent(new Event('scroll'))
    await vi.runAllTimersAsync()

    third.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const composer = shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement
    expect(composer.style.left).toBe('240px')
    expect(composer.style.top).toBe('310px')
  })

  it('does not preserve the previous placement when switching to a different target draft', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('requestAnimationFrame', ((cb: FrameRequestCallback) => {
      return window.setTimeout(() => cb(performance.now()), 0)
    }) as typeof requestAnimationFrame)
    vi.stubGlobal('cancelAnimationFrame', ((id: number) => {
      window.clearTimeout(id)
    }) as typeof cancelAnimationFrame)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <button data-inspecto="/repo/App.tsx:20:2" id="second">Second</button>
    `

    const first = document.getElementById('first') as HTMLButtonElement
    const second = document.getElementById('second') as HTMLButtonElement

    first.getBoundingClientRect = () =>
      ({
        x: 860,
        y: 120,
        left: 860,
        top: 120,
        width: 120,
        height: 36,
        right: 980,
        bottom: 156,
        toJSON: () => {},
      }) as DOMRect

    second.getBoundingClientRect = () =>
      ({
        x: 320,
        y: 260,
        left: 320,
        top: 260,
        width: 180,
        height: 36,
        right: 500,
        bottom: 296,
        toJSON: () => {},
      }) as DOMRect

    const _inspector = (await mountInspector({
      defaultActive: true,
      mode: 'annotate',
      runtimeContext: { enabled: true, preview: true },
    })) as any
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    first.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    let composer = shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement
    expect(composer.style.left).toBe('506px')
    expect(composer.style.top).toBe('18px')

    document.dispatchEvent(new Event('scroll'))
    await vi.runAllTimersAsync()

    second.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    composer = shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement
    expect(composer.style.left).toBe('240px')
    expect(composer.style.top).toBe('310px')
  })

  it('adds clicked elements to the current record instead of opening the inspect menu', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <div data-inspecto="/repo/App.tsx:10:2" id="first"></div>
      <div data-inspecto="/repo/App.tsx:20:2" id="second"></div>
    `

    const inspector = await mountInspector({ defaultActive: true })
    inspector.setMode?.('annotate')

    document
      .getElementById('first')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const host = document.querySelector('inspecto-overlay')!
    const shadowRoot = (host as HTMLElement).shadowRoot!
    const sidebar = shadowRoot.querySelector('.inspecto-annotate-sidebar') as HTMLElement

    expect(sidebar.style.display).toBe('')
    expect(shadowRoot.querySelector('button[aria-label="Toggle quick capture"]')).not.toBeNull()
    expect(shadowRoot.textContent).not.toContain('Open in Editor')
    expect(shadowRoot.textContent).toContain('Cancel')
    const composerButtons = Array.from(
      shadowRoot.querySelectorAll('[data-inspecto-annotate-composer] button'),
    ).map(button => button.textContent)
    expect(composerButtons).toContain('Save note')
    expect(composerButtons).not.toContain('Update note')
    const composerNote = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    expect(composerNote.placeholder).toBe('What should change for this component?')
  })

  it('keeps Enter available for multi-line composer notes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement

    note.value = 'Change to red'
    note.dispatchEvent(new Event('input', { bubbles: true }))
    note.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
    await Promise.resolve()

    expect(shadowRoot.querySelectorAll('.inspecto-annotate-sidebar-queue-item')).toHaveLength(0)
  })

  it('saves the current annotation when pressing Cmd or Ctrl Enter in the composer note', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement

    note.value = 'Change to red'
    note.dispatchEvent(new Event('input', { bubbles: true }))
    note.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }),
    )
    await Promise.resolve()

    expect(shadowRoot.querySelectorAll('.inspecto-annotate-sidebar-queue-item')).toHaveLength(1)
    expect(shadowRoot.querySelector('.inspecto-annotate-sidebar')?.textContent).toContain(
      'Change to red',
    )
    expect(
      shadowRoot.querySelector('[data-inspecto-annotate-composer-shortcut]')?.textContent,
    ).toBe('Enter for newline · ⌘/Ctrl+Enter to save')
  })

  it('saves empty-note records immediately in quick capture mode without opening the add composer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <button data-inspecto="/repo/App.tsx:20:2" id="second">Second</button>
    `

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    clickQuickCaptureToggle(shadowRoot)

    document
      .getElementById('first')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    document
      .getElementById('second')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const composer = shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement

    expect(composer.style.display).toBe('none')
    expect(shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')).toHaveLength(2)
    expect(shadowRoot.querySelectorAll('.inspecto-annotate-sidebar-queue-item')).toHaveLength(2)
  })

  it('removes the current draft when deleting its chip from the inline prompt', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = '<div data-inspecto="/repo/App.tsx:10:2" id="first">First</div>'

    const inspector = await mountInspector({ defaultActive: true, mode: 'annotate' })
    inspector.setMode?.('annotate')

    document
      .getElementById('first')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const chip = shadowRoot.querySelector('[data-annotate-chip-id]') as HTMLElement | null

    expect(chip).not.toBeNull()

    chip?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

    const deleteButton = shadowRoot.querySelector(
      '[data-annotate-chip-remove-id]',
    ) as HTMLButtonElement | null

    expect(deleteButton).not.toBeNull()

    deleteButton?.click()

    expect(shadowRoot.querySelector('[data-annotate-chip-id]')).toBeNull()
    expect(shadowRoot.querySelector('[data-inspecto-annotate-overlay-box]')).toBeNull()
    const sidebar = shadowRoot.querySelector('.inspecto-annotate-sidebar') as HTMLElement
    expect(sidebar.style.display).toBe('')
    expect(shadowRoot.querySelector('button[aria-label="Toggle quick capture"]')).not.toBeNull()
  })

  it('shows the quick capture toggle before any record exists in a fresh annotate session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const sidebar = shadowRoot.querySelector('.inspecto-annotate-sidebar') as HTMLElement | null

    expect(sidebar).not.toBeNull()
    expect(sidebar?.style.display).toBe('')

    const pureMarkButton = shadowRoot.querySelector(
      'button[aria-label="Toggle quick capture"]',
    ) as HTMLButtonElement | null

    expect(pureMarkButton).not.toBeNull()
    expect(pureMarkButton?.getAttribute('aria-pressed')).toBe('false')

    pureMarkButton?.click()

    expect(pureMarkButton?.getAttribute('aria-pressed')).toBe('true')
  })

  it('reopens the existing saved record when re-clicking the same target in quick capture mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const target = document.getElementById('target')!

    clickQuickCaptureToggle(shadowRoot)

    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    const composer = shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement
    const composerButtons = Array.from(
      shadowRoot.querySelectorAll('[data-inspecto-annotate-composer] button'),
    ).map(button => button.textContent)

    expect(shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')).toHaveLength(1)
    expect(shadowRoot.querySelectorAll('.inspecto-annotate-sidebar-queue-item')).toHaveLength(0)
    expect(composer.style.display).toBe('block')
    expect(composerButtons).toContain('Update note')
    expect(composerButtons).not.toContain('Save note')
  })

  it('preserves the previous saved record when switching between existing records in quick capture mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <button data-inspecto="/repo/App.tsx:20:2" id="second">Second</button>
    `

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    clickQuickCaptureToggle(shadowRoot)
    const clickTarget = (id: string) => {
      document
        .getElementById(id)!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }

    clickTarget('first')
    clickTarget('second')
    clickTarget('first')

    let note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Edited first'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    clickTarget('second')
    clickTarget('first')

    note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement

    expect(note.value).toBe('Edited first')
    expect(shadowRoot.querySelectorAll('.inspecto-annotate-sidebar-queue-item')).toHaveLength(1)
  })

  it('keeps saved quick capture records in display order when switching between existing records', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <button data-inspecto="/repo/App.tsx:20:2" id="second">Second</button>
      <button data-inspecto="/repo/App.tsx:30:2" id="third">Third</button>
    `

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    clickQuickCaptureToggle(shadowRoot)
    const clickTarget = (id: string) => {
      document
        .getElementById(id)!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }

    clickTarget('first')
    clickTarget('second')
    clickTarget('third')
    clickTarget('first')

    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Edited first'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    clickTarget('second')
    await Promise.resolve()

    const queueItems = Array.from(
      shadowRoot.querySelectorAll('.inspecto-annotate-sidebar-queue-item'),
    ).map(node => node.textContent ?? '')

    expect(queueItems).toHaveLength(2)
    expect(queueItems[0]).toContain('Edited first')
  })

  it('resets quick capture state when configure switches out of annotate mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    const inspector = (await mountInspector({ defaultActive: true, mode: 'annotate' })) as any
    inspector.annotateQuickCaptureEnabled = true
    inspector.annotateCapturePaused = true

    inspector.configure({ defaultActive: true, mode: 'inspect' })

    expect(inspector.getMode()).toBe('inspect')
    expect(inspector.annotateQuickCaptureEnabled).toBe(false)
    expect(inspector.annotateCapturePaused).toBe(false)
  })

  it('does not restore the previous saved record when switching records in normal annotate mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <button data-inspecto="/repo/App.tsx:20:2" id="second">Second</button>
    `

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const clickTarget = (id: string) => {
      document
        .getElementById(id)!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }
    const saveCurrentRecord = async (noteText: string) => {
      const note = shadowRoot.querySelector(
        '[data-inspecto-annotate-composer] textarea',
      ) as HTMLTextAreaElement
      note.value = noteText
      note.dispatchEvent(new Event('input', { bubbles: true }))
      const add = Array.from(
        shadowRoot.querySelectorAll('[data-inspecto-annotate-composer] button'),
      ).find(button => button.textContent === 'Save note') as HTMLButtonElement
      add.click()
      await Promise.resolve()
    }

    clickTarget('first')
    await saveCurrentRecord('Saved first')
    clickTarget('second')
    await saveCurrentRecord('Saved second')

    let savedBoxes = shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')
    ;(
      Array.from(savedBoxes).find(
        box => box.querySelector('[data-inspecto-annotate-overlay-order]')?.textContent === '1',
      ) as HTMLElement
    ).click()
    await Promise.resolve()

    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Edited first'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    savedBoxes = shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')
    ;(
      Array.from(savedBoxes).find(
        box => box.querySelector('[data-inspecto-annotate-overlay-order]')?.textContent === '2',
      ) as HTMLElement
    ).click()
    await Promise.resolve()

    const orders = Array.from(
      shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-order]'),
    ).map(node => node.textContent)
    expect(orders).toEqual(['2'])
    expect(note.value).toBe('Saved second')
  })

  it('preserves chip labels in the raw prompt preview instruction text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <h2 data-inspecto="/repo/App.tsx:10:2" id="first">Title</h2>
    `

    const inspector = await mountInspector({ defaultActive: true, mode: 'annotate' })
    inspector.setMode?.('annotate')

    document
      .getElementById('first')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const instructionInput = shadowRoot.querySelector(
      '.inspecto-annotate-sidebar [contenteditable="true"]',
    ) as HTMLDivElement
    const chips = Array.from(
      instructionInput.querySelectorAll('[data-annotate-chip-id]'),
    ) as HTMLElement[]

    expect(chips).toHaveLength(1)
    const chipLabel = (chips[0]!.querySelector('[data-annotate-chip-label]') as HTMLElement)
      .textContent

    instructionInput.replaceChildren(
      document.createTextNode('解释组件 '),
      chips[0]!,
      document.createTextNode(' 的关系'),
    )
    instructionInput.dispatchEvent(new Event('input', { bubbles: true }))

    const previewButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.getAttribute('title') === 'View raw prompt payload',
    )
    previewButton?.click()

    const preview = shadowRoot.querySelector(
      '[data-inspecto-annotate-raw-preview="true"]',
    ) as HTMLElement

    expect(preview.textContent).toContain(`解释组件 ${chipLabel} 的关系`)
  })
  it('preserves unsaved draft notes per target when switching between targets', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <button data-inspecto="/repo/App.tsx:20:2" id="second">Second</button>
    `

    const _inspector = (await mountInspector({
      defaultActive: true,
      mode: 'annotate',
      runtimeContext: { enabled: true, preview: true },
    })) as any
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    const clickTarget = (id: string) => {
      document
        .getElementById(id)!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }

    clickTarget('first')

    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Draft for first'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    clickTarget('second')
    expect(note.value).toBe('')

    note.value = 'Draft for second'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    clickTarget('first')
    expect(note.value).toBe('Draft for first')

    clickTarget('second')
    expect(note.value).toBe('Draft for second')
  })

  it('restores normal page interaction while annotate capture is paused', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const pauseButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.getAttribute('aria-label') === 'Pause selection',
    ) as HTMLButtonElement

    pauseButton.click()

    const target = document.getElementById('target')!
    const clickSpy = vi.fn()
    target.addEventListener('click', clickSpy)

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    expect(target.dispatchEvent(clickEvent)).toBe(true)
    expect(clickEvent.defaultPrevented).toBe(false)
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('keeps runtime capture during annotate pause but detaches it when Inspecto is globally paused', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    const inspector = (await mountInspector({
      defaultActive: true,
      mode: 'annotate',
      runtimeContext: { enabled: true },
    })) as any
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'before annotate pause',
        filename: '/repo/App.tsx',
      }),
    )
    expect(inspector.runtimeContextCollector.snapshot().records).toHaveLength(1)

    const annotateSidebar = shadowRoot.querySelector('.inspecto-annotate-sidebar') as HTMLElement
    const annotatePauseButton = Array.from(annotateSidebar.querySelectorAll('button')).find(
      button => button.getAttribute('aria-label') === 'Pause selection',
    ) as HTMLButtonElement
    annotatePauseButton.click()

    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'during annotate pause',
        filename: '/repo/App.tsx',
      }),
    )
    expect(inspector.runtimeContextCollector.snapshot().records).toHaveLength(2)

    const launcher = shadowRoot.querySelector('.inspecto-badge') as HTMLDivElement
    launcher.click()
    const globalPauseButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="pause"]',
    ) as HTMLButtonElement
    globalPauseButton.click()

    expect(inspector.runtimeContextCollector.snapshot().records).toHaveLength(0)

    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'after global pause',
        filename: '/repo/App.tsx',
      }),
    )
    expect(inspector.runtimeContextCollector.snapshot().records).toHaveLength(0)
  })

  it('opens a launcher panel before showing inspect and annotate mode actions', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    await mountInspector({ defaultActive: false })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const launcher = shadowRoot.querySelector('.inspecto-badge') as HTMLDivElement
    const panel = shadowRoot.querySelector('[data-inspecto-launcher-panel]') as HTMLDivElement

    expect(panel.style.display).toBe('none')
    launcher.click()
    expect(panel.style.display).toBe('flex')
    expect(panel.textContent).toContain('Choose a mode')
    expect(panel.textContent).toContain('Your next page click will follow this mode.')
    expect(panel.textContent).toContain('Click one component to inspect or ask AI')
    expect(panel.textContent).toContain(
      'Capture notes across components, then create a task or ask once',
    )

    const annotateButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="annotate"]',
    ) as HTMLButtonElement
    annotateButton.click()

    expect(panel.style.display).toBe('none')
    expect(shadowRoot.textContent).not.toContain('Open in Editor')
  })

  it('hides inspect mode when MCP annotate is configured without an IDE connection', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      configResponse({
        annotateChannel: 'mcp',
        ideConnected: false,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const inspector = (await mountInspector({ defaultActive: false })) as any
    await inspector.configLoadPromise
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const launcher = shadowRoot.querySelector('.inspecto-badge') as HTMLDivElement

    launcher.click()

    const inspectButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="inspect"]',
    ) as HTMLButtonElement
    const annotateButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="annotate"]',
    ) as HTMLButtonElement

    expect(inspectButton.style.display).toBe('none')
    expect(annotateButton.style.display).toBe('inline-flex')
    expect(shadowRoot.textContent).toContain('Inspect needs an IDE connection in MCP mode.')
  })

  it('keeps inspect mode visible when MCP annotate is configured with an IDE connection', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      configResponse({
        annotateChannel: 'mcp',
        ideConnected: true,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const inspector = (await mountInspector({ defaultActive: false })) as any
    await inspector.configLoadPromise
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const launcher = shadowRoot.querySelector('.inspecto-badge') as HTMLDivElement

    launcher.click()

    const inspectButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="inspect"]',
    ) as HTMLButtonElement
    const annotateButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="annotate"]',
    ) as HTMLButtonElement

    expect(inspectButton.style.display).toBe('inline-flex')
    expect(annotateButton.style.display).toBe('inline-flex')
    expect(shadowRoot.textContent).not.toContain('Inspect needs an IDE connection in MCP mode.')
    expect(shadowRoot.textContent).not.toContain(
      'Inspect is hidden because IDE integration is disabled.',
    )
  })

  it('hides inspect mode when IDE integration is disabled explicitly', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      configResponse({
        ide: 'none',
        annotateChannel: 'ide',
        ideConnected: true,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const inspector = (await mountInspector({ defaultActive: false })) as any
    await inspector.configLoadPromise
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const launcher = shadowRoot.querySelector('.inspecto-badge') as HTMLDivElement

    launcher.click()

    const inspectButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="inspect"]',
    ) as HTMLButtonElement
    const annotateButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="annotate"]',
    ) as HTMLButtonElement

    expect(inspectButton.style.display).toBe('none')
    expect(annotateButton.style.display).toBe('inline-flex')
    expect(shadowRoot.textContent).toContain(
      'Inspect is hidden because IDE integration is disabled.',
    )
  })

  it('falls back to annotate mode when inspect mode becomes unavailable', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      configResponse({
        annotateChannel: 'mcp',
        ideConnected: false,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const inspector = (await mountInspector({ defaultActive: true, mode: 'inspect' })) as any
    await inspector.configLoadPromise

    expect(inspector.getMode()).toBe('annotate')
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    expect(
      (shadowRoot.querySelector('[data-inspecto-launcher-state="true"]') as HTMLElement)
        .textContent,
    ).toBe('Annotate mode')
    expect(shadowRoot.querySelector('.inspecto-annotate-sidebar')).not.toBeNull()
  })

  it('does not restore inspect mode after resume when inspect becomes unavailable while paused', async () => {
    const configDeferred = createDeferred<Response>()
    const fetchMock = vi.fn().mockReturnValue(configDeferred.promise)
    vi.stubGlobal('fetch', fetchMock)

    const inspector = (await mountInspector({ defaultActive: true, mode: 'inspect' })) as any
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const launcher = shadowRoot.querySelector('.inspecto-badge') as HTMLDivElement

    launcher.click()
    const pauseButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="pause"]',
    ) as HTMLButtonElement
    pauseButton.click()

    configDeferred.resolve(
      configResponse({
        annotateChannel: 'mcp',
        ideConnected: false,
      }) as Response,
    )
    await inspector.configLoadPromise

    launcher.click()
    const resumeButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="pause"]',
    ) as HTMLButtonElement
    resumeButton.click()

    expect(inspector.getMode()).toBe('annotate')
    expect(
      (shadowRoot.querySelector('[data-inspecto-launcher-state="true"]') as HTMLElement)
        .textContent,
    ).toBe('Annotate mode')
  })

  it('restores the idle launcher state after pausing and resuming', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    await mountInspector({ defaultActive: false })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const launcher = shadowRoot.querySelector('.inspecto-badge') as HTMLDivElement

    launcher.click()
    const pauseButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="pause"]',
    ) as HTMLButtonElement
    pauseButton.click()

    launcher.click()
    const resumeButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="pause"]',
    ) as HTMLButtonElement
    const inspectButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="inspect"]',
    ) as HTMLButtonElement
    const annotateButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="annotate"]',
    ) as HTMLButtonElement

    expect(resumeButton.getAttribute('aria-label')).toBe('Resume selection')
    resumeButton.click()

    expect(inspectButton.getAttribute('aria-pressed')).toBe('false')
    expect(annotateButton.getAttribute('aria-pressed')).toBe('false')
    expect(
      (shadowRoot.querySelector('[data-inspecto-launcher-state="true"]') as HTMLElement)
        .textContent,
    ).toBe('Ready')
  })

  it('restores annotate mode after pausing and resuming from the launcher', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    await mountInspector({ defaultActive: false })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const launcher = shadowRoot.querySelector('.inspecto-badge') as HTMLDivElement

    launcher.click()
    const annotateButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="annotate"]',
    ) as HTMLButtonElement
    annotateButton.click()

    launcher.click()
    const pauseButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="pause"]',
    ) as HTMLButtonElement
    pauseButton.click()

    launcher.click()
    const resumeButton = shadowRoot.querySelector(
      '[data-inspecto-launcher-action="pause"]',
    ) as HTMLButtonElement
    resumeButton.click()

    expect(annotateButton.getAttribute('aria-pressed')).toBe('true')
    expect(
      (shadowRoot.querySelector('[data-inspecto-launcher-state="true"]') as HTMLElement)
        .textContent,
    ).toBe('Annotate mode')
  })

  it('sends the current record as a single annotation transport', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    const inspector = (await mountInspector({ defaultActive: true, mode: 'annotate' })) as any
    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    inspector.runtimeContextCollector.recordError({
      message: 'boom',
      stack: 'at App (/repo/App.tsx:10:2)',
      timestamp: Date.now(),
    })
    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Tighten the target spacing.'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    const add = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Save note',
    ) as HTMLButtonElement
    add.click()
    await Promise.resolve()

    expect(shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')).toHaveLength(1)
    const composer = shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement
    expect(composer.style.display).toBe('none')

    const sendBatch = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Ask AI',
    ) as HTMLButtonElement
    sendBatch.click()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    const req = JSON.parse(fetchMock.mock.calls[1]![1].body as string) as SendAnnotationsToAiRequest
    expect(req.instruction).toBe('')
    expect(req.annotations).toHaveLength(1)
    expect(req.annotations[0]).toMatchObject({
      note: 'Tighten the target spacing.',
      intent: 'review',
      targets: [{ label: 'button#target' }],
    })
  })

  it('keeps the runtime toggle session-scoped in annotate and exposes it only in the sidebar', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(configResponse({ runtimeContext: { enabled: true, preview: true } }))
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const runtimeError = new Error('boom')
    runtimeError.stack = 'Error: boom\n    at App (/repo/App.tsx:10:2)'
    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'boom',
        filename: '/repo/App.tsx',
        error: runtimeError,
      }),
    )
    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const sidebarToggle = shadowRoot.querySelector(
      '.inspecto-annotate-sidebar button[aria-label="Attach runtime context"]',
    ) as HTMLButtonElement
    const composerToggle = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] button[aria-label="Attach runtime context"]',
    ) as HTMLButtonElement | null

    expect(sidebarToggle.getAttribute('aria-pressed')).toBe('false')
    expect(composerToggle?.style.display).toBe('none')
    expect(sidebarToggle.getAttribute('data-visual-state')).toBe('inactive')

    sidebarToggle.click()
    await Promise.resolve()
    expect(sidebarToggle.getAttribute('aria-pressed')).toBe('true')
    expect(sidebarToggle.getAttribute('data-visual-state')).toBe('active')
  })

  it('keeps CSS toggle scoped to the current element prompt only', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<div><h2 data-inspecto="/repo/App.tsx:10:2" id="first" style="display:flex;color: rgb(255, 0, 0);">Heading</h2><li data-inspecto="/repo/App.tsx:14:2" id="second" style="display:list-item;color: rgb(0, 0, 255);">Item</li></div>'

    const inspector = await mountInspector({ defaultActive: true, mode: 'annotate' })
    document
      .getElementById('first')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const sidebarToggle = shadowRoot.querySelector(
      '.inspecto-annotate-sidebar button[aria-label="Attach CSS context"]',
    ) as HTMLButtonElement | null
    let composerToggle = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] button[aria-label="Attach CSS context"]',
    ) as HTMLButtonElement

    expect(sidebarToggle?.style.display).toBe('none')
    expect(composerToggle.getAttribute('aria-pressed')).toBe('false')
    expect(composerToggle.getAttribute('data-visual-state')).toBe('inactive')

    composerToggle.click()
    expect(composerToggle.getAttribute('aria-pressed')).toBe('true')
    expect(composerToggle.getAttribute('data-visual-state')).toBe('active')
    expect(composerToggle.title).toBe('CSS context enabled')

    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Review the heading.'
    note.dispatchEvent(new Event('input', { bubbles: true }))
    ;(
      Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Save note',
      ) as HTMLButtonElement
    ).click()
    await Promise.resolve()

    document
      .getElementById('second')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    const secondNote = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    secondNote.value = 'Review the item.'
    secondNote.dispatchEvent(new Event('input', { bubbles: true }))

    const previewButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.getAttribute('title') === 'View raw prompt payload',
    )
    previewButton?.click()

    const preview = shadowRoot.querySelector(
      '[data-inspecto-annotate-raw-preview="true"]',
    ) as HTMLElement
    expect(preview.textContent).toContain('Relevant CSS context:')
    expect(preview.textContent).toContain('computed: display=flex')
    expect(preview.textContent).not.toContain('computed: display=list-item')

    const exitButton = shadowRoot.querySelector(
      '.inspecto-annotate-sidebar button[aria-label="Exit annotate mode"]',
    ) as HTMLButtonElement
    exitButton.click()

    inspector.setMode?.('annotate')
    document
      .getElementById('second')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    composerToggle = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] button[aria-label="Attach CSS context"]',
    ) as HTMLButtonElement
    expect(composerToggle.getAttribute('aria-pressed')).toBe('false')
  })

  it('keeps the runtime bug icon state intact in annotate mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      configResponse({
        runtimeContext: { enabled: true, preview: true },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    const inspector = (await mountInspector({
      defaultActive: true,
      mode: 'annotate',
      runtimeContext: { enabled: true },
    })) as any
    inspector.runtimeContextCollector.recordError({
      message: 'boom',
      stack: 'at App (/repo/App.tsx:10:2)',
      timestamp: Date.now(),
    })

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const runtimeToggle = shadowRoot.querySelector(
      '.inspecto-annotate-sidebar button[aria-label="Attach runtime context"]',
    ) as HTMLButtonElement
    const badge = runtimeToggle.querySelector('[data-runtime-error-badge]') as HTMLElement

    runtimeToggle.click()
    expect(runtimeToggle.getAttribute('aria-pressed')).toBe('true')
    expect(runtimeToggle.getAttribute('data-visual-state')).toBe('active')
    expect(badge.hidden).toBe(false)
    expect(runtimeToggle.getAttribute('aria-pressed')).toBe('true')
    expect(runtimeToggle.getAttribute('data-visual-state')).toBe('active')
    expect(badge.hidden).toBe(false)
  })

  it('includes runtime context in annotate sends only while the session toggle is enabled', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse({ runtimeContext: { enabled: true, preview: true } }))
      .mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    const inspector = (await mountInspector({ defaultActive: true, mode: 'annotate' })) as any
    inspector.runtimeContextCollector.recordError({
      message: 'boom',
      stack: 'at App (/repo/App.tsx:10:2)',
      timestamp: Date.now(),
    })

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Tighten the target spacing.'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    const add = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Save note',
    ) as HTMLButtonElement
    add.click()
    await Promise.resolve()

    const sendAll = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Ask AI',
    ) as HTMLButtonElement
    sendAll.click()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    let req = JSON.parse(fetchMock.mock.calls[1]![1].body as string) as SendAnnotationsToAiRequest
    expect(req.runtimeContext).toBeUndefined()

    const sidebarToggle = shadowRoot.querySelector(
      '.inspecto-annotate-sidebar button[aria-label="Attach runtime context"]',
    ) as HTMLButtonElement
    sidebarToggle.click()

    fetchMock.mockClear()
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    const noteAgain = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    noteAgain.value = 'Tighten the target spacing.'
    noteAgain.dispatchEvent(new Event('input', { bubbles: true }))
    const addAgain = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Save note',
    ) as HTMLButtonElement
    addAgain.click()
    await Promise.resolve()

    const sendAllAgain = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Ask AI',
    ) as HTMLButtonElement
    sendAllAgain.click()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    req = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as SendAnnotationsToAiRequest
    expect(req.runtimeContext?.records).toHaveLength(1)
    expect(req.runtimeContext?.records[0]?.message).toBe('boom')
  })

  it('includes CSS context in annotate sends only while the record toggle is enabled', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target" style="display:flex;color: rgb(255, 0, 0);">Target</button>'

    const inspector = await mountInspector({ defaultActive: true, mode: 'annotate' })
    inspector.setMode?.('annotate')

    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    const addRecord = async (noteText: string, enableCss = false) => {
      document
        .getElementById('target')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      await Promise.resolve()

      if (enableCss) {
        const cssToggle = shadowRoot.querySelector(
          '[data-inspecto-annotate-composer] button[aria-label="Attach CSS context"]',
        ) as HTMLButtonElement
        cssToggle.click()
      }

      const note = shadowRoot.querySelector(
        '[data-inspecto-annotate-composer] textarea',
      ) as HTMLTextAreaElement
      note.value = noteText
      note.dispatchEvent(new Event('input', { bubbles: true }))
      ;(
        Array.from(shadowRoot.querySelectorAll('button')).find(
          button => button.textContent === 'Save note',
        ) as HTMLButtonElement
      ).click()
      await Promise.resolve()
    }

    await addRecord('Inspect the layout styling.')
    ;(
      Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Ask AI',
      ) as HTMLButtonElement
    ).click()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    let req = JSON.parse(fetchMock.mock.calls[1]![1].body as string) as SendAnnotationsToAiRequest
    expect(req.cssContextPrompt).toBeUndefined()

    fetchMock.mockClear()
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })

    await addRecord('Inspect the layout styling again.', true)
    ;(
      Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Ask AI',
      ) as HTMLButtonElement
    ).click()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    req = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as SendAnnotationsToAiRequest
    expect(req.cssContextPrompt).toContain('Relevant CSS context:')
    expect(req.cssContextPrompt).toContain('display=flex')
  })

  it('builds a minimal single-selection prompt from the selected element', () => {
    const prompt = buildAnnotateFullPrompt({
      instruction: 'Review li spacing here.',
      annotations: [
        {
          note: 'Tighten spacing.',
          intent: 'review',
          targets: [
            {
              label: 'li',
              selector: '.nav-item',
              location: { file: '/repo/App.tsx', line: 10, column: 2 },
            },
          ],
        },
      ],
    })

    expect(prompt).toContain('Review li spacing here.')
    expect(prompt).toContain('Selected elements:')
    expect(prompt).toContain('- li')
    expect(prompt).toContain('file=/repo/App.tsx:10:2')
    expect(prompt).toContain('note=Tighten spacing.')
    expect(prompt).not.toContain('selector=.nav-item')
    expect(prompt).not.toContain('- li | App.tsx:10:2 | note=Tighten spacing.')
    expect(prompt).not.toContain('You are reviewing a UI with multiple related annotations.')
    expect(prompt).not.toContain('Response mode:')
  })

  it('builds a minimal multi-selection prompt by listing each selected element', () => {
    const prompt = buildAnnotateFullPrompt({
      instruction: 'Compare li and li.',
      annotations: [
        {
          note: 'Check icon alignment.',
          intent: 'review',
          targets: [
            {
              label: 'li',
              selector: '.nav-item:first-child',
              location: { file: '/repo/App.tsx', line: 10, column: 2 },
            },
            {
              label: 'li',
              selector: '.nav-item:last-child',
              location: { file: '/repo/App.tsx', line: 14, column: 2 },
            },
          ],
        },
      ],
    })

    expect(prompt).toContain('Compare li and li.')
    expect(prompt).toContain('Selected elements:')
    expect(prompt).toContain('- li\nfile=/repo/App.tsx:10:2\nnote=Check icon alignment.')
    expect(prompt).toContain('- li\nfile=/repo/App.tsx:14:2\nnote=Check icon alignment.')
    expect(prompt).not.toContain('selector=.nav-item:first-child')
    expect(prompt).not.toContain('selector=.nav-item:last-child')
    expect(prompt).not.toContain('- li | App.tsx:10:2 | note=Check icon alignment.')
    expect(prompt).not.toContain('- li | App.tsx:14:2 | note=Check icon alignment.')
    expect(prompt).not.toContain('Page Feedback:')
    expect(prompt).not.toContain('Annotations:')
  })

  it('uses concise tag labels and basename locations for mixed targets', () => {
    const prompt = buildAnnotateFullPrompt({
      instruction: 'Compare li with button.badge and Unknown target.',
      annotations: [
        {
          note: 'Check hierarchy.',
          intent: 'review',
          targets: [
            {
              label: 'li',
              selector: '.item',
              location: { file: '/repo/App.tsx', line: 10, column: 2 },
            },
            {
              label: 'button.badge',
              selector: '.cta .badge',
              location: { file: '/repo/App.tsx', line: 18, column: 4 },
            },
            {
              location: { file: '/repo/App.tsx', line: 24, column: 6 },
            },
          ],
        },
      ],
    })

    expect(prompt).toContain('Compare li with button.badge and Unknown target.')
    expect(prompt).toContain('- li\nfile=/repo/App.tsx:10:2\nnote=Check hierarchy.')
    expect(prompt).toContain('- button.badge\nfile=/repo/App.tsx:18:4\nnote=Check hierarchy.')
    expect(prompt).toContain('- Unknown target\nfile=/repo/App.tsx:24:6\nnote=Check hierarchy.')
    expect(prompt).not.toContain('selector=.item')
    expect(prompt).not.toContain('selector=.cta .badge')
    expect(prompt).not.toContain('- button.badge | App.tsx:18:4 | note=Check hierarchy.')
  })

  it('resets the annotate runtime toggle after exiting and re-entering annotate mode', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(configResponse({ runtimeContext: { enabled: true, preview: true } }))
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    const inspector = await mountInspector({ defaultActive: true, mode: 'annotate' })
    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    let sidebarToggle = shadowRoot.querySelector(
      '.inspecto-annotate-sidebar button[aria-label="Attach runtime context"]',
    ) as HTMLButtonElement
    sidebarToggle.click()
    expect(sidebarToggle.getAttribute('aria-pressed')).toBe('true')

    const exitButton = shadowRoot.querySelector(
      '.inspecto-annotate-sidebar button[aria-label="Exit annotate mode"]',
    ) as HTMLButtonElement
    exitButton.click()

    inspector.setMode?.('annotate')
    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    sidebarToggle = shadowRoot.querySelector(
      '.inspecto-annotate-sidebar button[aria-label="Attach runtime context"]',
    ) as HTMLButtonElement
    expect(sidebarToggle.getAttribute('aria-pressed')).toBe('false')
  })

  it('continues collecting runtime errors while annotate capture is paused', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(configResponse({ runtimeContext: { enabled: true, preview: true } }))
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    const inspector = (await mountInspector({
      defaultActive: true,
      mode: 'annotate',
      runtimeContext: { enabled: true, preview: true },
    })) as any

    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    const annotateSidebar = shadowRoot.querySelector('.inspecto-annotate-sidebar') as HTMLElement
    const pauseButton = Array.from(annotateSidebar.querySelectorAll('button')).find(
      button => button.getAttribute('aria-label') === 'Pause selection',
    ) as HTMLButtonElement
    pauseButton.click()

    const runtimeError = new Error('paused boom')
    runtimeError.stack = 'Error: paused boom\n    at App (/repo/App.tsx:10:2)'
    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'paused boom',
        filename: '/repo/App.tsx',
        error: runtimeError,
      }),
    )

    expect(inspector.runtimeContextCollector.snapshot().records).toHaveLength(1)

    const resumeButton = Array.from(annotateSidebar.querySelectorAll('button')).find(
      button => button.getAttribute('aria-label') === 'Resume selection',
    ) as HTMLButtonElement
    resumeButton.click()

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    const sidebarToggle = shadowRoot.querySelector(
      '.inspecto-annotate-sidebar button[aria-label="Attach runtime context"]',
    ) as HTMLButtonElement
    sidebarToggle.click()

    expect(
      (sidebarToggle.querySelector('[data-runtime-error-badge]') as HTMLElement | null)?.hidden,
    ).toBe(false)
    expect(sidebarToggle.title).toContain('1 error')
  })

  it('sends saved records as one annotation per record', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <div data-inspecto="/repo/App.tsx:14:2" id="second"></div>
    `

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    const addRecord = async (id: string, noteText: string) => {
      document
        .getElementById(id)!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      const note = shadowRoot.querySelector(
        '[data-inspecto-annotate-composer] textarea',
      ) as HTMLTextAreaElement
      note.value = noteText
      note.dispatchEvent(new Event('input', { bubbles: true }))
      const add = Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Save note',
      ) as HTMLButtonElement
      add.click()
      await Promise.resolve()
    }

    await addRecord('first', 'Tighten button spacing.')
    await addRecord('second', 'Move helper text closer.')

    expect(shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')).toHaveLength(2)

    const sendRecords = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Ask AI',
    ) as HTMLButtonElement
    sendRecords.click()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    const req = JSON.parse(fetchMock.mock.calls[1]![1].body as string) as SendAnnotationsToAiRequest
    expect(req.instruction).toBe('')
    expect(req.annotations).toHaveLength(2)
    expect(req.annotations.map(annotation => annotation.note)).toEqual([
      'Tighten button spacing.',
      'Move helper text closer.',
    ])
  })

  it('includes empty-note quick capture records when sending saved annotations', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <button data-inspecto="/repo/App.tsx:20:2" id="second">Second</button>
    `

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    clickQuickCaptureToggle(shadowRoot)

    document
      .getElementById('first')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    document
      .getElementById('second')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')).toHaveLength(2)
    expect(
      shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement,
    ).toHaveProperty('style.display', 'none')

    const sendRecords = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Ask AI',
    ) as HTMLButtonElement
    sendRecords.click()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    const req = JSON.parse(fetchMock.mock.calls[1]![1].body as string) as SendAnnotationsToAiRequest
    expect(req.annotations).toHaveLength(2)
    expect(req.annotations.map(annotation => annotation.note)).toEqual(['', ''])
    expect(req.annotations.map(annotation => annotation.targets[0]?.location.line)).toEqual([
      10, 20,
    ])
  })

  it('keeps the first saved pin visible when starting a second record', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <div data-inspecto="/repo/App.tsx:14:2" id="second"></div>
    `

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    const addRecord = async (id: string, noteText: string) => {
      document
        .getElementById(id)!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      const note = shadowRoot.querySelector(
        '[data-inspecto-annotate-composer] textarea',
      ) as HTMLTextAreaElement
      note.value = noteText
      note.dispatchEvent(new Event('input', { bubbles: true }))
      const add = Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Save note',
      ) as HTMLButtonElement
      add.click()
      await Promise.resolve()
    }

    await addRecord('first', 'Tighten button spacing.')

    document
      .getElementById('second')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const orders = Array.from(
      shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-order]'),
    ).map(node => node.textContent)

    expect(orders).toEqual(['1', '2'])
    expect(shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shows a saved note as a visible overlay badge without requiring hover', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = '<button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('first')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Tighten button spacing.'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    const add = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Save note',
    ) as HTMLButtonElement
    add.click()
    await Promise.resolve()

    const noteBadge = shadowRoot.querySelector(
      '[data-inspecto-annotate-overlay-note]',
    ) as HTMLElement | null

    expect(noteBadge).not.toBeNull()
    expect(noteBadge?.textContent).toBe('Tighten button spacing.')
  })

  it('keeps both saved pins visible after saving a second record', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <button data-inspecto="/repo/App.tsx:14:2" id="second">Second</button>
    `

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    const addRecord = async (id: string, noteText: string) => {
      document
        .getElementById(id)!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      const note = shadowRoot.querySelector(
        '[data-inspecto-annotate-composer] textarea',
      ) as HTMLTextAreaElement
      note.value = noteText
      note.dispatchEvent(new Event('input', { bubbles: true }))
      const add = Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Save note',
      ) as HTMLButtonElement
      add.click()
      await Promise.resolve()
    }

    await addRecord('first', 'test1')
    await addRecord('second', 'test2')

    const orders = Array.from(
      shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-order]'),
    ).map(node => node.textContent)
    const composer = shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement

    expect(orders).toEqual(['1', '2'])
    expect(shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')).toHaveLength(2)
    expect(composer.style.display).toBe('none')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reopens a saved record in the composer when its pin is clicked', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    let note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Saved note'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    const add = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Save note',
    ) as HTMLButtonElement
    add.click()
    await Promise.resolve()

    const savedBox = shadowRoot.querySelector('[data-inspecto-annotate-overlay-box]') as HTMLElement
    savedBox.click()
    await Promise.resolve()

    note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    expect(note.value).toBe('Saved note')
    expect(
      (shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement).style.display,
    ).toBe('block')
    const composerButtons = Array.from(
      shadowRoot.querySelectorAll('[data-inspecto-annotate-composer] button'),
    ).map(button => button.textContent)
    expect(composerButtons).toContain('Update note')
    expect(composerButtons).not.toContain('Save note')
  })

  it('keeps the selected pin visible after saving changes from the composer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    let note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Saved note'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    const add = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Save note',
    ) as HTMLButtonElement
    add.click()
    await Promise.resolve()

    let boxes = shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')
    expect(boxes).toHaveLength(1)

    const savedBox = boxes[0] as HTMLElement
    savedBox.click()
    await Promise.resolve()

    note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Updated note'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    const saveChanges = Array.from(
      shadowRoot.querySelectorAll('[data-inspecto-annotate-composer] button'),
    ).find(button => button.textContent === 'Update note') as HTMLButtonElement
    saveChanges.click()
    await Promise.resolve()

    boxes = shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')
    expect(boxes).toHaveLength(1)
    expect(
      shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement,
    ).toHaveProperty('style.display', 'none')
  })

  it('does not renumber saved pins when reopening one in the composer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <button data-inspecto="/repo/App.tsx:20:2" id="second">Second</button>
    `

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    const addRecord = async (id: string, noteText: string) => {
      document
        .getElementById(id)!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      const note = shadowRoot.querySelector(
        '[data-inspecto-annotate-composer] textarea',
      ) as HTMLTextAreaElement
      note.value = noteText
      note.dispatchEvent(new Event('input', { bubbles: true }))
      const add = Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Save note',
      ) as HTMLButtonElement
      add.click()
      await Promise.resolve()
    }

    await addRecord('first', 'test1')
    await addRecord('second', 'test2')

    let orders = Array.from(
      shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-order]'),
    ).map(node => node.textContent)
    expect(orders).toEqual(['1', '2'])

    const savedBoxes = shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')
    ;(savedBoxes[0] as HTMLElement).click()
    await Promise.resolve()

    orders = Array.from(shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-order]')).map(
      node => node.textContent,
    )
    expect(orders).toEqual(['1', '2'])
  })

  it('does not renumber saved pins after saving changes to an existing record', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <button data-inspecto="/repo/App.tsx:20:2" id="second">Second</button>
    `

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    const addRecord = async (id: string, noteText: string) => {
      document
        .getElementById(id)!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      const note = shadowRoot.querySelector(
        '[data-inspecto-annotate-composer] textarea',
      ) as HTMLTextAreaElement
      note.value = noteText
      note.dispatchEvent(new Event('input', { bubbles: true }))
      const add = Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Save note',
      ) as HTMLButtonElement
      add.click()
      await Promise.resolve()
    }

    await addRecord('first', 'test1')
    await addRecord('second', 'test2')

    const savedBoxes = shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')
    ;(savedBoxes[0] as HTMLElement).click()
    await Promise.resolve()

    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'test1 updated'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    const save = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Update note',
    ) as HTMLButtonElement
    save.click()
    await Promise.resolve()

    const orders = Array.from(
      shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-order]'),
    ).map(node => node.textContent)
    expect(orders).toEqual(['1', '2'])
  })

  it('repositions an edited saved pin composer using the target viewport rect after scrolling', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('requestAnimationFrame', ((cb: FrameRequestCallback) => {
      return window.setTimeout(() => cb(performance.now()), 0)
    }) as typeof requestAnimationFrame)
    vi.stubGlobal('cancelAnimationFrame', ((id: number) => {
      window.clearTimeout(id)
    }) as typeof cancelAnimationFrame)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <button data-inspecto="/repo/App.tsx:20:2" id="second">Second</button>
    `

    const first = document.getElementById('first') as HTMLButtonElement
    const second = document.getElementById('second') as HTMLButtonElement

    first.getBoundingClientRect = () =>
      ({
        x: 40,
        y: 80,
        left: 40,
        top: 80,
        width: 120,
        height: 36,
        right: 160,
        bottom: 116,
        toJSON: () => {},
      }) as DOMRect

    second.getBoundingClientRect = () =>
      ({
        x: 320,
        y: 260,
        left: 320,
        top: 260,
        width: 180,
        height: 36,
        right: 500,
        bottom: 296,
        toJSON: () => {},
      }) as DOMRect

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    const addRecord = async (button: HTMLElement, text: string) => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      const note = shadowRoot.querySelector(
        '[data-inspecto-annotate-composer] textarea',
      ) as HTMLTextAreaElement
      note.value = text
      note.dispatchEvent(new Event('input', { bubbles: true }))
      const add = Array.from(
        shadowRoot.querySelectorAll('[data-inspecto-annotate-composer] button'),
      ).find(button => button.textContent === 'Save note') as HTMLButtonElement
      add.click()
      await Promise.resolve()
    }

    await addRecord(first, 'First note')
    await addRecord(second, 'Second note')

    document.dispatchEvent(new Event('scroll'))
    await vi.runAllTimersAsync()

    const savedBoxes = shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')
    ;(savedBoxes[1] as HTMLElement).click()
    await Promise.resolve()

    const composer = shadowRoot.querySelector('[data-inspecto-annotate-composer]') as HTMLElement
    expect(composer.style.left).toBe('240px')
    expect(composer.style.top).toBe('310px')
  })

  it('deletes a saved record from the composer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Saved note'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    const add = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Save note',
    ) as HTMLButtonElement
    add.click()
    await Promise.resolve()

    const savedBox = shadowRoot.querySelector('[data-inspecto-annotate-overlay-box]') as HTMLElement
    savedBox.click()
    await Promise.resolve()

    const deleteButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Delete',
    ) as HTMLButtonElement | undefined

    expect(deleteButton).toBeDefined()
    deleteButton!.click()
    await Promise.resolve()

    expect(shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')).toHaveLength(0)
    expect(shadowRoot.textContent).not.toContain('Saved note')
  })

  it('keeps saved pins anchored to distinct elements when selectors collide', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2">First</button>
      <button data-inspecto="/repo/App.tsx:14:2">Second</button>
    `

    const buttons = Array.from(document.querySelectorAll('button'))
    buttons[0]!.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        width: 100,
        height: 30,
        right: 110,
        bottom: 50,
        toJSON: () => {},
      }) as DOMRect
    buttons[1]!.getBoundingClientRect = () =>
      ({
        x: 180,
        y: 20,
        left: 180,
        top: 20,
        width: 100,
        height: 30,
        right: 280,
        bottom: 50,
        toJSON: () => {},
      }) as DOMRect

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    const addRecord = async (button: Element, noteText: string) => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      const note = shadowRoot.querySelector(
        '[data-inspecto-annotate-composer] textarea',
      ) as HTMLTextAreaElement
      note.value = noteText
      note.dispatchEvent(new Event('input', { bubbles: true }))
      const add = Array.from(shadowRoot.querySelectorAll('button')).find(
        candidate => candidate.textContent === 'Save note',
      ) as HTMLButtonElement
      add.click()
      await Promise.resolve()
    }

    await addRecord(buttons[0]!, 'test1')
    await addRecord(buttons[1]!, 'test2')

    const boxes = Array.from(
      shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]'),
    ) as HTMLElement[]

    expect(boxes).toHaveLength(2)
    expect(boxes.map(box => box.style.left)).toEqual(['10px', '180px'])
  })

  it('keeps saved pins anchored to distinct elements when both location and tag collide', async () => {
    const fetchMock = vi.fn().mockResolvedValue(configResponse())
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <div id="root">
        <button data-inspecto="/repo/App.tsx:10:2">First</button>
        <button data-inspecto="/repo/App.tsx:10:2">Second</button>
      </div>
    `

    const buttons = Array.from(document.querySelectorAll('button'))
    buttons[0]!.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        width: 100,
        height: 30,
        right: 110,
        bottom: 50,
        toJSON: () => {},
      }) as DOMRect
    buttons[1]!.getBoundingClientRect = () =>
      ({
        x: 180,
        y: 20,
        left: 180,
        top: 20,
        width: 100,
        height: 30,
        right: 280,
        bottom: 50,
        toJSON: () => {},
      }) as DOMRect

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    const addRecord = async (button: Element, noteText: string) => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      const note = shadowRoot.querySelector(
        '[data-inspecto-annotate-composer] textarea',
      ) as HTMLTextAreaElement
      note.value = noteText
      note.dispatchEvent(new Event('input', { bubbles: true }))
      const add = Array.from(shadowRoot.querySelectorAll('button')).find(
        candidate => candidate.textContent === 'Save note',
      ) as HTMLButtonElement
      add.click()
      await Promise.resolve()
    }

    await addRecord(buttons[0]!, 'test1')
    await addRecord(buttons[1]!, 'test2')

    const boxes = Array.from(
      shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]'),
    ) as HTMLElement[]

    expect(boxes).toHaveLength(2)
    expect(boxes.map(box => box.style.left)).toEqual(['10px', '180px'])
  })

  it('sends the current annotate batch through a single Ask AI action', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <div data-inspecto="/repo/App.tsx:14:2" id="second"></div>
    `

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    const addRecord = async (id: string, noteText: string) => {
      document
        .getElementById(id)!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      const note = shadowRoot.querySelector(
        '[data-inspecto-annotate-composer] textarea',
      ) as HTMLTextAreaElement
      note.value = noteText
      note.dispatchEvent(new Event('input', { bubbles: true }))
      const add = Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Save note',
      ) as HTMLButtonElement
      add.click()
      await Promise.resolve()
    }

    await addRecord('first', 'Tighten button spacing.')
    await addRecord('second', 'Move helper text closer.')

    const sendBatch = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Ask AI',
    ) as HTMLButtonElement
    sendBatch.click()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    const req = JSON.parse(fetchMock.mock.calls[1]![1].body as string) as SendAnnotationsToAiRequest
    expect(req.instruction).toBe('')
    expect(req.annotations).toHaveLength(2)
    expect(req.annotations[0]?.note).toBe('Tighten button spacing.')
    expect(req.annotations[1]?.note).toBe('Move helper text closer.')
    expect(req.annotations[0]?.targets).toHaveLength(1)
    expect(req.annotations[1]?.targets).toHaveLength(1)
  })

  it('reopens an empty-note saved record from its pin', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(configResponse()))

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    const add = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Save note',
    ) as HTMLButtonElement
    add.click()
    await Promise.resolve()

    const savedPin = shadowRoot.querySelector('[data-inspecto-annotate-overlay-box]') as HTMLElement
    savedPin.click()
    await Promise.resolve()

    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    expect(note.value).toBe('')
    expect(
      Array.from(shadowRoot.querySelectorAll('button')).some(
        button => button.textContent === 'Update note',
      ),
    ).toBe(true)
  })

  it('sends records with empty notes in Ask AI flow', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <button data-inspecto="/repo/App.tsx:12:2" id="second">Second</button>
    `

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('first')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    ;(
      Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Save note',
      ) as HTMLButtonElement
    ).click()
    await Promise.resolve()

    document
      .getElementById('second')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Save note detail here.'
    note.dispatchEvent(new Event('input', { bubbles: true }))
    ;(
      Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Save note',
      ) as HTMLButtonElement
    ).click()
    await Promise.resolve()
    ;(
      Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Ask AI',
      ) as HTMLButtonElement
    ).click()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    const req = JSON.parse(fetchMock.mock.calls[1]![1].body as string) as SendAnnotationsToAiRequest
    expect(req.annotations).toHaveLength(2)
    expect(req.annotations[0]?.note).toBe('')
    expect(req.annotations[1]?.note).toBe('Save note detail here.')
  })

  it('sends the current draft through Ask AI without requiring a saved record first', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Compare this headline with the surrounding navigation.'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    const sendAll = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Ask AI',
    ) as HTMLButtonElement

    expect(sendAll.disabled).toBe(false)
    sendAll.click()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    const req = JSON.parse(fetchMock.mock.calls[1]![1].body as string) as SendAnnotationsToAiRequest
    expect(req.annotations).toHaveLength(1)
    expect(req.annotations[0]?.note).toBe('Compare this headline with the surrounding navigation.')
    expect(req.annotations[0]?.targets[0]?.location).toEqual({
      file: '/repo/App.tsx',
      line: 10,
      column: 2,
    })
  })

  it('creates an agent task from annotate mode when Create Task is used', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            instruction: '',
            annotations: [],
            messages: [],
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    const createTask = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Create Task',
    ) as HTMLButtonElement

    createTask.click()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    const req = JSON.parse(fetchMock.mock.calls[1]![1].body as string) as SendAnnotationsToAiRequest
    expect(req.deliveryMode).toBe('mcp')
    expect(req.annotations).toHaveLength(1)
  })

  it('preserves the annotate sidebar draft after Create Task succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: 100,
            updatedAt: 100,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: 100,
            updatedAt: 100,
            instruction: 'Preserve this task context.',
            annotations: [],
            messages: [],
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    const instructionInput = shadowRoot.querySelector(
      '[aria-label="Overall goal"]',
    ) as HTMLDivElement
    instructionInput.textContent = 'Preserve this task context.'
    instructionInput.dispatchEvent(new Event('input', { bubbles: true }))

    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Keep this selected component in the sidebar.'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    const createTask = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Create Task',
    ) as HTMLButtonElement

    createTask.click()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    const req = JSON.parse(fetchMock.mock.calls[1]![1].body as string) as SendAnnotationsToAiRequest
    expect(req.instruction).toBe('Preserve this task context.')
    expect(req.annotations[0]?.note).toBe('Keep this selected component in the sidebar.')

    const preservedInstruction = shadowRoot.querySelector(
      '[aria-label="Overall goal"]',
    ) as HTMLDivElement
    const preservedNote = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement

    expect(preservedInstruction.childNodes[0]?.textContent).toBe('Preserve this task context.')
    expect(preservedNote.value).toBe('Keep this selected component in the sidebar.')
    expect(shadowRoot.textContent).toContain('Task created from your notes.')
  })

  it('subscribes to live session updates after creating an agent task', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: 100,
            updatedAt: 100,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: 100,
            updatedAt: 100,
            instruction: '',
            annotations: [],
            messages: [],
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    const createTask = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Create Task',
    ) as HTMLButtonElement

    createTask.click()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(FakeEventSource.instances).toHaveLength(1)
    expect(FakeEventSource.instances[0]?.url).toBe(
      'http://0.0.0.0:5678/inspecto/api/v1/sessions/events?sessionId=session-1',
    )

    FakeEventSource.instances[0]?.emit('session-message-appended', {
      type: 'session-message-appended',
      session: {
        id: 'session-1',
        status: 'in_progress',
        createdAt: 100,
        updatedAt: 120,
        instruction: '',
        annotations: [],
        messages: [
          {
            id: 'message-1',
            role: 'agent',
            text: 'Working on it now.',
            createdAt: 120,
          },
        ],
      },
    })
    await Promise.resolve()

    expect(shadowRoot.textContent).toContain('◔ in progress')
    expect(shadowRoot.textContent).toContain('Working on it now.')

    const showUpdatesButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Show updates',
    ) as HTMLButtonElement

    expect(showUpdatesButton).toBeTruthy()
    showUpdatesButton.click()
    await Promise.resolve()

    expect(shadowRoot.textContent).toContain('Updates')
    expect(shadowRoot.textContent).toContain('Created from annotate mode')
    expect(shadowRoot.textContent).toContain('Agent: Working on it now.')

    FakeEventSource.instances[0]?.emit('session-status-updated', {
      type: 'session-status-updated',
      session: {
        id: 'session-1',
        status: 'resolved',
        createdAt: 100,
        updatedAt: 140,
        resolvedAt: 140,
        instruction: '',
        annotations: [],
        messages: [
          {
            id: 'message-1',
            role: 'agent',
            text: 'Working on it now.',
            createdAt: 120,
          },
        ],
      },
    })
    await Promise.resolve()

    expect(FakeEventSource.instances[0]?.closed).toBe(true)
    expect(shadowRoot.textContent).toContain('complete')
  })

  it('shows all agent replies in the expanded session timeline', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: 100,
            updatedAt: 100,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: 100,
            updatedAt: 100,
            instruction: '',
            annotations: [],
            messages: [],
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    const createTask = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Create Task',
    ) as HTMLButtonElement
    createTask.click()
    await vi.waitFor(() => expect(FakeEventSource.instances).toHaveLength(1))

    FakeEventSource.instances[0]?.emit('session-message-appended', {
      type: 'session-message-appended',
      session: {
        id: 'session-1',
        status: 'in_progress',
        createdAt: 100,
        updatedAt: 140,
        acknowledgedAt: 110,
        instruction: '',
        annotations: [],
        messages: [
          { id: 'message-1', role: 'agent', text: 'First update.', createdAt: 120 },
          { id: 'message-2', role: 'agent', text: 'Second update.', createdAt: 140 },
        ],
      },
    })
    await Promise.resolve()

    const showUpdatesButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Show updates',
    ) as HTMLButtonElement
    showUpdatesButton.click()
    await Promise.resolve()

    expect(shadowRoot.textContent).toContain('Agent claimed this session')
    expect(shadowRoot.textContent).toContain('Agent: First update.')
    expect(shadowRoot.textContent).toContain('Agent: Second update.')
  })

  it('shows a task-created status after creating an agent task', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: 100,
            updatedAt: 100,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: 100,
            updatedAt: 100,
            instruction: '',
            annotations: [],
            messages: [],
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    const createTask = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Create Task',
    ) as HTMLButtonElement

    createTask.click()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    expect(shadowRoot.textContent).toContain('Task created from your notes.')
    expect(shadowRoot.textContent).toContain('If it has not started, ask AI to continue.')
  })

  it('shows the standard pending task hint when Create Task creates a task', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: 100,
            updatedAt: 100,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: 100,
            updatedAt: 100,
            instruction: '',
            annotations: [],
            messages: [],
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    const createTask = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Create Task',
    ) as HTMLButtonElement

    createTask.click()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    expect(shadowRoot.textContent).toContain('Task created from your notes.')
    expect(shadowRoot.textContent).toContain('If it has not started, ask AI to continue.')
  })

  it('renders acknowledged task system updates before the first agent reply', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'acknowledged',
            createdAt: 100,
            updatedAt: 100,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'acknowledged',
            createdAt: 100,
            updatedAt: 100,
            acknowledgedAt: 100,
            instruction: '',
            annotations: [],
            messages: [],
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    const createTask = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Create Task',
    ) as HTMLButtonElement

    createTask.click()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    FakeEventSource.instances[0]?.emit('session-message-appended', {
      type: 'session-message-appended',
      session: {
        id: 'session-1',
        status: 'acknowledged',
        createdAt: 100,
        updatedAt: 110,
        acknowledgedAt: 100,
        instruction: '',
        annotations: [],
        messages: [
          {
            id: 'message-system',
            role: 'system',
            text: SYSTEM_STARTED_MESSAGE,
            createdAt: 110,
          },
        ],
      },
    })
    await Promise.resolve()

    expect(shadowRoot.textContent).toContain(SYSTEM_STARTED_MESSAGE)
    expect(shadowRoot.textContent).toContain('AI connected. Waiting for update.')
  })

  it('keeps a new saved annotation after the previous task was resolved', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: 100,
            updatedAt: 100,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: 100,
            updatedAt: 100,
            instruction: '',
            annotations: [],
            messages: [],
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource)

    document.body.innerHTML = `
      <button data-inspecto="/repo/App.tsx:10:2" id="first">First</button>
      <button data-inspecto="/repo/App.tsx:20:2" id="second">Second</button>
    `

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('first')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    let note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'First note'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    const saveNote = () =>
      Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Save note',
      ) as HTMLButtonElement
    const createTask = () =>
      Array.from(shadowRoot.querySelectorAll('button')).find(
        button => button.textContent === 'Create Task',
      ) as HTMLButtonElement

    saveNote().click()
    await Promise.resolve()
    createTask().click()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    FakeEventSource.instances[0]?.emit('session-status-updated', {
      type: 'session-status-updated',
      session: {
        id: 'session-1',
        status: 'resolved',
        createdAt: 100,
        updatedAt: 140,
        resolvedAt: 140,
        instruction: '',
        annotations: [],
        messages: [],
      },
    })
    await Promise.resolve()

    document
      .getElementById('second')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Second note'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    saveNote().click()
    await Promise.resolve()

    expect(shadowRoot.querySelectorAll('[data-inspecto-annotate-overlay-box]')).toHaveLength(1)
    expect(shadowRoot.textContent).toContain('Second note')
    expect(shadowRoot.textContent).not.toContain('First note')
    const currentTaskTitle = Array.from(shadowRoot.querySelectorAll('div')).find(
      node => node.textContent === 'Current task',
    ) as HTMLDivElement | undefined
    expect(currentTaskTitle?.parentElement?.parentElement).toHaveProperty('style.display', 'none')
  })

  it('always sends unified annotation response mode', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(configResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!
    const note = shadowRoot.querySelector(
      '[data-inspecto-annotate-composer] textarea',
    ) as HTMLTextAreaElement
    note.value = 'Review this target.'
    note.dispatchEvent(new Event('input', { bubbles: true }))

    const add = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Save note',
    ) as HTMLButtonElement
    add.click()
    await Promise.resolve()

    const sendBatch = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Ask AI',
    ) as HTMLButtonElement
    sendBatch.click()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    const req = JSON.parse(fetchMock.mock.calls[1]![1].body as string) as SendAnnotationsToAiRequest
    expect(req.instruction).toBe('')
  })

  it('routes ide workflow confirmations through ide dispatch and explains live updates are unavailable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        configResponse({
          annotateChannel: 'ide',
          workflows: [
            {
              id: 'review-pr',
              label: 'Review & PR',
              prompt: 'Review these notes and prepare the next action.',
              confirm: true,
            },
          ],
        }),
      )
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    await vi.waitFor(() => expect(shadowRoot.textContent).toContain('Review & PR'))

    const workflowButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Review & PR',
    ) as HTMLButtonElement

    workflowButton.click()
    await Promise.resolve()

    const confirmButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Confirm' || button.textContent === '确认',
    ) as HTMLButtonElement

    expect(confirmButton).toBeDefined()

    confirmButton.click()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    const url = fetchMock.mock.calls[1]![0] as string
    expect(url).toContain('/inspecto/api/v1/ai/dispatch')
    expect(url).not.toContain('/inspecto/api/v1/ai/dispatch/annotations')

    const req = JSON.parse(fetchMock.mock.calls[1]![1].body as string) as {
      prompt?: string
      location?: { file: string; line: number; column: number }
      snippet?: string
    }
    expect(req.prompt).toBe('Review these notes and prepare the next action.')
    expect(req.location).toBeUndefined()
    expect(req.snippet).toBeUndefined()
    expect(FakeEventSource.instances).toHaveLength(0)

    expect(shadowRoot.textContent).toContain('Sent to IDE')
    expect(shadowRoot.textContent).toContain('Live sidebar updates are unavailable')

    vi.advanceTimersByTime(1600)
    await Promise.resolve()

    const emptyState = shadowRoot.querySelector(
      'section[data-variant="empty-state"]',
    ) as HTMLElement
    const workflowNotice = shadowRoot.querySelector(
      'section[data-variant="latest-session"]',
    ) as HTMLElement
    expect(emptyState.style.display).toBe('none')
    expect(workflowNotice.style.display).toBe('')
    expect(shadowRoot.textContent).toContain('Live sidebar updates are unavailable')

    const previewButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.getAttribute('title') === 'View raw prompt payload',
    ) as HTMLButtonElement | undefined
    const copyContextButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.getAttribute('title') === 'Copy context',
    ) as HTMLButtonElement | undefined
    expect(previewButton?.style.display).toBe('none')
    expect(copyContextButton?.style.display).toBe('none')
  })

  it('routes workflow confirmations through agent dispatch when annotate delivery mode is agent', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        configResponse({
          annotateChannel: 'mcp',
          workflows: [
            {
              id: 'review-pr',
              label: 'Review & PR',
              prompt: 'Review these notes and prepare the next action.',
              confirm: true,
            },
          ],
        }),
      )
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'session-1',
            status: 'pending',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            instruction: 'Review these notes and prepare the next action.',
            annotations: [],
            messages: [],
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    await vi.waitFor(() => expect(shadowRoot.textContent).toContain('Review & PR'))

    const workflowButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Review & PR',
    ) as HTMLButtonElement

    workflowButton.click()
    await Promise.resolve()

    const confirmButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Confirm' || button.textContent === '确认',
    ) as HTMLButtonElement

    expect(confirmButton).toBeDefined()

    confirmButton.click()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    const url = fetchMock.mock.calls[1]![0] as string
    expect(url).toContain('/inspecto/api/v1/ai/dispatch/annotations')

    const req = JSON.parse(fetchMock.mock.calls[1]![1].body as string) as SendAnnotationsToAiRequest
    expect(req.deliveryMode).toBe('mcp')
    expect(req.source).toBe('workflow')
    expect(req.workflowId).toBe('review-pr')
    expect(req.instruction).toBe('Review these notes and prepare the next action.')
    expect(req.annotations).toEqual([])
  })

  it('keeps workflow execution visible and streams agent results into the sidebar', async () => {
    const dispatchDeferred = createDeferred<{
      ok: true
      json: () => Promise<{
        success: true
        session: { id: string; status: 'pending'; createdAt: number; updatedAt: number }
      }>
    }>()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        configResponse({
          annotateChannel: 'mcp',
          workflows: [
            {
              id: 'auto-merge-commit',
              label: 'AUTO-MERGE-COMMIT',
              prompt: 'Append local changes to the latest commit.',
              confirm: true,
            },
          ],
        }),
      )
      .mockImplementationOnce(() => dispatchDeferred.promise)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            id: 'workflow-session-1',
            status: 'pending',
            createdAt: 100,
            updatedAt: 100,
            instruction: 'Append local changes to the latest commit.',
            annotations: [],
            messages: [],
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource)

    document.body.innerHTML =
      '<button data-inspecto="/repo/App.tsx:10:2" id="target">Target</button>'

    await mountInspector({ defaultActive: true, mode: 'annotate' })
    const host = document.querySelector('inspecto-overlay') as HTMLElement
    const shadowRoot = host.shadowRoot!

    document
      .getElementById('target')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    await vi.waitFor(() => expect(shadowRoot.textContent).toContain('AUTO-MERGE-COMMIT'))

    const workflowButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'AUTO-MERGE-COMMIT',
    ) as HTMLButtonElement

    workflowButton.click()
    await Promise.resolve()

    const confirmButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      button => button.textContent === 'Confirm' || button.textContent === '确认',
    ) as HTMLButtonElement

    confirmButton.click()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => {
      const sendingWorkflowButton = shadowRoot.querySelector(
        'button[data-workflow-id="auto-merge-commit"]',
      ) as HTMLButtonElement | null
      expect(sendingWorkflowButton?.textContent).toBe('Sending...')
    })

    dispatchDeferred.resolve({
      ok: true,
      json: async () => ({
        success: true,
        session: {
          id: 'workflow-session-1',
          status: 'pending',
          createdAt: 100,
          updatedAt: 100,
        },
      }),
    })

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(FakeEventSource.instances).toHaveLength(1)
    expect(FakeEventSource.instances[0]?.url).toContain(
      '/inspecto/api/v1/sessions/events?sessionId=workflow-session-1',
    )

    const emptyState = shadowRoot.querySelector(
      'section[data-variant="empty-state"]',
    ) as HTMLElement
    const draftSection = shadowRoot.querySelector('section[data-variant="draft"]') as HTMLElement
    const latestSessionSection = shadowRoot.querySelector(
      'section[data-variant="latest-session"]',
    ) as HTMLElement

    expect(emptyState.style.display).toBe('none')
    expect(draftSection.style.display).toBe('')
    expect(latestSessionSection.style.display).toBe('')

    FakeEventSource.instances[0]?.emit('session-message-appended', {
      type: 'session-message-appended',
      session: {
        id: 'workflow-session-1',
        status: 'in_progress',
        createdAt: 100,
        updatedAt: 120,
        instruction: 'Append local changes to the latest commit.',
        annotations: [],
        messages: [
          {
            id: 'message-1',
            role: 'agent',
            text: 'Appended changes to the latest commit and kept the message unchanged.',
            createdAt: 120,
          },
        ],
      },
    })
    await Promise.resolve()

    expect(shadowRoot.textContent).toContain('◔ in progress')
    expect(shadowRoot.textContent).toContain(
      'Appended changes to the latest commit and kept the message unchanged.',
    )
    expect(shadowRoot.textContent).toContain('AUTO-MERGE-COMMIT')
  })
})
