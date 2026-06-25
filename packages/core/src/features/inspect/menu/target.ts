import type { SourceLocation } from '@inspecto-dev/types'
import type { TargetEvidence } from '../../evidence/target-context/index.js'

export type InspectMenuTargetContext = {
  location: SourceLocation | null
  targetLabel?: string
  targetEvidence?: TargetEvidence
}

export function hasSourceLocation(
  target: InspectMenuTargetContext,
): target is InspectMenuTargetContext & { location: SourceLocation } {
  return Boolean(target.location)
}

export function getSourceLocation(target: InspectMenuTargetContext): SourceLocation | null {
  return target.location
}
