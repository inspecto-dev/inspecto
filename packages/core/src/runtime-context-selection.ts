import type {
  RuntimeContextEnvelope,
  RuntimeContextSummary,
  RuntimeEvidenceLevel,
  RuntimeEvidenceRecord,
  SourceLocation,
} from '@inspecto-dev/types'
import {
  cloneRuntimeRecord,
  compareRankedRuntimeEvidence,
  matchesTargetFile,
  stackReferencesLocation,
  type RuntimeEvidenceLimits,
} from './runtime-context-shared.js'

export function rankRuntimeEvidence(
  records: RuntimeEvidenceRecord[],
  location: SourceLocation,
): RuntimeEvidenceRecord[] {
  return records
    .map(record => {
      const relevanceReasons: string[] = []
      let relevanceScore = 0

      if (record.stack && stackReferencesLocation(record.stack, location.file)) {
        relevanceScore += 0.6
        relevanceReasons.push('stack references target file')
      }

      if (
        matchesTargetFile(record.sourceFile, location.file) ||
        matchesTargetFile(record.sourceUrl, location.file)
      ) {
        relevanceScore += 0.15
        relevanceReasons.push('source file matches target file')
      }

      if (record.kind === 'runtime-error') {
        relevanceScore += 0.2
        relevanceReasons.push('runtime error')
      } else if (record.kind === 'promise-rejection') {
        relevanceScore += 0.15
        relevanceReasons.push('promise rejection')
      } else if (record.kind === 'console-error') {
        relevanceScore += 0.1
        relevanceReasons.push('console error')
      } else {
        relevanceScore += 0.2
        relevanceReasons.push('failed request')
        if (record.request?.pathname || record.request?.url) {
          relevanceScore += 0.15
          relevanceReasons.push('request failed during active session')
        }
      }

      if (record.occurrenceCount > 1) {
        relevanceScore += Math.min(0.15, (record.occurrenceCount - 1) * 0.05)
        relevanceReasons.push(`seen ${record.occurrenceCount} times`)
      }

      if (record.route && record.route === location.file) {
        relevanceScore += 0.05
        relevanceReasons.push('route matches target file')
      }

      if (record.message.includes(location.file)) {
        relevanceScore += 0.1
        relevanceReasons.push('message references target file')
      }

      if (record.stack?.includes(`${location.line}:${location.column}`)) {
        relevanceScore += 0.1
        relevanceReasons.push('stack references target location')
      }

      const normalizedScore = Math.min(1, relevanceScore)
      const relevanceLevel: RuntimeEvidenceLevel =
        normalizedScore >= 0.7 ? 'high' : normalizedScore >= 0.35 ? 'medium' : 'low'

      return {
        ...cloneRuntimeRecord(record),
        relevanceScore: normalizedScore,
        relevanceLevel,
        relevanceReasons,
      }
    })
    .sort(compareRankedRuntimeEvidence)
}

export function selectRuntimeEvidence(
  records: RuntimeEvidenceRecord[],
  location: SourceLocation | SourceLocation[],
  limits: RuntimeEvidenceLimits = {},
): RuntimeEvidenceRecord[] {
  const locations = Array.isArray(location) ? location : [location]
  if (locations.length === 0 || records.length === 0) return []

  const bestById = new Map<string, RuntimeEvidenceRecord>()

  for (const candidateLocation of locations) {
    for (const rankedRecord of rankRuntimeEvidence(records, candidateLocation)) {
      const existing = bestById.get(rankedRecord.id)
      if (!existing || compareRankedRuntimeEvidence(rankedRecord, existing) < 0) {
        bestById.set(rankedRecord.id, rankedRecord)
      }
    }
  }

  const ranked = Array.from(bestById.values())
    .filter(record => record.relevanceLevel !== 'low')
    .sort(compareRankedRuntimeEvidence)

  const maxRuntimeErrors = limits.maxRuntimeErrors ?? Number.POSITIVE_INFINITY
  const maxFailedRequests = limits.maxFailedRequests ?? Number.POSITIVE_INFINITY

  const selected: RuntimeEvidenceRecord[] = []
  let runtimeErrorCount = 0
  let failedRequestCount = 0

  for (const record of ranked) {
    if (record.kind === 'failed-request') {
      if (failedRequestCount >= maxFailedRequests) continue
      failedRequestCount += 1
      selected.push(record)
      continue
    }

    if (runtimeErrorCount >= maxRuntimeErrors) continue
    runtimeErrorCount += 1
    selected.push(record)
  }

  return selected
}

export function summarizeRuntimeContext(records: RuntimeEvidenceRecord[]): RuntimeContextSummary {
  return {
    runtimeErrorCount: records.filter(record => record.kind !== 'failed-request').length,
    failedRequestCount: records.filter(record => record.kind === 'failed-request').length,
    includedRecordIds: records.map(record => record.id),
  }
}

export function createRuntimeContextEnvelope(
  records: RuntimeEvidenceRecord[],
): RuntimeContextEnvelope {
  return {
    summary: summarizeRuntimeContext(records),
    records: records.map(cloneRuntimeRecord),
  }
}
