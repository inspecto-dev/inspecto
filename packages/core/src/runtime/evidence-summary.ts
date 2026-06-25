import type { RuntimeContextEnvelope } from '@inspecto-dev/types'

type RuntimeContextLimitsContext = {
  options: {
    runtimeContext?: {
      maxRuntimeErrors?: number
      maxFailedRequests?: number
    }
  }
}

type RuntimeErrorCountContext = {
  runtimeContextCollector: {
    snapshot(): {
      records: Array<{ kind: string }>
    }
  }
}

export function getRuntimeContextLimits(ctx: RuntimeContextLimitsContext): {
  maxRuntimeErrors?: number
  maxFailedRequests?: number
} {
  return {
    ...(ctx.options.runtimeContext?.maxRuntimeErrors !== undefined
      ? { maxRuntimeErrors: ctx.options.runtimeContext.maxRuntimeErrors }
      : {}),
    ...(ctx.options.runtimeContext?.maxFailedRequests !== undefined
      ? { maxFailedRequests: ctx.options.runtimeContext.maxFailedRequests }
      : {}),
  }
}

export function formatRuntimeContextSummary(runtimeContext: RuntimeContextEnvelope | null): string {
  if (!runtimeContext) return ''

  const parts: string[] = []
  if (runtimeContext.summary.runtimeErrorCount > 0) {
    parts.push(
      `${runtimeContext.summary.runtimeErrorCount} ${runtimeContext.summary.runtimeErrorCount === 1 ? 'runtime error' : 'runtime errors'}`,
    )
  }
  if (runtimeContext.summary.failedRequestCount > 0) {
    parts.push(
      `${runtimeContext.summary.failedRequestCount} ${runtimeContext.summary.failedRequestCount === 1 ? 'failed request' : 'failed requests'}`,
    )
  }
  return parts.join(' • ')
}

export function getCollectedRuntimeErrorCount(ctx: RuntimeErrorCountContext): number {
  return ctx.runtimeContextCollector
    .snapshot()
    .records.filter(record => record.kind !== 'failed-request').length
}
