import { describe, expect, it } from 'vitest'
import { resolveComposerPlacement } from '../src/features/annotate/overlay/composer-placement.js'

describe('annotate overlay composer placement', () => {
  it('prefers below when the centered composer fits in the viewport', () => {
    expect(
      resolveComposerPlacement({
        targetRect: {
          left: 320,
          top: 210,
          width: 250,
          height: 36,
          right: 570,
          bottom: 246,
        },
        composerHeight: 0,
        viewportWidth: 1440,
        viewportHeight: 900,
        previousPlacement: null,
        preservePlacement: false,
      }),
    ).toEqual({
      side: 'below',
      left: 275,
      top: 260,
    })
  })

  it('moves left when the target is constrained by the right edge', () => {
    expect(
      resolveComposerPlacement({
        targetRect: {
          left: 860,
          top: 120,
          width: 120,
          height: 36,
          right: 980,
          bottom: 156,
        },
        composerHeight: 0,
        viewportWidth: 1024,
        viewportHeight: 768,
        previousPlacement: null,
        preservePlacement: false,
      }),
    ).toEqual({
      side: 'left',
      left: 506,
      top: 18,
    })
  })

  it('moves above when there is not enough room below', () => {
    expect(
      resolveComposerPlacement({
        targetRect: {
          left: 520,
          top: 650,
          width: 140,
          height: 36,
          right: 660,
          bottom: 686,
        },
        composerHeight: 0,
        viewportWidth: 1280,
        viewportHeight: 768,
        previousPlacement: null,
        preservePlacement: false,
      }),
    ).toMatchObject({
      side: 'above',
      top: 396,
    })
  })

  it('keeps the previous side when multiple placements fit and preservation is requested', () => {
    expect(
      resolveComposerPlacement({
        targetRect: {
          left: 420,
          top: 220,
          width: 120,
          height: 36,
          right: 540,
          bottom: 256,
        },
        composerHeight: 200,
        viewportWidth: 1200,
        viewportHeight: 800,
        previousPlacement: 'right',
        preservePlacement: true,
      }),
    ).toMatchObject({
      side: 'right',
    })
  })
})
