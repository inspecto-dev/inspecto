import type { SourceLocation } from '@inspecto-dev/types'
import { describe, expect, it, vi } from 'vitest'
import { renderInspectMenuIdeInfo } from '../src/features/inspect/menu/ide-info-renderer.js'

const location: SourceLocation = { file: '/src/App.tsx', line: 10, column: 5 }

function createDom() {
  return {
    input: document.createElement('input'),
    loadingElement: document.createElement('div'),
    actionsSection: document.createElement('div'),
    headerActions: document.createElement('div'),
    runtimeToggleButton: document.createElement('button'),
    openButton: document.createElement('button'),
  }
}

function createRuntimeController() {
  return {
    render: vi.fn(),
    resolve: vi.fn(() => null),
    setCanAttachRuntimeContext: vi.fn(),
    setDefaultMode: vi.fn(),
  }
}

describe('inspect menu IDE info renderer', () => {
  it('renders actions, supplemental placeholder, and mixed runtime default mode', () => {
    const dom = createDom()
    const runtimeContextController = createRuntimeController()
    const updatePosition = vi.fn()
    const onSend = vi.fn()

    renderInspectMenuIdeInfo({
      ...dom,
      ideInfo: {
        ide: 'vscode',
        prompts: [
          { id: 'fix-bug', label: 'Fix Bug', aiIntent: 'fix', prompt: 'Fix this' },
          { id: 'explain', label: 'Explain Code', aiIntent: 'ask', prompt: 'Explain this' },
        ],
      },
      target: { location },
      includeSnippet: false,
      maxSnippetLines: 100,
      options: {},
      hasRuntimeContextProvider: true,
      runtimeContextController,
      resolveCssContextPrompt: () => null,
      onSend,
      onOpenFile: vi.fn(),
      onCleanup: vi.fn(),
      onError: vi.fn(),
      updatePosition,
    })

    expect(dom.loadingElement.parentElement).toBeNull()
    expect(dom.input.placeholder).toBe('Add a custom ask or extra instruction...')
    expect(runtimeContextController.setDefaultMode).toHaveBeenCalledWith('mixed')
    expect(runtimeContextController.render).toHaveBeenCalledTimes(1)
    expect(dom.actionsSection.querySelectorAll('button')).toHaveLength(2)
    expect(dom.actionsSection.textContent).toContain('Fix Bug')
    expect(dom.actionsSection.textContent).toContain('Explain Code')
    expect(updatePosition).toHaveBeenCalledTimes(1)
  })

  it('enables runtime controls when IDE info reports runtime context support', () => {
    const dom = createDom()
    const runtimeContextController = createRuntimeController()
    dom.headerActions.appendChild(dom.openButton)

    renderInspectMenuIdeInfo({
      ...dom,
      ideInfo: {
        ide: 'vscode',
        prompts: [],
        runtimeContext: { enabled: true },
      },
      target: { location },
      includeSnippet: false,
      maxSnippetLines: 100,
      options: {},
      hasRuntimeContextProvider: true,
      runtimeContextController,
      resolveCssContextPrompt: () => null,
      onSend: vi.fn(),
      onOpenFile: vi.fn(),
      onCleanup: vi.fn(),
      onError: vi.fn(),
      updatePosition: vi.fn(),
    })

    expect(runtimeContextController.setCanAttachRuntimeContext).toHaveBeenCalledWith(true)
    expect(Array.from(dom.headerActions.querySelectorAll('button'))).toEqual([
      dom.runtimeToggleButton,
      dom.openButton,
    ])
    expect(dom.input.placeholder).toBe('Ask anything about this component...')
  })

  it('wires open-in-editor success and failure handling', async () => {
    const dom = createDom()
    const runtimeContextController = createRuntimeController()
    const onCleanup = vi.fn()
    const onError = vi.fn()
    const onOpenFile = vi
      .fn<[], Promise<{ success: true } | { success: false; errorCode?: string }>>()
      .mockResolvedValueOnce({ success: false, errorCode: 'IDE_UNAVAILABLE' })
      .mockResolvedValueOnce({ success: true })

    renderInspectMenuIdeInfo({
      ...dom,
      ideInfo: { ide: 'vscode', prompts: [] },
      target: { location },
      includeSnippet: false,
      maxSnippetLines: 100,
      options: {},
      hasRuntimeContextProvider: false,
      runtimeContextController,
      resolveCssContextPrompt: () => null,
      onSend: vi.fn(),
      onOpenFile,
      onCleanup,
      onError,
      updatePosition: vi.fn(),
    })

    dom.openButton.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(onOpenFile).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith('Unable to open file in the editor.', 'IDE_UNAVAILABLE')
    expect(dom.openButton.disabled).toBe(false)
    expect(onCleanup).not.toHaveBeenCalled()

    dom.openButton.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(onCleanup).toHaveBeenCalledTimes(1)
  })

  it('does not enable runtime controls without a runtime context provider', () => {
    const dom = createDom()
    const runtimeContextController = createRuntimeController()
    dom.headerActions.appendChild(dom.openButton)

    renderInspectMenuIdeInfo({
      ...dom,
      ideInfo: {
        ide: 'vscode',
        prompts: [],
        runtimeContext: { enabled: true },
      },
      target: { location },
      includeSnippet: false,
      maxSnippetLines: 100,
      options: {},
      hasRuntimeContextProvider: false,
      runtimeContextController,
      resolveCssContextPrompt: () => null,
      onSend: vi.fn(),
      onOpenFile: vi.fn(),
      onCleanup: vi.fn(),
      onError: vi.fn(),
      updatePosition: vi.fn(),
    })

    expect(runtimeContextController.setCanAttachRuntimeContext).not.toHaveBeenCalled()
    expect(Array.from(dom.headerActions.querySelectorAll('button'))).toEqual([dom.openButton])
  })

  it('does not enable runtime controls for source-less target evidence', () => {
    const dom = createDom()
    const runtimeContextController = createRuntimeController()
    dom.headerActions.appendChild(dom.openButton)

    renderInspectMenuIdeInfo({
      ...dom,
      ideInfo: {
        ide: 'vscode',
        prompts: [],
        runtimeContext: { enabled: true },
      },
      target: { location: null },
      includeSnippet: false,
      maxSnippetLines: 100,
      options: {},
      hasRuntimeContextProvider: true,
      runtimeContextController,
      resolveCssContextPrompt: () => null,
      onSend: vi.fn(),
      onOpenFile: vi.fn(),
      onCleanup: vi.fn(),
      onError: vi.fn(),
      updatePosition: vi.fn(),
    })

    expect(runtimeContextController.setCanAttachRuntimeContext).not.toHaveBeenCalled()
    expect(Array.from(dom.headerActions.querySelectorAll('button'))).toEqual([])
  })
})
