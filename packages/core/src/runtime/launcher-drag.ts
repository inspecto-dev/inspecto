import { badgeClass } from '../shared/styles/index.js'

export type LauncherDragController = {
  attach(): void
  isDragging(): boolean
}

export function createLauncherDragController(badge: HTMLDivElement): LauncherDragController {
  let isDragging = false
  let dragStartX = 0
  let dragStartY = 0
  let initialBadgeX = 0
  let initialBadgeY = 0

  function getPointerPosition(event: MouseEvent | TouchEvent): { x: number; y: number } {
    if (event.type.startsWith('touch')) {
      const touch = (event as TouchEvent).touches[0] ?? (event as TouchEvent).changedTouches[0]
      return { x: touch!.clientX, y: touch!.clientY }
    }
    return { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY }
  }

  function handleDragStart(event: MouseEvent | TouchEvent): void {
    const target = event.target as Element
    if (
      target.closest(`.${badgeClass}-panel`) ||
      target.closest('[data-inspecto-launcher-action]')
    ) {
      return
    }

    if (event.type === 'mousedown' && (event as MouseEvent).button !== 0) return

    const pointer = getPointerPosition(event)
    dragStartX = pointer.x
    dragStartY = pointer.y

    const rect = badge.getBoundingClientRect()
    initialBadgeX = rect.left
    initialBadgeY = rect.top
    isDragging = false

    document.addEventListener('mousemove', handleDragMove, { passive: false })
    document.addEventListener('mouseup', handleDragEnd)
    document.addEventListener('touchmove', handleDragMove, { passive: false })
    document.addEventListener('touchend', handleDragEnd)
  }

  function handleDragMove(event: MouseEvent | TouchEvent): void {
    const pointer = getPointerPosition(event)
    const dx = pointer.x - dragStartX
    const dy = pointer.y - dragStartY

    if (!isDragging && Math.hypot(dx, dy) > 5) {
      isDragging = true
      badge.style.transition = 'none'
    }

    if (!isDragging) return

    event.preventDefault()

    const maxX = window.innerWidth - badge.offsetWidth
    const maxY = window.innerHeight - badge.offsetHeight
    const newX = Math.max(0, Math.min(initialBadgeX + dx, maxX))
    const newY = Math.max(0, Math.min(initialBadgeY + dy, maxY))

    badge.style.bottom = 'auto'
    badge.style.right = 'auto'
    badge.style.left = `${newX}px`
    badge.style.top = `${newY}px`
  }

  function handleDragEnd(): void {
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
    document.removeEventListener('touchmove', handleDragMove)
    document.removeEventListener('touchend', handleDragEnd)

    if (!isDragging) return

    badge.style.transition = ''
    setTimeout(() => {
      isDragging = false
    }, 0)
  }

  function attach(): void {
    badge.addEventListener('mousedown', handleDragStart)
    badge.addEventListener('touchstart', handleDragStart, { passive: false })
  }

  return {
    attach,
    isDragging: () => isDragging,
  }
}
