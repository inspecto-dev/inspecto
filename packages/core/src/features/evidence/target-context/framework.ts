import type { TargetFrameworkEvidence } from './types.js'
import { collectReactFrameworkEvidence } from './framework-react.js'
import { collectVueFrameworkEvidence } from './framework-vue.js'
export { isLikelyGeneratedComponentName } from './framework-shared.js'

export function collectFrameworkEvidence(element: Element): TargetFrameworkEvidence | undefined {
  return collectReactFrameworkEvidence(element) ?? collectVueFrameworkEvidence(element)
}
