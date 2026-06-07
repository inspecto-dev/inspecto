export const MAX_OWNER_DEPTH = 8
export const HOST_COMPONENT_PATTERN = /^[a-z][a-z0-9-]*$/

const MINIFIED_COMPONENT_NAME_PATTERN = /^(?:[a-z]|[a-z]\d+)$/

export function isLikelyGeneratedComponentName(name: string): boolean {
  return MINIFIED_COMPONENT_NAME_PATTERN.test(name.trim())
}

export function getDisplayName(value: unknown): string | undefined {
  if (typeof value === 'string') return HOST_COMPONENT_PATTERN.test(value) ? undefined : value
  if (typeof value !== 'function' && (typeof value !== 'object' || value === null)) return undefined

  const record = value as Record<string, unknown>
  const displayName = stringValue(record.displayName) ?? stringValue(record.name)
  if (displayName) return displayName

  const nestedType = record.type ?? record.render
  if (nestedType && nestedType !== value) return getDisplayName(nestedType)
  return undefined
}

export function getObjectKeys(value: unknown): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return []
  return Object.keys(value)
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined
}

export function normalizeSourceFile(value: string | undefined): string | undefined {
  return value?.replace(/[?#].*$/, '')
}

export function numberField(
  key: 'line' | 'column',
  value: unknown,
): Partial<Record<'line' | 'column', number>> {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? { [key]: value } : {}
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
