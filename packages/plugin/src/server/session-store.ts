import type {
  AnnotationSessionEvent,
  AnnotationSessionStatus,
  AnnotationWorkSession,
  AppendAnnotationThreadMessageInput,
  CreateAnnotationWorkSessionInput,
} from '@inspecto-dev/types'

export interface AnnotationSessionStoreOptions {
  now?: () => number
  createId?: () => string
}

export interface AnnotationSessionListOptions {
  status?: AnnotationSessionStatus | AnnotationSessionStatus[]
}

export interface ClaimNextAnnotationSessionOptions {
  timeoutMs?: number
}

export interface ClaimNextAnnotationSessionResult {
  session: AnnotationWorkSession | null
  timedOut: boolean
  matchedExisting: boolean
  event?: AnnotationSessionEvent['type']
}

export interface AnnotationSessionStore {
  createSession(input: CreateAnnotationWorkSessionInput): AnnotationWorkSession
  getSession(id: string): AnnotationWorkSession | null
  listSessions(options?: AnnotationSessionListOptions): AnnotationWorkSession[]
  claimNextSession(
    options?: ClaimNextAnnotationSessionOptions,
  ): Promise<ClaimNextAnnotationSessionResult>
  appendMessage(id: string, input: AppendAnnotationThreadMessageInput): AnnotationWorkSession | null
  updateStatus(id: string, status: AnnotationSessionStatus): AnnotationWorkSession | null
  subscribe(listener: AnnotationSessionListener): () => void
  clear(): void
}

export type AnnotationSessionListener = (event: AnnotationSessionEvent) => void

const DEFAULT_STATUS: AnnotationSessionStatus = 'pending'

export function createAnnotationSessionStore(
  options: AnnotationSessionStoreOptions = {},
): AnnotationSessionStore {
  const sessions = new Map<string, AnnotationWorkSession>()
  const listeners = new Set<AnnotationSessionListener>()
  const now = options.now ?? (() => Date.now())
  const createId = options.createId ?? createRandomId

  function findNewestMatchingSession(
    statuses: Set<AnnotationSessionStatus> | null,
  ): AnnotationWorkSession | null {
    return (
      [...sessions.values()]
        .filter(session => (statuses ? statuses.has(session.status) : true))
        .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null
    )
  }

  function updateSessionStatus(
    id: string,
    status: AnnotationSessionStatus,
  ): AnnotationWorkSession | null {
    const session = sessions.get(id)
    if (!session) return null

    const timestamp = now()
    session.status = status
    session.updatedAt = timestamp

    if (status === 'acknowledged') {
      session.acknowledgedAt = timestamp
    }
    if (status === 'resolved') {
      session.resolvedAt = timestamp
    }

    emit({ type: 'session-status-updated', session })
    return cloneSession(session)
  }

  function claimSession(
    id: string,
    statuses: Set<AnnotationSessionStatus> | null,
  ): AnnotationWorkSession | null {
    const session = sessions.get(id)
    if (!session || (statuses && !statuses.has(session.status))) return null
    if (session.status === 'acknowledged') return cloneSession(session)
    return updateSessionStatus(id, 'acknowledged')
  }

  function emit(event: AnnotationSessionEvent): void {
    const snapshot = cloneSession(event.session)
    for (const listener of listeners) {
      listener({ type: event.type, session: snapshot })
    }
  }

  const store: AnnotationSessionStore = {
    createSession(input) {
      const timestamp = now()
      const session: AnnotationWorkSession = {
        id: createId(),
        instruction: input.instruction?.trim() ?? '',
        annotations: cloneArray(input.annotations),
        ...(input.deliveryMode ? { deliveryMode: input.deliveryMode } : {}),
        status: DEFAULT_STATUS,
        messages: cloneArray(input.messages ?? []),
        createdAt: timestamp,
        updatedAt: timestamp,
        ...(input.runtimeContext ? { runtimeContext: cloneValue(input.runtimeContext) } : {}),
        ...(input.cssContextPrompt?.trim()
          ? { cssContextPrompt: input.cssContextPrompt.trim() }
          : {}),
        ...(input.pageUrl ? { pageUrl: input.pageUrl } : {}),
        ...(input.route ? { route: input.route } : {}),
      }

      sessions.set(session.id, session)
      emit({ type: 'session-created', session })
      return cloneSession(session)
    },

    getSession(id) {
      const session = sessions.get(id)
      return session ? cloneSession(session) : null
    },

    listSessions(options = {}) {
      const statuses = normalizeStatuses(options.status)
      return [...sessions.values()]
        .filter(session => (statuses ? statuses.has(session.status) : true))
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .map(session => cloneSession(session))
    },

    async claimNextSession(options = {}) {
      const statuses = normalizeStatuses(DEFAULT_STATUS)
      const existingSession = findNewestMatchingSession(statuses)
      if (existingSession) {
        return {
          session: claimSession(existingSession.id, statuses),
          timedOut: false,
          matchedExisting: true,
        }
      }

      const timeoutMs = normalizeTimeoutMs(options.timeoutMs)
      if (timeoutMs === 0) {
        return {
          session: null,
          timedOut: true,
          matchedExisting: false,
        }
      }

      return await new Promise<ClaimNextAnnotationSessionResult>(resolve => {
        let settled = false
        let timeout: ReturnType<typeof setTimeout> | null = null

        const finish = (result: ClaimNextAnnotationSessionResult): void => {
          if (settled) return
          settled = true
          unsubscribe()
          if (timeout) {
            clearTimeout(timeout)
          }
          resolve(result)
        }

        const unsubscribe = this.subscribe(event => {
          const session = claimSession(event.session.id, statuses)
          if (!session) return
          finish({
            session,
            timedOut: false,
            matchedExisting: false,
            event: event.type,
          })
        })

        if (timeoutMs !== null) {
          timeout = setTimeout(() => {
            finish({
              session: null,
              timedOut: true,
              matchedExisting: false,
            })
          }, timeoutMs)
        }
      })
    },

    appendMessage(id, input) {
      const session = sessions.get(id)
      if (!session) return null

      const timestamp = now()
      session.messages.push({
        id: createId(),
        role: input.role,
        text: input.text,
        createdAt: timestamp,
      })
      session.updatedAt = timestamp

      if (input.role === 'agent' && isPendingLikeStatus(session.status)) {
        session.status = 'in_progress'
      }

      emit({ type: 'session-message-appended', session })
      return cloneSession(session)
    },

    updateStatus(id, status) {
      return updateSessionStatus(id, status)
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    clear() {
      sessions.clear()
      listeners.clear()
    },
  }

  return store
}

export const annotationSessionStore = createAnnotationSessionStore()

function normalizeStatuses(
  status: AnnotationSessionListOptions['status'],
): Set<AnnotationSessionStatus> | null {
  if (!status) return null
  return new Set(Array.isArray(status) ? status : [status])
}

function normalizeTimeoutMs(value: number | undefined): number | null {
  if (value === undefined) return null
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

function isPendingLikeStatus(status: AnnotationSessionStatus): boolean {
  return status === 'pending' || status === 'acknowledged'
}

export function hasAgentReply(session: Pick<AnnotationWorkSession, 'messages'>): boolean {
  return session.messages.some(message => message.role === 'agent' && Boolean(message.text?.trim()))
}

function createRandomId(): string {
  return `annotation-session-${Math.random().toString(36).slice(2, 10)}`
}

function cloneSession(session: AnnotationWorkSession): AnnotationWorkSession {
  return cloneValue(session)
}

function cloneArray<T>(value: T[]): T[] {
  return cloneValue(value)
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}
