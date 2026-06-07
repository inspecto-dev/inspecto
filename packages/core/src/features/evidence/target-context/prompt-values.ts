import type { TargetEvidence } from './types.js'
import { formatElement } from './prompt-element.js'

export function createTargetEvidencePromptValues(
  evidence: TargetEvidence | null | undefined,
): Record<string, string> {
  const elementName = evidence ? formatElement(evidence) : 'selected DOM target'
  const route = evidence?.page.route || evidence?.page.url || 'unknown page'
  const source = evidence?.framework?.source

  return {
    framework: 'UI',
    file: source?.file ?? `Target evidence for ${route}`,
    line: source?.line ? String(source.line) : 'unknown',
    column: source?.column ? String(source.column) : 'unknown',
    ext: getSourceExtension(source?.file) ?? 'html',
    name: elementName,
    selector: evidence?.selectors.stableCss ?? evidence?.selectors.css ?? elementName,
    text: evidence?.element.text ?? '',
    route,
    page: evidence?.page.url || route,
  }
}

function getSourceExtension(file: string | undefined): string | undefined {
  const match = file?.match(/\.([a-z0-9]+)$/i)
  return match?.[1]
}
