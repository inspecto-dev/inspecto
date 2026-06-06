import type { InspectoOptions, InspectorMode } from './inspecto-state.js'
import type { IdeType } from '@inspecto-dev/types'

export type InspectModeAvailabilityInput = {
  ide: IdeType
  deliveryMode: 'ide' | 'mcp'
  ideConnectionKnown?: boolean
  ideConnected?: boolean
}

export function canUseInspectMode(input: InspectModeAvailabilityInput): boolean {
  if (input.ide === 'none') return false
  if (input.deliveryMode === 'mcp' && input.ideConnectionKnown && !input.ideConnected) {
    return false
  }
  return true
}

export function shouldFallbackToAnnotateMode(
  input: InspectModeAvailabilityInput & { mode: InspectorMode },
): boolean {
  return input.mode === 'inspect' && !canUseInspectMode(input)
}

export function getThemeAttributeValue(theme?: 'light' | 'dark' | 'auto'): 'light' | 'dark' | null {
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  return null
}

export function buildI18nConfig(input: {
  locale?: InspectoOptions['locale']
  messages?: InspectoOptions['messages']
}): {
  locale?: NonNullable<InspectoOptions['locale']>
  messages?: NonNullable<InspectoOptions['messages']>
} {
  const config: {
    locale?: NonNullable<InspectoOptions['locale']>
    messages?: NonNullable<InspectoOptions['messages']>
  } = {}
  if (input.locale !== undefined) {
    config.locale = input.locale
  }
  if (input.messages !== undefined) {
    config.messages = input.messages
  }
  return config
}

export function mergeServerRuntimeContext(
  current: InspectoOptions['runtimeContext'],
  incoming: NonNullable<InspectoOptions['runtimeContext']>,
): NonNullable<InspectoOptions['runtimeContext']> {
  return {
    ...current,
    ...incoming,
  }
}
