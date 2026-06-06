import { describe, expect, it } from 'vitest'
import { badgeClass } from '../src/shared/styles/index.js'
import { updateLauncherEye } from '../src/runtime/launcher-eye.js'

function createBadge(): HTMLDivElement {
  const badge = document.createElement('div')
  const eyes = document.createElement('span')
  eyes.className = `${badgeClass}-eyes`
  eyes.getBoundingClientRect = () =>
    ({
      x: 10,
      y: 10,
      left: 10,
      top: 10,
      right: 30,
      bottom: 20,
      width: 20,
      height: 10,
      toJSON: () => {},
    }) as DOMRect

  const firstPupil = document.createElement('span')
  firstPupil.className = `${badgeClass}-eye-pupil`
  const secondPupil = document.createElement('span')
  secondPupil.className = `${badgeClass}-eye-pupil`
  eyes.append(firstPupil, secondPupil)
  badge.appendChild(eyes)
  return badge
}

describe('launcher eye', () => {
  it('hides launcher eyes while selection is paused', () => {
    const badge = createBadge()

    updateLauncherEye({
      badge,
      active: false,
      disabled: true,
      mode: 'inspect',
      launcherPanelOpen: false,
      cleanupMenu: null,
      lastPointerX: 0,
      lastPointerY: 0,
      shadowRootEl: document.createElement('div').attachShadow({ mode: 'open' }),
    })

    const eyes = badge.querySelector(`.${badgeClass}-eyes`) as HTMLElement
    expect(eyes.hidden).toBe(true)
  })

  it('moves pupils toward the latest pointer in active mode', () => {
    const badge = createBadge()

    updateLauncherEye({
      badge,
      active: true,
      disabled: false,
      mode: 'inspect',
      launcherPanelOpen: false,
      cleanupMenu: null,
      lastPointerX: 24,
      lastPointerY: 15,
      shadowRootEl: document.createElement('div').attachShadow({ mode: 'open' }),
    })

    const eyes = badge.querySelector(`.${badgeClass}-eyes`) as HTMLElement
    const pupils = badge.querySelectorAll(`.${badgeClass}-eye-pupil`)
    expect(eyes.hidden).toBe(false)
    expect(eyes.dataset.state).toBe('active')
    expect(eyes.dataset.mood).toBe('engaged')
    expect((pupils[0] as HTMLElement).style.transform).toBe('translate(4.00px, 0.00px)')
    expect((pupils[1] as HTMLElement).style.transform).toBe('translate(4.00px, 0.00px)')
  })

  it('averts active eyes when the launcher panel is open', () => {
    const badge = createBadge()

    updateLauncherEye({
      badge,
      active: true,
      disabled: false,
      mode: 'inspect',
      launcherPanelOpen: true,
      cleanupMenu: null,
      lastPointerX: 24,
      lastPointerY: 15,
      shadowRootEl: document.createElement('div').attachShadow({ mode: 'open' }),
    })

    const eyes = badge.querySelector(`.${badgeClass}-eyes`) as HTMLElement
    const pupil = badge.querySelector(`.${badgeClass}-eye-pupil`) as HTMLElement
    expect(eyes.dataset.mood).toBe('averted')
    expect(pupil.style.transform).toBe('translate(-4.00px, 0.00px)')
  })
})
