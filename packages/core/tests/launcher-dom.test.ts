import { describe, expect, it } from 'vitest'
import { createLauncherDom, getLauncherDomRefs } from '../src/runtime/launcher-dom.js'

describe('launcher DOM refs', () => {
  it('returns all DOM refs required for launcher updates', () => {
    const { badge } = createLauncherDom()

    const refs = getLauncherDomRefs(badge)

    expect(refs).not.toBeNull()
    expect(refs?.indicator.dataset.inspectoLauncherIndicator).toBe('true')
    expect(refs?.stateSpan.dataset.inspectoLauncherState).toBe('true')
    expect(refs?.inspectButton.dataset.inspectoLauncherAction).toBe('inspect')
    expect(refs?.annotateButton.dataset.inspectoLauncherAction).toBe('annotate')
    expect(refs?.pauseButton.dataset.inspectoLauncherAction).toBe('pause')
    expect(refs?.hotkeyHint.dataset.inspectoLauncherHint).toBe('hotkey')
    expect(refs?.inspectNotice.dataset.inspectoLauncherInspectNotice).toBe('true')
  })

  it('returns null when the badge does not match the expected structure', () => {
    expect(getLauncherDomRefs(document.createElement('div'))).toBeNull()
  })
})
