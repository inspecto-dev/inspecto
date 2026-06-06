import type { RuntimeEvidenceRecord } from '@inspecto-dev/types'
import {
  buildRecordId,
  cloneRuntimeRecord,
  isNoisyInput,
  type CollectorRecordInput,
} from './shared.js'

export function createRuntimeContextCollector(maxAgeMs = 60_000) {
  const records = new Map<string, RuntimeEvidenceRecord>()

  function normalize(input: CollectorRecordInput): RuntimeEvidenceRecord | null {
    if (isNoisyInput(input)) return null

    const id = buildRecordId(input)
    const existing = records.get(id)
    if (existing) {
      existing.occurrenceCount += 1
      existing.timestamp = Math.max(existing.timestamp, input.timestamp)
      return existing
    }

    return {
      id,
      kind: input.kind,
      timestamp: input.timestamp,
      message: input.message,
      occurrenceCount: 1,
      relevanceScore: 0,
      relevanceLevel: 'low',
      relevanceReasons: [],
      ...(input.stack ? { stack: input.stack } : {}),
      ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
      ...(input.sourceFile ? { sourceFile: input.sourceFile } : {}),
      ...(input.route ? { route: input.route } : {}),
      ...(input.componentHints ? { componentHints: input.componentHints } : {}),
      ...(input.request ? { request: input.request } : {}),
    }
  }

  function upsert(input: CollectorRecordInput): void {
    prune(input.timestamp)
    const normalized = normalize(input)
    if (!normalized) return
    records.set(normalized.id, normalized)
  }

  function prune(now: number): void {
    for (const [id, record] of records) {
      if (now - record.timestamp > maxAgeMs) {
        records.delete(id)
      }
    }
  }

  return {
    recordError(input: Omit<CollectorRecordInput, 'kind'>) {
      upsert({ ...input, kind: 'runtime-error' })
    },
    recordPromiseRejection(input: Omit<CollectorRecordInput, 'kind'>) {
      upsert({ ...input, kind: 'promise-rejection' })
    },
    recordConsoleError(input: Omit<CollectorRecordInput, 'kind'>) {
      upsert({ ...input, kind: 'console-error' })
    },
    recordFailedRequest(input: Omit<CollectorRecordInput, 'kind'>) {
      upsert({ ...input, kind: 'failed-request' })
    },
    snapshot() {
      prune(Date.now())
      return {
        records: Array.from(records.values()).map(cloneRuntimeRecord),
      }
    },
    clear() {
      records.clear()
    },
  }
}
