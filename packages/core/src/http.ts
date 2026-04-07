import type {
  SnippetResponse,
  SendToAiRequest,
  SendToAiResponse,
  SendAnnotationsToAiRequest,
  SendAnnotationsToAiResponse,
  OpenFileRequest,
  InspectoConfig,
  AiErrorCode,
} from '@inspecto-dev/types'
import { INSPECTO_API_PATHS } from '@inspecto-dev/types'

let BASE_URL = globalThis.__AI_INSPECTOR_SERVER_URL__ || 'http://127.0.0.1:5678'
const AI_BATCH_DISPATCH_PATH =
  INSPECTO_API_PATHS.AI_BATCH_DISPATCH ?? '/inspecto/api/v1/ai/dispatch/annotations'

export function setBaseUrl(url: string): void {
  BASE_URL = url.replace(/\/$/, '')
}

let cachedConfig: InspectoConfig | null = null

export async function fetchIdeInfo(force = false): Promise<InspectoConfig | null> {
  if (cachedConfig && !force) return cachedConfig
  try {
    const res = await fetch(`${BASE_URL}${INSPECTO_API_PATHS.CLIENT_CONFIG}`)
    if (!res.ok) return null
    cachedConfig = await res.json()
    return cachedConfig
  } catch {
    return null
  }
}

export async function openFile(req: OpenFileRequest): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}${INSPECTO_API_PATHS.IDE_OPEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function fetchSnippet(
  file: string,
  line: number,
  column: number,
  maxLines = 100,
): Promise<SnippetResponse> {
  const params = new URLSearchParams({
    file,
    line: String(line),
    column: String(column),
    maxLines: String(maxLines),
  })
  const res = await fetch(`${BASE_URL}${INSPECTO_API_PATHS.PROJECT_SNIPPET}?${params}`)
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { errorCode?: string }
    throw Object.assign(new Error('snippet fetch failed'), { errorCode: err.errorCode })
  }
  return res.json() as Promise<SnippetResponse>
}

export async function sendToAi(req: SendToAiRequest): Promise<SendToAiResponse> {
  const res = await fetch(`${BASE_URL}${INSPECTO_API_PATHS.AI_DISPATCH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { errorCode?: string; error?: string }
    return {
      success: false,
      error: err.error ?? 'Request failed',
      errorCode: err.errorCode as AiErrorCode,
    }
  }
  return res.json() as Promise<SendToAiResponse>
}

export async function sendAnnotationsToAi(
  req: SendAnnotationsToAiRequest,
): Promise<SendAnnotationsToAiResponse> {
  const res = await fetch(`${BASE_URL}${AI_BATCH_DISPATCH_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { errorCode?: string; error?: string }
    return {
      success: false,
      error: err.error ?? 'Request failed',
      errorCode: err.errorCode as AiErrorCode,
    }
  }
  return res.json() as Promise<SendAnnotationsToAiResponse>
}
