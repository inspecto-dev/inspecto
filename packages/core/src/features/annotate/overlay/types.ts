export type SelectedTargetOverlayEntry = {
  id: string
  element: Element
  order: number
  state?: 'current' | 'saved' | 'completed'
  note?: string
  onActivate?: () => void
}
