import { describe, expect, it, vi } from 'vitest'
import {
  renderComposerControls,
  resetComposerControls,
} from '../src/features/annotate/overlay/composer-controls.js'

const tokens = {
  surfaceSubtle: () => 'rgba(255, 255, 255, 0.04)',
  borderSubtle: () => 'rgba(255, 255, 255, 0.08)',
  textSecondary: () => 'rgba(255, 255, 255, 0.72)',
  accentPrimary: () => '#5d52f3',
  accentPrimaryStrong: () => '#4639d7',
  shadowAccent: () => '0 8px 18px rgba(79, 70, 229, 0.28)',
}

function createDom(): {
  composerCssButton: HTMLButtonElement
  composerRuntimeButton: HTMLButtonElement
  composerRuntimeBadge: HTMLElement
} {
  const composerCssButton = document.createElement('button')
  const composerRuntimeButton = document.createElement('button')
  const composerRuntimeBadge = document.createElement('span')
  composerRuntimeButton.append(composerRuntimeBadge)
  return { composerCssButton, composerRuntimeButton, composerRuntimeBadge }
}

describe('annotate overlay composer controls', () => {
  it('renders active CSS and runtime controls with callbacks and error badge', () => {
    const dom = createDom()
    const onToggleCssContext = vi.fn()
    const onToggleRuntimeContext = vi.fn()

    renderComposerControls(dom, tokens, {
      canAttachCssContext: true,
      cssContextEnabled: true,
      canAttachRuntimeContext: true,
      runtimeContextEnabled: true,
      runtimeErrorCount: 3,
      onToggleCssContext,
      onToggleRuntimeContext,
    })

    expect(dom.composerCssButton.style.display).toBe('inline-flex')
    expect(dom.composerCssButton.getAttribute('aria-pressed')).toBe('true')
    expect(dom.composerCssButton.dataset.visualState).toBe('active')
    expect(dom.composerCssButton.title).toBe('CSS context enabled')

    expect(dom.composerRuntimeButton.style.display).toBe('inline-flex')
    expect(dom.composerRuntimeButton.getAttribute('aria-pressed')).toBe('true')
    expect(dom.composerRuntimeButton.dataset.visualState).toBe('active')
    expect(dom.composerRuntimeBadge.textContent).toBe('3')
    expect(dom.composerRuntimeBadge.style.display).toBe('')
    expect(dom.composerRuntimeButton.title).toBe('Runtime context enabled • 3 errors')

    dom.composerCssButton.click()
    dom.composerRuntimeButton.click()

    expect(onToggleCssContext).toHaveBeenCalledTimes(1)
    expect(onToggleRuntimeContext).toHaveBeenCalledTimes(1)
  })

  it('resets composer controls to hidden inactive state', () => {
    const dom = createDom()
    const onToggleCssContext = vi.fn()
    const onToggleRuntimeContext = vi.fn()

    renderComposerControls(dom, tokens, {
      canAttachCssContext: true,
      cssContextEnabled: true,
      canAttachRuntimeContext: true,
      runtimeContextEnabled: true,
      runtimeErrorCount: 105,
      onToggleCssContext,
      onToggleRuntimeContext,
    })

    resetComposerControls(dom, tokens)
    dom.composerCssButton.click()
    dom.composerRuntimeButton.click()

    expect(dom.composerCssButton.style.display).toBe('none')
    expect(dom.composerCssButton.getAttribute('aria-pressed')).toBe('false')
    expect(dom.composerCssButton.dataset.visualState).toBe('inactive')
    expect(dom.composerCssButton.title).toBe('Attach CSS context')
    expect(dom.composerRuntimeButton.style.display).toBe('none')
    expect(dom.composerRuntimeButton.getAttribute('aria-pressed')).toBe('false')
    expect(dom.composerRuntimeButton.dataset.visualState).toBe('inactive')
    expect(dom.composerRuntimeBadge.textContent).toBe('')
    expect(dom.composerRuntimeBadge.style.display).toBe('none')
    expect(onToggleCssContext).not.toHaveBeenCalled()
    expect(onToggleRuntimeContext).not.toHaveBeenCalled()
  })
})
