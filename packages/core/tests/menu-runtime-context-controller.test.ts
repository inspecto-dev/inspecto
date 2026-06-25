import type { RuntimeContextEnvelope, SourceLocation } from '@inspecto-dev/types'
import { describe, expect, it, vi } from 'vitest'
import { createInspectMenuRuntimeContextController } from '../src/features/inspect/menu/runtime-context-controller.js'

const location: SourceLocation = { file: '/src/App.tsx', line: 10, column: 5 }

function createRuntimeContext(): RuntimeContextEnvelope {
  return {
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
}

function createDom() {
  const runtimeContextSection = document.createElement('div')
  const runtimeToggleButton = document.createElement('button')
  const runtimeToggleBadge = document.createElement('span')
  runtimeToggleButton.appendChild(runtimeToggleBadge)

  return {
    runtimeContextSection,
    runtimeToggleButton,
    runtimeToggleBadge,
  }
}

describe('inspect menu runtime context controller', () => {
  it('renders default runtime context UI and resolves using the current preference', () => {
    const dom = createDom()
    const runtimeContext = createRuntimeContext()
    const getRuntimeContext = vi.fn(() => runtimeContext)
    const updatePosition = vi.fn()

    const controller = createInspectMenuRuntimeContextController({
      ...dom,
      canAttachRuntimeContext: true,
      runtimeContextDefaultMode: 'all-on',
      location,
      getRuntimeContext,
      options: { runtimeContext: { enabled: true } },
      updatePosition,
    })

    controller.render()

    expect(dom.runtimeToggleButton.getAttribute('aria-pressed')).toBe('true')
    expect(dom.runtimeContextSection.hidden).toBe(false)
    expect(dom.runtimeToggleBadge.textContent).toBe('1')
    expect(controller.resolve()).toBe(runtimeContext)
    expect(updatePosition).toHaveBeenCalledTimes(1)
  })

  it('toggles runtime context preference from mixed mode to enabled', () => {
    const dom = createDom()
    const runtimeContext = createRuntimeContext()
    const getRuntimeContext = vi.fn(() => runtimeContext)

    const controller = createInspectMenuRuntimeContextController({
      ...dom,
      canAttachRuntimeContext: true,
      runtimeContextDefaultMode: 'mixed',
      location,
      getRuntimeContext,
      options: { runtimeContext: { enabled: true } },
      updatePosition: vi.fn(),
    })

    controller.render()
    expect(dom.runtimeToggleButton.getAttribute('aria-pressed')).toBe('mixed')
    expect(controller.resolve({ id: 'explain', aiIntent: 'ask' })).toBeNull()

    dom.runtimeToggleButton.click()

    expect(dom.runtimeToggleButton.getAttribute('aria-pressed')).toBe('true')
    expect(controller.resolve({ id: 'explain', aiIntent: 'ask' })).toBe(runtimeContext)
  })

  it('can enable runtime context after IDE capabilities arrive', () => {
    const dom = createDom()
    const runtimeContext = createRuntimeContext()
    const getRuntimeContext = vi.fn(() => runtimeContext)

    const controller = createInspectMenuRuntimeContextController({
      ...dom,
      canAttachRuntimeContext: false,
      runtimeContextDefaultMode: 'off',
      location,
      getRuntimeContext,
      options: { runtimeContext: { enabled: true } },
      updatePosition: vi.fn(),
    })

    controller.render()
    expect(dom.runtimeContextSection.hidden).toBe(true)
    expect(controller.resolve()).toBeNull()

    controller.setCanAttachRuntimeContext(true)
    controller.setDefaultMode('all-on')
    controller.render()

    expect(dom.runtimeToggleButton.getAttribute('aria-pressed')).toBe('true')
    expect(controller.resolve()).toBe(runtimeContext)
  })
})
