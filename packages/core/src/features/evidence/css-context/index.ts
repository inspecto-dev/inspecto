import type { SourceLocation } from '@inspecto-dev/types'

export type CssContextEntry = {
  label?: string
  selector?: string
  location?: SourceLocation
  summary: string
}

export function appendCssContextToPrompt(
  prompt: string,
  cssContextPrompt: string | null | undefined,
): string {
  if (!cssContextPrompt?.trim()) return prompt
  return `${prompt}\n\n${cssContextPrompt.trim()}`
}

export function buildCssContextPrompt(entries: CssContextEntry[]): string | null {
  if (entries.length === 0) return null

  const lines = ['Relevant CSS context:']

  for (const entry of entries) {
    lines.push(`- ${entry.label ?? 'Unknown target'}`)
    if (entry.location) {
      lines.push(`file=${entry.location.file}:${entry.location.line}:${entry.location.column}`)
    }
    lines.push(`computed: ${entry.summary}`)
  }

  return lines.join('\n')
}

export function captureCssContextEntry(input: {
  element: Element
  label?: string
  selector?: string
  location?: SourceLocation
}): CssContextEntry | null {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return null
  }

  const styles = window.getComputedStyle(input.element)
  const summary = buildStyleSummary(styles)
  if (!summary) return null

  return {
    ...(input.label ? { label: input.label } : {}),
    ...(input.selector ? { selector: input.selector } : {}),
    ...(input.location ? { location: input.location } : {}),
    summary,
  }
}

function buildStyleSummary(styles: CSSStyleDeclaration): string {
  const parts = [
    formatToken('display', styles.display),
    formatToken('position', styles.position),
    formatBoxToken('margin', styles.margin),
    formatBoxToken('padding', styles.padding),
    formatToken('gap', styles.gap, { skip: ['normal', '0px'] }),
    formatToken('align-items', styles.alignItems, { skip: ['normal', 'stretch'] }),
    formatToken('justify-content', styles.justifyContent, { skip: ['normal', 'flex-start'] }),
    formatToken('font-size', styles.fontSize),
    formatToken('line-height', styles.lineHeight, { skip: ['normal'] }),
    formatToken('font-weight', styles.fontWeight, { skip: ['400', 'normal'] }),
    formatToken('color', styles.color),
    formatToken('background', styles.backgroundColor, {
      skip: ['rgba(0, 0, 0, 0)', 'transparent'],
    }),
    formatToken('border', styles.border, { skip: ['0px none rgb(0, 0, 0)', 'none'] }),
    formatToken('border-radius', styles.borderRadius, { skip: ['0px'] }),
    formatToken('box-shadow', styles.boxShadow, { skip: ['none'] }),
    formatToken('opacity', styles.opacity, { skip: ['1'] }),
  ].filter(Boolean)

  return parts.join('; ')
}

function formatBoxToken(label: string, value: string): string | null {
  return formatToken(label, normalizeWhitespace(value), {
    skip: ['0px', '0px 0px 0px 0px', '0px 0px'],
  })
}

function formatToken(
  label: string,
  value: string,
  options: { skip?: string[] } = {},
): string | null {
  const normalized = normalizeWhitespace(value)
  if (!normalized || options.skip?.includes(normalized)) return null
  return `${label}=${normalized}`
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}
