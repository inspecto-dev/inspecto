import type { AiIntentConfig, RuntimeContextEnvelope, SourceLocation } from '@inspecto-dev/types'
import { isFixIntent } from './helpers.js'
import { getRuntimeToggleAriaPressed, type RuntimeContextDefaultMode } from './runtime-toggle.js'

export type InspectMenuRuntimeContextResolverInput = {
  canAttachRuntimeContext: boolean
  runtimeContextPreference: boolean | null
  runtimeContextDefaultMode: RuntimeContextDefaultMode
  location: SourceLocation
  getRuntimeContext?: (location: SourceLocation) => RuntimeContextEnvelope | null
  intent?: Pick<AiIntentConfig, 'id' | 'aiIntent'>
}

export function resolveInspectMenuRuntimeContext({
  canAttachRuntimeContext,
  runtimeContextPreference,
  runtimeContextDefaultMode,
  location,
  getRuntimeContext,
  intent,
}: InspectMenuRuntimeContextResolverInput): RuntimeContextEnvelope | null {
  if (!canAttachRuntimeContext) return null

  const ariaPressed = getRuntimeToggleAriaPressed(
    runtimeContextPreference,
    runtimeContextDefaultMode,
  )
  const shouldAttach =
    ariaPressed === 'true' || (ariaPressed === 'mixed' && Boolean(intent && isFixIntent(intent)))

  if (!shouldAttach) return null
  return getRuntimeContext?.(location) ?? null
}
