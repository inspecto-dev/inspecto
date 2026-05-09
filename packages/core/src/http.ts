import type {
  AnnotationSessionEvent,
  SnippetResponse,
  SendToAiRequest,
  SendToAiResponse,
  SendAnnotationsToAiRequest,
  SendAnnotationsToAiResponse,
  AnnotationWorkSession,
  OpenFileRequest,
  InspectoConfig,
  AiErrorCode,
} from '@inspecto-dev/types'
import { INSPECTO_API_PATHS } from '@inspecto-dev/types'

let BASE_URL = globalThis.__AI_INSPECTOR_SERVER_URL__ || 'http://0.0.0.0:5678'
const AI_BATCH_DISPATCH_PATH =
  INSPECTO_API_PATHS.AI_BATCH_DISPATCH ?? '/inspecto/api/v1/ai/dispatch/annotations'

export interface OpenFileResult {
  success: boolean
  errorCode?: AiErrorCode
}

export interface AnnotationSessionResult {
  success: boolean
  session?: AnnotationWorkSession
  error?: string
  errorCode?: AiErrorCode
}

export interface AnnotationSessionEventStreamConnection {
  close(): void
}

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
  return (await openFileWithDiagnostics(req)).success
}

export async function openFileWithDiagnostics(req: OpenFileRequest): Promise<OpenFileResult> {
  try {
    const res = await fetch(`${BASE_URL}${INSPECTO_API_PATHS.SOURCE_OPEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (res.ok) return { success: true }
    const err = (await res.json().catch(() => ({}))) as { errorCode?: string }
    return {
      success: false,
      errorCode: (err.errorCode as AiErrorCode | undefined) ?? 'IDE_UNAVAILABLE',
    }
  } catch {
    return { success: false, errorCode: 'SERVER_UNAVAILABLE' }
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
  try {
    const res = await fetch(`${BASE_URL}${INSPECTO_API_PATHS.PROJECT_SNIPPET}?${params}`)
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { errorCode?: string }
      throw Object.assign(new Error('snippet fetch failed'), { errorCode: err.errorCode })
    }
    return res.json() as Promise<SnippetResponse>
  } catch (err) {
    if ((err as { errorCode?: string }).errorCode) throw err
    throw Object.assign(new Error('Local dev server unavailable'), {
      errorCode: 'SERVER_UNAVAILABLE',
    })
  }
}

export async function sendToAi(req: SendToAiRequest): Promise<SendToAiResponse> {
  try {
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
  } catch {
    return {
      success: false,
      error: 'Local dev server unavailable',
      errorCode: 'SERVER_UNAVAILABLE',
    }
  }
}

export async function sendAnnotationsToAi(
  req: SendAnnotationsToAiRequest,
): Promise<SendAnnotationsToAiResponse> {
  try {
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
  } catch {
    return {
      success: false,
      error: 'Local dev server unavailable',
      errorCode: 'SERVER_UNAVAILABLE',
    }
  }
}

export async function fetchAnnotationSession(sessionId: string): Promise<AnnotationSessionResult> {
  try {
    const res = await fetch(
      `${BASE_URL}${INSPECTO_API_PATHS.SESSIONS}/${encodeURIComponent(sessionId)}`,
    )
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { errorCode?: string; error?: string }
      return {
        success: false,
        error: err.error ?? 'Request failed',
        errorCode: err.errorCode as AiErrorCode,
      }
    }
    const payload = (await res.json()) as {
      success: boolean
      session?: AnnotationWorkSession
      error?: string
    }
    return {
      success: payload.success,
      ...(payload.session !== undefined ? { session: payload.session } : {}),
      ...(payload.error !== undefined ? { error: payload.error } : {}),
    }
  } catch {
    return {
      success: false,
      error: 'Local dev server unavailable',
      errorCode: 'SERVER_UNAVAILABLE',
    }
  }
}

export function openAnnotationSessionEventStream(
  sessionId: string,
  handlers: {
    onEvent: (event: AnnotationSessionEvent) => void
    onError?: () => void
  },
): AnnotationSessionEventStreamConnection | null {
  if (!sessionId.trim() || typeof EventSource !== 'function') {
    return null
  }

  const params = new URLSearchParams({ sessionId: sessionId.trim() })
  const source = new EventSource(`${BASE_URL}${INSPECTO_API_PATHS.SESSION_EVENTS}?${params}`)

  const handleEvent = (event: Event): void => {
    const messageEvent = event as MessageEvent<string>
    try {
      const payload = JSON.parse(messageEvent.data) as AnnotationSessionEvent
      handlers.onEvent(payload)
    } catch {
      // ignore malformed events
    }
  }

  source.addEventListener('session-created', handleEvent)
  source.addEventListener('session-message-appended', handleEvent)
  source.addEventListener('session-status-updated', handleEvent)
  if (handlers.onError) {
    source.addEventListener('error', handlers.onError)
  }

  return {
    close() {
      source.close()
    },
  }
}
