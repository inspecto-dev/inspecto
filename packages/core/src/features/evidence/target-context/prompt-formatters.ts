import type {
  TargetEvidence,
  TargetFrameworkRenderNode,
  TargetFrameworkSourceEvidence,
} from './types.js'
import { isLikelyGeneratedComponentName } from './framework-shared.js'
import { formatElement } from './prompt-element.js'

export function formatTargetEvidenceForPrompt(evidence: TargetEvidence | null | undefined): string {
  if (!evidence) return ''
  const framework = evidence.framework
  const hasReliableFrameworkEvidence = framework?.confidence === 'high'

  if (hasReliableFrameworkEvidence) return formatFrameworkEvidenceForPrompt(framework)

  const lines = [
    'Selected target evidence:',
    'Inspecto collected runtime target evidence for this element. Treat the following as heuristic evidence and infer likely source files/components from the repository.',
    `- page: ${evidence.page.url || evidence.page.route || 'unknown'}`,
    `- element: ${formatElement(evidence)}`,
    `- selector: ${evidence.selectors.stableCss ?? evidence.selectors.css}`,
  ]

  if (evidence.element.text) lines.push(`- text: ${evidence.element.text}`)
  if (evidence.element.ariaLabel) lines.push(`- aria-label: ${evidence.element.ariaLabel}`)
  if (evidence.sourceHints.classTokens.length > 0) {
    lines.push(`- class hints: ${evidence.sourceHints.classTokens.join(', ')}`)
  }
  if (evidence.sourceHints.likelyFileNames.length > 0) {
    lines.push(`- likely file/component tokens: ${evidence.sourceHints.likelyFileNames.join(', ')}`)
  }
  if (evidence.context.nearbyText.length > 0) {
    lines.push(`- nearby text: ${evidence.context.nearbyText.join(' | ')}`)
  }
  if (framework) lines.push(formatFrameworkEvidenceForPrompt(framework))

  return lines.join('\n')
}

function formatFrameworkEvidenceForPrompt(
  framework: NonNullable<TargetEvidence['framework']>,
): string {
  const hasReliableFrameworkEvidence = framework.confidence === 'high'
  const includeComponentSources = !hasReliableFrameworkEvidence
  const includeRenderPath = !hasReliableFrameworkEvidence
  const readableOwnerChain = framework.ownerChain.filter(
    name => !isLikelyGeneratedComponentName(name),
  )
  const hasReadableComponentName = !isLikelyGeneratedComponentName(framework.componentName)
  const renderPath = includeRenderPath ? formatFrameworkRenderPath(framework.renderPath) : undefined

  return [
    'Framework evidence:',
    `- framework: ${framework.name}`,
    ...(hasReadableComponentName ? [`- component: ${framework.componentName}`] : []),
    ...(readableOwnerChain.length > 0 ? [`- owner chain: ${readableOwnerChain.join(' > ')}`] : []),
    `- prop keys: ${framework.propKeys.join(', ') || 'unknown'}`,
    ...(renderPath
      ? [
          `- ${framework.name === 'vue' ? 'vue component path' : 'react render path'}: ${renderPath}`,
        ]
      : []),
    ...(framework.source ? [`- source: ${formatFrameworkSource(framework.source)}`] : []),
    ...(includeComponentSources && framework.componentSources?.length
      ? [
          `- component render sources: ${framework.componentSources
            .map(source => `${source.componentName} (${formatFrameworkSource(source)})`)
            .join(' > ')}`,
        ]
      : []),
    `- confidence: ${framework.confidence}`,
  ].join('\n')
}

function formatFrameworkRenderPath(
  renderPath: TargetFrameworkRenderNode[] | undefined,
): string | undefined {
  const segments = renderPath?.map(formatFrameworkRenderNode).filter(Boolean)
  return segments?.length ? segments.join(' > ') : undefined
}

function formatFrameworkRenderNode(node: TargetFrameworkRenderNode): string | undefined {
  if (node.kind === 'host') return `${node.name}${node.selector ?? ''}`

  const props = node.propKeys.length > 0 ? ` props(${node.propKeys.join(', ')})` : ''
  if (isLikelyGeneratedComponentName(node.name)) return props ? `component${props}` : undefined
  return `${node.name}${props}`
}

function formatFrameworkSource(source: TargetFrameworkSourceEvidence): string {
  return [source.file, source.line, source.column].filter(Boolean).join(':')
}
