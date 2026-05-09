import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { INSPECTO_API_PATHS } from '@inspecto-dev/types'
import { z } from 'zod'

const DEFAULT_MCP_SERVER_VERSION = '0.0.0'

export interface McpCommandOptions {
  serverUrl?: string
  version?: string
}

interface McpToolResult<T extends Record<string, unknown>> {
  [key: string]: unknown
  content: Array<{ type: 'text'; text: string }>
  structuredContent: T
  isError?: boolean
}

export interface InspectoMcpRuntime {
  getSession(args: { sessionId: string }): Promise<Record<string, unknown>>
  claimNext(args?: { timeoutMs?: number }): Promise<{
    success: boolean
    timedOut: boolean
    matchedExisting: boolean
    session?: Record<string, unknown>
    event?: string
  }>
  reply(args: { sessionId: string; text: string }): Promise<Record<string, unknown>>
  resolve(args: { sessionId: string; message?: string }): Promise<Record<string, unknown>>
  dismiss(args: { sessionId: string; message?: string }): Promise<Record<string, unknown>>
}

export interface InspectoMcpToolDefinition {
  name:
    | 'inspecto_get_session'
    | 'inspecto_claim_next'
    | 'inspecto_reply'
    | 'inspecto_resolve'
    | 'inspecto_dismiss'
  description: string
}

export const INSPECTO_MCP_TOOLS: InspectoMcpToolDefinition[] = [
  {
    name: 'inspecto_get_session',
    description: 'Return one Inspecto annotation session by sessionId.',
  },
  {
    name: 'inspecto_claim_next',
    description:
      'Wait for the next unclaimed Inspecto annotation session, mark it acknowledged, and return full context.',
  },
  {
    name: 'inspecto_reply',
    description: 'Append an agent reply to an Inspecto annotation session.',
  },
  {
    name: 'inspecto_resolve',
    description: 'Resolve an Inspecto annotation session with an optional final message.',
  },
  {
    name: 'inspecto_dismiss',
    description: 'Dismiss an Inspecto annotation session with an optional final message.',
  },
]

export async function startMcpServer(options: McpCommandOptions = {}): Promise<void> {
  const baseUrl = options.serverUrl ?? resolveInspectoServerBaseUrl(process.cwd())
  if (!baseUrl) {
    throw new Error(
      'Could not find a running Inspecto dev server. Start your local dev server or pass --server-url <url>.',
    )
  }

  const server = createInspectoMcpServer({
    baseUrl,
    ...(options.version ? { version: options.version } : {}),
  })
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

export function createInspectoMcpServer(options: { baseUrl: string; version?: string }): McpServer {
  const runtime = createInspectoMcpRuntime(options.baseUrl)
  const server = new McpServer({
    name: 'inspecto-mcp',
    version: options.version ?? DEFAULT_MCP_SERVER_VERSION,
  })

  server.registerTool(
    'inspecto_get_session',
    {
      description: getToolDescription('inspecto_get_session'),
      inputSchema: {
        sessionId: z.string().min(1),
      },
    },
    async ({ sessionId }) => {
      try {
        const result = await runtime.getSession({ sessionId })
        return toolSuccess(result)
      } catch (error) {
        return toolError(error)
      }
    },
  )

  server.registerTool(
    'inspecto_claim_next',
    {
      description: getToolDescription('inspecto_claim_next'),
      inputSchema: {
        timeoutMs: z.number().int().nonnegative().optional(),
      },
    },
    async ({ timeoutMs }) => {
      try {
        const result = await runtime.claimNext({
          ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        })
        return toolSuccess(result)
      } catch (error) {
        return toolError(error)
      }
    },
  )

  server.registerTool(
    'inspecto_reply',
    {
      description: getToolDescription('inspecto_reply'),
      inputSchema: {
        sessionId: z.string().min(1),
        text: z.string().min(1),
      },
    },
    async ({ sessionId, text }) => {
      try {
        const result = await runtime.reply({ sessionId, text })
        return toolSuccess(result)
      } catch (error) {
        return toolError(error)
      }
    },
  )

  server.registerTool(
    'inspecto_resolve',
    {
      description: getToolDescription('inspecto_resolve'),
      inputSchema: {
        sessionId: z.string().min(1),
        message: z.string().optional(),
      },
    },
    async ({ sessionId, message }) => {
      try {
        const result = await runtime.resolve({ sessionId, ...(message ? { message } : {}) })
        return toolSuccess(result)
      } catch (error) {
        return toolError(error)
      }
    },
  )

  server.registerTool(
    'inspecto_dismiss',
    {
      description: getToolDescription('inspecto_dismiss'),
      inputSchema: {
        sessionId: z.string().min(1),
        message: z.string().optional(),
      },
    },
    async ({ sessionId, message }) => {
      try {
        const result = await runtime.dismiss({ sessionId, ...(message ? { message } : {}) })
        return toolSuccess(result)
      } catch (error) {
        return toolError(error)
      }
    },
  )

  return server
}

export function getToolDescription(name: InspectoMcpToolDefinition['name']): string {
  return INSPECTO_MCP_TOOLS.find(tool => tool.name === name)?.description ?? name
}

export function createInspectoMcpRuntime(baseUrl: string): InspectoMcpRuntime {
  return {
    async getSession(args) {
      return getSession(baseUrl, args.sessionId)
    },

    async claimNext(args = {}) {
      return (await postJson(`${baseUrl}${INSPECTO_API_PATHS.SESSION_CLAIM_NEXT}`, {
        ...(args.timeoutMs !== undefined ? { timeoutMs: args.timeoutMs } : {}),
      })) as {
        success: boolean
        timedOut: boolean
        matchedExisting: boolean
        session?: Record<string, unknown>
        event?: string
      }
    },

    async reply(args) {
      return postJson(
        `${baseUrl}${INSPECTO_API_PATHS.SESSIONS}/${args.sessionId}${INSPECTO_API_PATHS.SESSION_REPLY_SUFFIX}`,
        {
          role: 'agent',
          text: args.text.trim(),
        },
      ) as Promise<Record<string, unknown>>
    },

    async resolve(args) {
      return postJson(
        `${baseUrl}${INSPECTO_API_PATHS.SESSIONS}/${args.sessionId}${INSPECTO_API_PATHS.SESSION_RESOLVE_SUFFIX}`,
        args.message?.trim() ? { message: args.message.trim() } : {},
      ) as Promise<Record<string, unknown>>
    },

    async dismiss(args) {
      return postJson(
        `${baseUrl}${INSPECTO_API_PATHS.SESSIONS}/${args.sessionId}${INSPECTO_API_PATHS.SESSION_DISMISS_SUFFIX}`,
        args.message?.trim() ? { message: args.message.trim() } : {},
      ) as Promise<Record<string, unknown>>
    },
  }
}

export function resolveInspectoServerBaseUrl(cwd: string): string | null {
  const ports = resolveServerPorts(cwd)
  const port = ports[0]
  return port ? `http://0.0.0.0:${port}` : null
}

export function resolveServerPorts(cwd: string): number[] {
  const prioritized = readProjectScopedPorts(cwd)
  if (prioritized.length > 0) return prioritized

  const legacyPortFile = path.join(os.tmpdir(), 'inspecto.port')
  try {
    const raw = fs.readFileSync(legacyPortFile, 'utf-8').trim()
    const port = parseInt(raw, 10)
    if (Number.isInteger(port) && port > 0 && port < 65536) {
      return [port]
    }
  } catch {
    // ignore
  }

  return Array.from({ length: 23 }, (_, index) => 5678 + index)
}

function toolSuccess<T extends Record<string, unknown>>(value: T): McpToolResult<T> {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(value, null, 2),
      },
    ],
    structuredContent: value,
  }
}

function toolError(error: unknown): McpToolResult<{ success: false; error: string }> {
  const message = error instanceof Error ? error.message : String(error)
  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
    structuredContent: {
      success: false,
      error: message,
    },
    isError: true,
  }
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    throw new Error(String(payload['error'] ?? `Request failed with status ${response.status}.`))
  }
  return payload
}

async function getSession(baseUrl: string, sessionId: string): Promise<Record<string, unknown>> {
  const trimmed = sessionId.trim()
  if (!trimmed) {
    throw new Error('Session id is required.')
  }

  const payload = (await getJson(
    `${baseUrl}${INSPECTO_API_PATHS.SESSIONS}/${encodeURIComponent(trimmed)}`,
  )) as {
    success?: boolean
    session?: Record<string, unknown>
    error?: string
  }

  if (!payload.success || !payload.session) {
    throw new Error(payload.error ?? 'Session not found.')
  }

  return {
    success: true,
    session: payload.session,
  }
}

async function postJson(url: string, body: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok || payload['success'] === false) {
    throw new Error(String(payload['error'] ?? `Request failed with status ${response.status}.`))
  }
  return payload
}

function readProjectScopedPorts(cwd: string): number[] {
  const portFile = path.join(os.tmpdir(), 'inspecto.port.json')
  try {
    const raw = fs.readFileSync(portFile, 'utf-8').trim()
    const portData = JSON.parse(raw) as Record<string, number>
    const currentRootHashes = resolveCandidateRootHashes(cwd)

    const prioritized: number[] = []
    const seen = new Set<number>()

    for (const rootHash of currentRootHashes) {
      const currentPort = portData[rootHash]
      if (currentPort && !seen.has(currentPort)) {
        prioritized.push(currentPort)
        seen.add(currentPort)
      }
    }

    for (const port of Object.values(portData)) {
      if (!seen.has(port)) {
        prioritized.push(port)
        seen.add(port)
      }
    }

    return prioritized
  } catch {
    return []
  }
}

function resolveCandidateRootHashes(cwd: string): string[] {
  const normalized = path.resolve(cwd)
  const candidates = new Set<string>()
  let currentDir = normalized

  while (true) {
    candidates.add(crypto.createHash('md5').update(currentDir).digest('hex'))
    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) {
      break
    }
    currentDir = parentDir
  }

  return [...candidates]
}
