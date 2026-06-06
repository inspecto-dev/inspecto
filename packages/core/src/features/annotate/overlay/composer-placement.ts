import {
  clamp,
  getOverflowPenalty,
  getPlacementPreference,
  type ComposerPlacement,
  type PlacementCandidate,
} from './helpers.js'

type TargetRect = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom' | 'width' | 'height'>

type ComposerPlacementInput = {
  targetRect: TargetRect
  composerHeight: number
  viewportWidth: number
  viewportHeight: number
  previousPlacement: ComposerPlacement | null
  preservePlacement: boolean
}

type ResolvedComposerPlacement = {
  side: ComposerPlacement
  left: number
  top: number
}

const viewportPadding = 16
const composerGap = 14
const fallbackWidth = 340
const fallbackHeight = 240
const minComposerWidth = 240
const maxMeasuredComposerHeight = 360
const preservedSideBonus = -30

function getComposerWidth(viewportWidth: number): number {
  return Math.max(minComposerWidth, Math.min(fallbackWidth, viewportWidth - viewportPadding * 2))
}

function getComposerHeight(measuredHeight: number): number {
  return measuredHeight > 0 && measuredHeight < maxMeasuredComposerHeight
    ? measuredHeight
    : fallbackHeight
}

export function resolveComposerPlacement({
  targetRect,
  composerHeight: measuredComposerHeight,
  viewportWidth,
  viewportHeight,
  previousPlacement,
  preservePlacement,
}: ComposerPlacementInput): ResolvedComposerPlacement {
  const viewportLeft = viewportPadding
  const viewportTop = viewportPadding
  const viewportRight = viewportWidth - viewportPadding
  const viewportBottom = viewportHeight - viewportPadding
  const composerWidth = getComposerWidth(viewportWidth)
  const composerHeight = getComposerHeight(measuredComposerHeight)
  const targetCenterX = targetRect.left + targetRect.width / 2
  const targetCenterY = targetRect.top + targetRect.height / 2
  const candidates: PlacementCandidate[] = [
    {
      side: 'below',
      left: targetCenterX - composerWidth / 2,
      top: targetRect.bottom + composerGap,
    },
    {
      side: 'right',
      left: targetRect.right + composerGap,
      top: targetCenterY - composerHeight / 2,
    },
    {
      side: 'left',
      left: targetRect.left - composerWidth - composerGap,
      top: targetCenterY - composerHeight / 2,
    },
    {
      side: 'above',
      left: targetCenterX - composerWidth / 2,
      top: targetRect.top - composerHeight - composerGap,
    },
  ]

  const ranked = candidates
    .map(candidate => {
      const overflowPenalty = getOverflowPenalty(
        candidate,
        composerWidth,
        composerHeight,
        viewportLeft,
        viewportTop,
        viewportRight,
        viewportBottom,
      )
      const preferencePenalty = getPlacementPreference(candidate.side)
      const previousSideBonus =
        preservePlacement && previousPlacement === candidate.side ? preservedSideBonus : 0

      return {
        candidate,
        score: overflowPenalty * 1000 + preferencePenalty + previousSideBonus,
      }
    })
    .sort((a, b) => a.score - b.score)

  const chosen = ranked[0]!.candidate

  return {
    side: chosen.side,
    left: clamp(chosen.left, viewportLeft, viewportRight - composerWidth),
    top: clamp(chosen.top, viewportTop, viewportBottom - composerHeight),
  }
}
