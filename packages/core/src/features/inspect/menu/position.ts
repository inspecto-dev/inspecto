const DEFAULT_EDGE_MARGIN = 8

type MenuSize = {
  width: number
  height: number
}

type ViewportSize = {
  width: number
  height: number
}

export function resolveMenuPosition(input: {
  clickX: number
  clickY: number
  menuRect: MenuSize
  viewport: ViewportSize
  edgeMargin?: number
}): { left: number; top: number } {
  const edgeMargin = input.edgeMargin ?? DEFAULT_EDGE_MARGIN
  const safeWidth =
    input.viewport.width > 0 ? input.viewport.width : input.menuRect.width + edgeMargin * 2
  const safeHeight =
    input.viewport.height > 0 ? input.viewport.height : input.menuRect.height + edgeMargin * 2

  const maxLeft = Math.max(safeWidth - input.menuRect.width - edgeMargin, edgeMargin)
  const left = Math.max(edgeMargin, Math.min(input.clickX, maxLeft))

  const maxTop = Math.max(safeHeight - input.menuRect.height - edgeMargin, edgeMargin)
  const top = Math.max(edgeMargin, Math.min(input.clickY + edgeMargin, maxTop))

  return { left, top }
}
