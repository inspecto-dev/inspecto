import type { AnnotationWorkSession } from '@inspecto-dev/types'
import type { AnnotationSessionStore } from './session-store.js'
import { hasAgentReply } from './session-store.js'

export type InspectoMcpToolName =
  | 'inspecto_get_session'
  | 'inspecto_claim_next'
  | 'inspecto_reply'
  | 'inspecto_resolve'
  | 'inspecto_dismiss'

export interface InspectoMcpToolDefinition {
  name: InspectoMcpToolName
  description: string
  inputSchema: Record<string, unknown>
}

export interface InspectoMcpAdapterOptions {
  store: AnnotationSessionStore
}

export interface InspectoGetSessionArgs {
  sessionId: string
}

export interface InspectoClaimNextArgs {
  timeoutMs?: number
  source?: 'annotation' | 'workflow'
}

export interface InspectoReplyArgs {
  sessionId: string
  text: string
}

export interface InspectoResolveArgs {
  sessionId: string
  message?: string
}

export interface InspectoDismissArgs {
  sessionId: string
  message?: string
}

export interface InspectoSessionResult {
  success: boolean
  error?: string
  session?: AnnotationWorkSession
}

export interface InspectoClaimNextResult {
  success: boolean
  timedOut: boolean
  matchedExisting: boolean
  event?: 'session-created' | 'session-message-appended' | 'session-status-updated'
  session?: AnnotationWorkSession
}

export interface InspectoMutationResult {
  success: boolean
  error?: string
  session?: AnnotationWorkSession
}

export interface InspectoMcpAdapter {
  listTools(): InspectoMcpToolDefinition[]
  getSession(args: InspectoGetSessionArgs): InspectoSessionResult
  claimNext(args?: InspectoClaimNextArgs): Promise<InspectoClaimNextResult>
  reply(args: InspectoReplyArgs): InspectoMutationResult
  resolve(args: InspectoResolveArgs): InspectoMutationResult
  dismiss(args: InspectoDismissArgs): InspectoMutationResult
}

export function createInspectoMcpAdapter(options: InspectoMcpAdapterOptions): InspectoMcpAdapter {
  const { store } = options

  return {
    listTools() {
      return INSPECTO_MCP_TOOL_DEFINITIONS
    },

    getSession(args) {
      if (!args.sessionId.trim()) {
        return { success: false, error: 'Session id is required.' }
      }

      const session = store.getSession(args.sessionId)
      if (!session) {
        return { success: false, error: 'Session not found.' }
      }

      return {
        success: true,
        session,
      }
    },

    async claimNext(args = {}) {
      const result = await store.claimNextSession({
        ...(args.timeoutMs !== undefined ? { timeoutMs: args.timeoutMs } : {}),
        ...(args.source ? { source: args.source } : {}),
      })
      return {
        success: true,
        timedOut: result.timedOut,
        matchedExisting: result.matchedExisting,
        ...(result.event ? { event: result.event } : {}),
        ...(result.session ? { session: result.session } : {}),
      }
    },

    reply(args) {
      if (!args.sessionId.trim()) {
        return { success: false, error: 'Session id is required.' }
      }
      if (!args.text.trim()) {
        return { success: false, error: 'Reply text is required.' }
      }

      const session = store.appendMessage(args.sessionId, {
        role: 'agent',
        text: args.text.trim(),
      })
      if (!session) {
        return { success: false, error: 'Session not found.' }
      }
      return { success: true, session }
    },

    resolve(args) {
      if (!args.sessionId.trim()) {
        return { success: false, error: 'Session id is required.' }
      }

      const existingSession = store.getSession(args.sessionId)
      if (!existingSession) {
        return { success: false, error: 'Session not found.' }
      }

      const message = args.message?.trim()
      if (!message && !hasAgentReply(existingSession)) {
        return {
          success: false,
          error: 'Resolve message is required until an agent reply is recorded.',
        }
      }

      if (message) {
        const repliedSession = store.appendMessage(args.sessionId, {
          role: 'agent',
          text: message,
        })
        if (!repliedSession) {
          return { success: false, error: 'Session not found.' }
        }
      }

      const session = store.updateStatus(args.sessionId, 'resolved')
      if (!session) return { success: false, error: 'Session not found.' }
      return { success: true, session }
    },

    dismiss(args) {
      if (!args.sessionId.trim()) {
        return { success: false, error: 'Session id is required.' }
      }

      const existingSession = store.getSession(args.sessionId)
      if (!existingSession) {
        return { success: false, error: 'Session not found.' }
      }

      const message = args.message?.trim()
      if (message) {
        const repliedSession = store.appendMessage(args.sessionId, {
          role: 'agent',
          text: message,
        })
        if (!repliedSession) {
          return { success: false, error: 'Session not found.' }
        }
      }

      const session = store.updateStatus(args.sessionId, 'dismissed')
      if (!session) return { success: false, error: 'Session not found.' }
      return { success: true, session }
    },
  }
}

const INSPECTO_MCP_TOOL_DEFINITIONS: InspectoMcpToolDefinition[] = [
  {
    name: 'inspecto_get_session',
    description: 'Return one Inspecto annotation session by sessionId.',
    inputSchema: {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: { type: 'string' },
      },
    },
  },
  {
    name: 'inspecto_claim_next',
    description:
      'Wait for the next unclaimed Inspecto session. Use source=\'workflow\' for workflow automation sessions (e.g. "submit PR", "deploy") which include project metadata (git branch, status, project root) in the instruction. Use source=\'annotation\' (or omit) for code review/fix sessions with DOM annotation context. Marks it acknowledged and returns full context.',
    inputSchema: {
      type: 'object',
      properties: {
        timeoutMs: {
          type: 'number',
          description: 'Optional maximum wait time in milliseconds. Omit to wait indefinitely.',
        },
        source: {
          type: 'string',
          enum: ['annotation', 'workflow'],
          description:
            'Optional source filter. Use "workflow" for macro automation, "annotation" for DOM fixes.',
        },
      },
    },
  },
  {
    name: 'inspecto_reply',
    description: 'Append an agent reply to an Inspecto annotation session.',
    inputSchema: {
      type: 'object',
      required: ['sessionId', 'text'],
      properties: {
        sessionId: { type: 'string' },
        text: { type: 'string' },
      },
    },
  },
  {
    name: 'inspecto_resolve',
    description: 'Resolve an Inspecto annotation session, optionally with a final message.',
    inputSchema: {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
  {
    name: 'inspecto_dismiss',
    description: 'Dismiss an Inspecto annotation session, optionally with a final note.',
    inputSchema: {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
]
