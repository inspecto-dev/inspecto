import { createOverlay } from './overlay.js'
import { showIntentMenu } from './menu.js'
import type { InspectorOptions, HotKey, SourceLocation, HotKeys } from '@inspecto-dev/types'
import { setBaseUrl, fetchIdeInfo } from './http.js'
import { badgeClass, inspectorStyles } from './styles.js'

const ATTR_NAME = 'data-inspecto'

function parseAttrValue(value: string): SourceLocation | null {
  const parts = value.split(':')
  if (parts.length < 3) return null

  const col = parseInt(parts[parts.length - 1]!, 10)
  const line = parseInt(parts[parts.length - 2]!, 10)
  const file = parts.slice(0, parts.length - 2).join(':')

  if (isNaN(line) || isNaN(col) || !file) return null
  return { file, line, column: col }
}

function findInspectable(el: Element | null): Element | null {
  while (el) {
    if (el.hasAttribute(ATTR_NAME)) return el
    el = el.parentElement
  }
  return null
}

function parseHotKeyString(hotKey: string): HotKey[] {
  const keys = hotKey.split('+').map(k => k.trim().toLowerCase())
  const result: HotKey[] = []

  if (keys.includes('alt') || keys.includes('option')) result.push('altKey')
  if (keys.includes('ctrl') || keys.includes('control')) result.push('ctrlKey')
  if (
    keys.includes('meta') ||
    keys.includes('cmd') ||
    keys.includes('command') ||
    keys.includes('win')
  )
    result.push('metaKey')
  if (keys.includes('shift')) result.push('shiftKey')

  return result
}

function hotKeysHeld(event: MouseEvent, hotKeys: string): boolean {
  if (!hotKeys) return false
  const mappedKeys = parseHotKeyString(hotKeys)
  if (mappedKeys.length === 0) return false
  return mappedKeys.every(key => event[key])
}

// Fallback class for SSR environments
const BaseElement =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as typeof HTMLElement)

class InspectoElement extends BaseElement {
  private options: InspectorOptions = {}
  private serverHotKeys: HotKeys | null = null
  private active = false
  private disabled = false
  private isDragging = false
  private hasMoved = false
  private dragStartX = 0
  private dragStartY = 0
  private badgeInitialRight = 16
  private badgeInitialBottom = 16
  private shadowRootEl!: ShadowRoot
  private overlay!: ReturnType<typeof createOverlay>
  private cleanupMenu: (() => void) | null = null
  private badge!: HTMLButtonElement

  connectedCallback(): void {
    this.shadowRootEl = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = inspectorStyles
    this.shadowRootEl.appendChild(style)

    this.overlay = createOverlay(this.shadowRootEl)
    this.badge = this.createBadge()

    this.setupListeners()

    if (this.options.defaultActive) {
      this.setActive(true)
    }
  }

  disconnectedCallback(): void {
    this.teardownListeners()
  }

  configure(options: InspectorOptions): void {
    this.options = options
    if (options.serverUrl) {
      setBaseUrl(options.serverUrl)
    }

    // Apply explicitly configured theme, or fallback to auto (CSS media queries will take over if 'auto' or undefined)
    if (options.theme === 'dark') {
      this.setAttribute('data-theme', 'dark')
    } else if (options.theme === 'light') {
      this.setAttribute('data-theme', 'light')
    } else {
      this.removeAttribute('data-theme')
    }

    // Fetch hotKeys + other runtime config (prompts, targets) from the server.
    // hotKeys deliberately NOT baked into the injected script so that changes to
    // settings.json take effect on page refresh without restarting the dev server.
    fetchIdeInfo(true)
      .then(info => {
        if (info?.hotKeys !== undefined) {
          this.serverHotKeys = info.hotKeys
          this.updateBadgeContent()
        }
        if (info?.theme !== undefined) {
          if (info.theme === 'dark') {
            this.setAttribute('data-theme', 'dark')
          } else if (info.theme === 'light') {
            this.setAttribute('data-theme', 'light')
          } else {
            this.removeAttribute('data-theme')
          }
        }
        if (info?.includeSnippet !== undefined) {
          this.options.includeSnippet = info.includeSnippet
        }
      })
      .catch(() => {})
  }

  private createBadge(): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = badgeClass
    btn.style.display = 'flex'

    const textSpan = document.createElement('span')
    textSpan.textContent = 'Inspecto Ready'

    const closeBtn = document.createElement('span')
    closeBtn.className = `${badgeClass}-close`
    closeBtn.innerHTML = '×'
    closeBtn.title = 'Pause Inspector'
    closeBtn.addEventListener('click', e => {
      e.stopPropagation()
      this.toggleDisabled()
    })

    btn.appendChild(textSpan)
    btn.appendChild(closeBtn)

    // Drag and Drop support
    btn.addEventListener('mousedown', this.onDragStart)

    btn.addEventListener('click', e => {
      // Prevent click if we were dragging
      if (this.hasMoved) {
        this.hasMoved = false
        return
      }

      if (this.disabled) {
        this.toggleDisabled()
      } else {
        this.setActive(!this.active)
      }
    })
    this.shadowRootEl.appendChild(btn)
    return btn
  }

  private readonly onDragStart = (e: MouseEvent): void => {
    // Only allow dragging with primary mouse button
    if (e.button !== 0) return

    // Don't drag if clicking the close button
    if ((e.target as Element).classList?.contains(`${badgeClass}-close`)) return

    e.preventDefault()

    this.isDragging = true
    this.hasMoved = false

    const rect = this.badge.getBoundingClientRect()
    // Calculate the exact offset where the user clicked inside the badge
    this.dragStartX = e.clientX - rect.left
    this.dragStartY = e.clientY - rect.top

    document.addEventListener('mousemove', this.onDragMove)
    document.addEventListener('mouseup', this.onDragEnd)
  }

  private readonly onDragMove = (e: MouseEvent): void => {
    if (!this.isDragging) return
    this.hasMoved = true

    // Calculate new position based on top/left
    let newLeft = e.clientX - this.dragStartX
    let newTop = e.clientY - this.dragStartY

    // Constrain to viewport
    const badgeWidth = this.badge.offsetWidth
    const badgeHeight = this.badge.offsetHeight

    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - badgeWidth))
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - badgeHeight))

    // Disable transition during drag for smoothness
    this.badge.style.transition = 'none'
    // Clear right/bottom to avoid conflicts
    this.badge.style.right = 'auto'
    this.badge.style.bottom = 'auto'
    this.badge.style.left = `${newLeft}px`
    this.badge.style.top = `${newTop}px`
  }

  private readonly onDragEnd = (): void => {
    document.removeEventListener('mousemove', this.onDragMove)
    document.removeEventListener('mouseup', this.onDragEnd)

    // Re-enable transitions
    this.badge.style.transition = ''

    // If it was just a click, reset isDragging state immediately
    // Otherwise, leave it true so the click handler knows to ignore the event
    setTimeout(() => {
      this.isDragging = false
    }, 0)
  }

  private toggleDisabled(): void {
    this.disabled = !this.disabled
    if (this.disabled) {
      this.active = false
      this.overlay.hide()
      this.cleanupMenu?.()
      this.cleanupMenu = null
    }
    this.updateBadgeContent()
  }

  private dismiss(): void {
    this.badge.style.display = 'none'
    this.setActive(false)
  }

  private getHotKeyHint(): string {
    const hotKeys = this.getEffectiveHotKeys()
    if (hotKeys === false) return 'Inspecto Ready'

    // Check if mac
    const isMac =
      typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

    const keys = hotKeys.split('+').map(k => k.trim().toLowerCase())
    const displayKeys = keys.map(k => {
      if (k === 'alt' || k === 'option') return isMac ? '⌥' : 'Alt'
      if (k === 'cmd' || k === 'meta' || k === 'win' || k === 'command') return isMac ? '⌘' : 'Win'
      if (k === 'ctrl' || k === 'control') return isMac ? '⌃' : 'Ctrl'
      if (k === 'shift') return isMac ? '⇧' : 'Shift'
      return k.charAt(0).toUpperCase() + k.slice(1)
    })

    return `Hold ${displayKeys.join(' + ')} to Inspect`
  }

  private getEffectiveHotKeys(): HotKeys {
    if (this.options.hotKeys !== undefined) return this.options.hotKeys
    if (this.serverHotKeys !== null) return this.serverHotKeys
    return 'alt'
  }

  private updateBadgeContent(): void {
    const textSpan = this.badge.querySelector('span')
    if (!textSpan) return

    if (this.disabled) {
      textSpan.textContent = 'Inspector Paused'
      this.badge.classList.remove('active')
      this.badge.classList.add('disabled')
    } else if (this.active) {
      textSpan.textContent = '🔍 Inspecting...'
      this.badge.classList.remove('disabled')
      this.badge.classList.add('active')
    } else {
      textSpan.textContent = this.getHotKeyHint()
      this.badge.classList.remove('active', 'disabled')
    }
  }

  private setActive(value: boolean): void {
    this.active = value
    this.updateBadgeContent()

    if (!value) {
      this.overlay.hide()
      this.cleanupMenu?.()
      this.cleanupMenu = null
    }
  }

  private readonly onMouseMove = (e: MouseEvent): void => {
    const isActive = this.isInspectorActive(e)
    if (!isActive) {
      this.overlay.hide()
      return
    }

    const target = findInspectable(e.target as Element)
    if (!target) {
      this.overlay.hide()
      return
    }

    const attrValue = target.getAttribute(ATTR_NAME)!
    const loc = parseAttrValue(attrValue)
    const label = loc ? `${loc.file.split('/').pop() ?? ''}:${loc.line}` : attrValue

    this.overlay.show(target, label)
    e.stopPropagation()
  }

  private readonly onClick = (e: MouseEvent): void => {
    this.handleTrigger(e)
  }

  private readonly onContextMenu = (e: MouseEvent): void => {
    if (this.isInspectorActive(e)) {
      this.handleTrigger(e)
    }
  }

  private handleTrigger(e: MouseEvent): void {
    if (!this.isInspectorActive(e)) return

    const target = findInspectable(e.target as Element)
    if (!target) return

    e.preventDefault()
    e.stopPropagation()

    const attrValue = target.getAttribute(ATTR_NAME)!
    const loc = parseAttrValue(attrValue)
    if (!loc) return

    this.cleanupMenu?.()

    this.cleanupMenu = showIntentMenu(
      this.shadowRootEl,
      loc,
      e.clientX,
      e.clientY,
      this.options,
      () => {
        this.cleanupMenu = null
      },
    )
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.cleanupMenu?.()
      this.overlay.hide()
    }
  }

  private isInspectorActive(e: MouseEvent): boolean {
    if (this.disabled) return false
    if (this.active) return true

    const hotKeys = this.getEffectiveHotKeys()
    if (hotKeys === false) return false
    return hotKeysHeld(e, hotKeys)
  }

  private setupListeners(): void {
    document.addEventListener('mousemove', this.onMouseMove, true)
    document.addEventListener('click', this.onClick, true)
    document.addEventListener('contextmenu', this.onContextMenu, true)
    document.addEventListener('keydown', this.onKeyDown, true)
  }

  private teardownListeners(): void {
    document.removeEventListener('mousemove', this.onMouseMove, true)
    document.removeEventListener('click', this.onClick, true)
    document.removeEventListener('contextmenu', this.onContextMenu, true)
    document.removeEventListener('keydown', this.onKeyDown, true)
  }
}

if (typeof customElements !== 'undefined') {
  customElements.define('inspecto-overlay', InspectoElement)
}

export { InspectoElement }
