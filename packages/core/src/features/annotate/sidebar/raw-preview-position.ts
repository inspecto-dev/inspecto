export type RawPromptPreviewPositionInput = {
  footerTop: number
  footerBottom: number
  previewHeight: number
  viewportHeight: number
}

export type RawPromptPreviewPosition = {
  top: string
  bottom: string
  maxHeight: string
}

const viewportPadding = 12
const previewGap = 8
const minPreviewHeight = 120
const maxPreviewHeight = 400

export function getRawPromptPreviewPosition({
  footerTop,
  footerBottom,
  previewHeight,
  viewportHeight,
}: RawPromptPreviewPositionInput): RawPromptPreviewPosition {
  const measuredHeight = previewHeight > 0 ? previewHeight : maxPreviewHeight
  const availableAbove = Math.max(
    minPreviewHeight,
    Math.floor(footerTop - viewportPadding - previewGap),
  )
  const availableBelow = Math.max(
    minPreviewHeight,
    Math.floor(viewportHeight - footerBottom - viewportPadding - previewGap),
  )

  if (availableAbove < measuredHeight && availableBelow > availableAbove) {
    return {
      top: 'calc(100% + 8px)',
      bottom: 'auto',
      maxHeight: `${Math.min(maxPreviewHeight, availableBelow)}px`,
    }
  }

  return {
    top: 'auto',
    bottom: 'calc(100% + 8px)',
    maxHeight: `${Math.min(maxPreviewHeight, availableAbove)}px`,
  }
}
