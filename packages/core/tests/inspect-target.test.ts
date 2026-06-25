import { describe, expect, it } from 'vitest'
import {
  collectEvidenceForTarget,
  resolveRuntimeInspectTarget,
} from '../src/runtime/inspect-target.js'

describe('runtime inspect target resolver', () => {
  it('prefers source-location targets and builds an overlay label', () => {
    document.body.innerHTML = `
      <button data-inspecto="/repo/src/App.tsx:10:2" id="target">
        <span id="child">Target</span>
      </button>
    `

    const target = resolveRuntimeInspectTarget({
      mode: 'inspect',
      eventTarget: document.getElementById('child'),
    })

    expect(target).toMatchObject({
      element: document.getElementById('target'),
      location: { file: '/repo/src/App.tsx', line: 10, column: 2 },
      label: 'App.tsx:10',
    })
    expect(collectEvidenceForTarget(target!)).toBeUndefined()
  })

  it('falls back to DOM evidence targets in inspect mode', () => {
    document.body.innerHTML = '<button id="upgrade" data-testid="upgrade-button">Upgrade</button>'
    const element = document.getElementById('upgrade')

    const target = resolveRuntimeInspectTarget({ mode: 'inspect', eventTarget: element })

    expect(target).toMatchObject({
      element,
      location: null,
      label: '',
    })
    expect(collectEvidenceForTarget(target!)?.element).toMatchObject({
      tagName: 'button',
      testId: 'upgrade-button',
    })
  })

  it('falls back to DOM evidence targets in annotate mode', () => {
    document.body.innerHTML = '<button id="upgrade">Upgrade</button>'

    const target = resolveRuntimeInspectTarget({
      mode: 'annotate',
      eventTarget: document.getElementById('upgrade'),
    })

    expect(target).toMatchObject({
      element: document.getElementById('upgrade'),
      location: null,
      label: '',
    })
    expect(collectEvidenceForTarget(target!)?.element).toMatchObject({
      tagName: 'button',
      id: 'upgrade',
    })
  })

  it('normalizes source-less targets to the nearest semantic element', () => {
    document.body.innerHTML = `
      <button id="upgrade" data-testid="upgrade-button">
        <span id="label">Upgrade</span>
      </button>
    `

    const target = resolveRuntimeInspectTarget({
      mode: 'annotate',
      eventTarget: document.getElementById('label'),
    })

    expect(target?.element).toBe(document.getElementById('upgrade'))
  })

  it('allows business floating UI roles as source-less targets', () => {
    document.body.innerHTML = '<div role="dialog" id="dialog">Business dialog</div>'

    expect(
      resolveRuntimeInspectTarget({
        mode: 'inspect',
        eventTarget: document.getElementById('dialog'),
      })?.element,
    ).toBe(document.getElementById('dialog'))
  })

  it('ignores Inspecto chrome as source-less evidence targets', () => {
    const host = document.createElement('inspecto-overlay')

    expect(resolveRuntimeInspectTarget({ mode: 'inspect', eventTarget: host })).toBeNull()
  })
})
