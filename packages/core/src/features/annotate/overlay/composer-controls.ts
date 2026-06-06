import { t } from '../../../shared/i18n.js'
import { applyComposerRuntimeButtonState, formatRuntimeErrorCount } from './helpers.js'

type ComposerControlTokens = {
  surfaceSubtle(): string
  borderSubtle(): string
  textSecondary(): string
  accentPrimary(): string
  accentPrimaryStrong(): string
  shadowAccent(): string
}

type ComposerControlsDom = {
  composerCssButton: HTMLButtonElement
  composerRuntimeButton: HTMLButtonElement
  composerRuntimeBadge: HTMLElement
}

type ComposerControlOptions = {
  canAttachCssContext?: boolean
  cssContextEnabled?: boolean
  canAttachRuntimeContext?: boolean
  runtimeContextEnabled?: boolean
  runtimeContextSummary?: string
  runtimeErrorCount?: number
  onToggleCssContext?: () => void
  onToggleRuntimeContext?: () => void
}

export function renderComposerControls(
  dom: ComposerControlsDom,
  tokens: ComposerControlTokens,
  options: ComposerControlOptions,
): void {
  const { composerCssButton, composerRuntimeButton, composerRuntimeBadge } = dom

  composerCssButton.style.display = options.canAttachCssContext ? 'inline-flex' : 'none'
  composerCssButton.setAttribute('aria-pressed', options.cssContextEnabled ? 'true' : 'false')
  composerCssButton.dataset.visualState = options.cssContextEnabled ? 'active' : 'inactive'
  composerCssButton.title = options.cssContextEnabled ? t('menu.cssEnabled') : t('menu.attachCss')
  applyComposerRuntimeButtonState(composerCssButton, tokens, options.cssContextEnabled === true)
  composerCssButton.onclick = () => options.onToggleCssContext?.()

  composerRuntimeButton.style.display = options.canAttachRuntimeContext ? 'inline-flex' : 'none'
  composerRuntimeButton.setAttribute(
    'aria-pressed',
    options.runtimeContextEnabled ? 'true' : 'false',
  )
  composerRuntimeButton.dataset.visualState = options.runtimeContextEnabled ? 'active' : 'inactive'

  const runtimeErrorCount = options.runtimeErrorCount ?? 0
  const formattedErrorCount = formatRuntimeErrorCount(runtimeErrorCount)
  composerRuntimeBadge.textContent = formattedErrorCount
  composerRuntimeBadge.style.display =
    options.runtimeContextEnabled && runtimeErrorCount > 0 ? '' : 'none'
  composerRuntimeButton.title = getRuntimeButtonTitle(
    options,
    runtimeErrorCount,
    formattedErrorCount,
  )
  applyComposerRuntimeButtonState(
    composerRuntimeButton,
    tokens,
    options.runtimeContextEnabled === true,
  )
  composerRuntimeButton.onclick = () => options.onToggleRuntimeContext?.()
}

export function resetComposerControls(
  dom: ComposerControlsDom,
  tokens: ComposerControlTokens,
): void {
  const { composerCssButton, composerRuntimeButton, composerRuntimeBadge } = dom

  composerCssButton.style.display = 'none'
  composerCssButton.onclick = null
  composerCssButton.setAttribute('aria-pressed', 'false')
  composerCssButton.dataset.visualState = 'inactive'
  composerCssButton.title = t('menu.attachCss')
  applyComposerRuntimeButtonState(composerCssButton, tokens, false)

  composerRuntimeButton.style.display = 'none'
  composerRuntimeButton.onclick = null
  composerRuntimeButton.setAttribute('aria-pressed', 'false')
  composerRuntimeButton.dataset.visualState = 'inactive'
  composerRuntimeButton.title = t('menu.attachRuntime')
  applyComposerRuntimeButtonState(composerRuntimeButton, tokens, false)

  composerRuntimeBadge.textContent = ''
  composerRuntimeBadge.style.display = 'none'
}

function getRuntimeButtonTitle(
  options: ComposerControlOptions,
  runtimeErrorCount: number,
  formattedErrorCount: string,
): string {
  if (options.runtimeContextEnabled) {
    if (runtimeErrorCount > 0) {
      return `${t('menu.runtimeEnabled')} • ${t('annotate.runtimeErrors', {
        count: formattedErrorCount,
      })}`
    }

    if (options.runtimeContextSummary) {
      return `${t('menu.runtimeEnabled')} • ${options.runtimeContextSummary}`
    }

    return t('menu.runtimeEnabled')
  }

  if (runtimeErrorCount > 0) {
    return `${t('menu.attachRuntime')} • ${t('annotate.runtimeErrors', {
      count: formattedErrorCount,
    })}`
  }

  return t('menu.attachRuntime')
}
