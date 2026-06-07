import { TARGET_EVIDENCE_BUDGET } from './budget.js'

const MAX_TEXT_LENGTH = 160
const SENSITIVE_ATTRIBUTE_PATTERN =
  /(^value$|token|secret|password|passwd|authorization|credential|session|cookie|key|email|phone|tel|user[-_]?id|account[-_]?id|customer[-_]?id|card|payment)/i
const URL_ATTRIBUTE_PATTERN = /^(href|src|action|formaction)$/i
const SENSITIVE_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]'],
  [/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, '[redacted-number]'],
  [
    /\b(token|secret|password|passwd|authorization|credential|session|cookie|api[_-]?key)\s*[:=]\s*\S+/gi,
    '[redacted-secret]',
  ],
]

export function compactText(
  value: string | null | undefined,
  maxLength = MAX_TEXT_LENGTH,
): string | undefined {
  const normalized = redactSensitiveText(value?.replace(/\s+/g, ' ').trim())
  if (!normalized) return undefined
  if (normalized.length <= maxLength) return normalized
  return normalized.slice(0, maxLength - 1).trimEnd() + '…'
}

export function sanitizeAttribute(name: string, value: string): string {
  if (SENSITIVE_ATTRIBUTE_PATTERN.test(name)) return '[redacted]'
  if (URL_ATTRIBUTE_PATTERN.test(name)) return sanitizeUrl(value) ?? ''
  return compactText(value) ?? ''
}

export function sanitizeUrl(value: string | null | undefined): string | undefined {
  const compacted = compactText(value)
  if (!compacted) return undefined

  try {
    const url = new URL(compacted, globalThis.location?.href)
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return compacted.replace(/[?#].*$/, '')
  }
}

export function sanitizeAttributes(element: Element): Record<string, string> {
  const result: Record<string, string> = {}
  for (const attribute of Array.from(element.attributes).slice(
    0,
    TARGET_EVIDENCE_BUDGET.maxAttributes,
  )) {
    result[attribute.name] = sanitizeAttribute(attribute.name, attribute.value)
  }
  return result
}

export function uniqueDefined(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim()))))
}

function redactSensitiveText(value: string | undefined): string | undefined {
  if (!value) return undefined
  return SENSITIVE_TEXT_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  )
}
