import { createAnnotateOverlay } from '../features/annotate/overlay/index.js'
import { updateLauncherEye as syncLauncherEye } from './launcher.js'
import {
  handleKeyDown as handleInspectorKeyDown,
  handleMouseMove as handleInspectorMouseMove,
  handleTrigger as handleInspectorTrigger,
  handleViewportChange as handleInspectorViewportChange,
} from './interactions.js'
import {
  isInspectorActive,
  setupListeners as setupInspectorListeners,
  teardownListeners as teardownInspectorListeners,
} from './mode-ui.js'
import {
  configure as configureInspector,
  connect as connectInspector,
  disconnect as disconnectInspector,
  setMode as setInspectorMode,
} from './lifecycle.js'
import type { InspectorMode, InspectoOptions } from './inspecto-state.js'
import { InspectoRuntimeHost } from './inspecto-host.js'

class InspectoElement extends InspectoRuntimeHost {
  private readonly onFocusChange = (): void => {
    this.updateLauncherEye()
  }

  connectedCallback(): void {
    connectInspector(
      this,
      root => createAnnotateOverlay(root),
      () => setupInspectorListeners(this, this.listenerHandlers),
    )
  }

  disconnectedCallback(): void {
    disconnectInspector(this, () => teardownInspectorListeners(this, this.listenerHandlers))
  }

  configure(options: InspectoOptions): void {
    configureInspector(this, options)
  }

  setMode(mode: InspectorMode): void {
    setInspectorMode(this, mode)
  }

  getMode(): InspectorMode {
    return this.mode
  }

  private readonly onMouseMove = (e: MouseEvent): void => {
    handleInspectorMouseMove(this, e)
  }

  private readonly onClick = (e: MouseEvent): void => {
    this.handleTrigger(e)
  }

  private readonly onContextMenu = (e: MouseEvent): void => {
    if (isInspectorActive(this, e)) {
      this.handleTrigger(e)
    }
  }

  private handleTrigger(e: MouseEvent): void {
    handleInspectorTrigger(this, e)
  }

  private updateLauncherEye(): void {
    syncLauncherEye(this)
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    handleInspectorKeyDown(this, e)
  }

  private readonly onViewportChange = (): void => {
    handleInspectorViewportChange(this)
  }

  private readonly listenerHandlers = {
    onMouseMove: this.onMouseMove,
    onClick: this.onClick,
    onContextMenu: this.onContextMenu,
    onKeyDown: this.onKeyDown,
    onFocusChange: this.onFocusChange,
    onViewportChange: this.onViewportChange,
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('inspecto-overlay')) {
  customElements.define('inspecto-overlay', InspectoElement)
}

export type { InspectorMode } from './inspecto-state.js'
export { InspectoElement }
