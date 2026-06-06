import { describe, expect, it, vi } from 'vitest'
import type { RuntimeContextEnvelope } from '@inspecto-dev/types'
import { menuContextSummaryClass, runtimeToggleBadgeClass } from '../src/shared/styles/index.js'
import { renderRuntimeContextUi } from '../src/features/inspect/menu/runtime-context-renderer.js'

function createRuntimeContext(): RuntimeContextEnvelope {
  return {
    summary: {
      runtimeErrorCount: 2,
      failedRequestCount: 1,
      includedRecordIds: ['err-1', 'err-2', 'req-1'],
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
}

function createDom() {
  const runtimeContextSection = document.createElement('div')
  const runtimeToggleButton = document.createElement('button')
  const runtimeToggleBadge = document.createElement('span')
  runtimeToggleBadge.className = runtimeToggleBadgeClass
  runtimeToggleButton.appendChild(runtimeToggleBadge)

  return {
    runtimeContextSection,
    runtimeToggleButton,
    runtimeToggleBadge,
  }
}

describe('inspect menu runtime context renderer', () => {
  it('renders active runtime context summary, badge, and enabled title', () => {
    const dom = createDom()
    const updatePosition = vi.fn()

    renderRuntimeContextUi({
      ...dom,
      canAttachRuntimeContext: true,
      runtimeContext: createRuntimeContext(),
      runtimeContextPreference: null,
      runtimeContextDefaultMode: 'all-on',
      options: { runtimeContext: { enabled: true } },
      updatePosition,
    })

    expect(dom.runtimeToggleButton.getAttribute('aria-pressed')).toBe('true')
    expect(dom.runtimeToggleButton.dataset.visualState).toBe('active')
    expect(dom.runtimeToggleButton.title).toBe(
      'Runtime context enabled • 2 runtime errors • 1 failed request',
    )
    expect(dom.runtimeToggleBadge.textContent).toBe('2')
    expect(dom.runtimeToggleBadge.hidden).toBe(false)
    expect(dom.runtimeContextSection.hidden).toBe(false)
    expect(
      dom.runtimeContextSection.querySelector(`.${menuContextSummaryClass}`)?.textContent,
    ).toBe('2 runtime errors • 1 failed request')
    expect(updatePosition).toHaveBeenCalledTimes(1)
  })

  it('hides the section and badge for mixed runtime context mode', () => {
    const dom = createDom()

    renderRuntimeContextUi({
      ...dom,
      canAttachRuntimeContext: true,
      runtimeContext: createRuntimeContext(),
      runtimeContextPreference: null,
      runtimeContextDefaultMode: 'mixed',
      options: { runtimeContext: { enabled: true } },
      updatePosition: vi.fn(),
    })

    expect(dom.runtimeToggleButton.getAttribute('aria-pressed')).toBe('mixed')
    expect(dom.runtimeToggleButton.dataset.visualState).toBe('mixed')
    expect(dom.runtimeToggleButton.title).toBe(
      'Runtime context defaults to fix actions only until you choose otherwise • 2 runtime errors • 1 failed request',
    )
    expect(dom.runtimeToggleBadge.hidden).toBe(true)
    expect(dom.runtimeContextSection.hidden).toBe(true)
    expect(dom.runtimeContextSection.childElementCount).toBe(0)
  })

  it('hides runtime context UI when runtime context cannot be attached', () => {
    const dom = createDom()

    renderRuntimeContextUi({
      ...dom,
      canAttachRuntimeContext: false,
      runtimeContext: createRuntimeContext(),
      runtimeContextPreference: null,
      runtimeContextDefaultMode: 'all-on',
      options: { runtimeContext: { enabled: true } },
      updatePosition: vi.fn(),
    })

    expect(dom.runtimeContextSection.hidden).toBe(true)
    expect(dom.runtimeContextSection.childElementCount).toBe(0)
  })
})
