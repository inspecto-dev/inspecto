import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import portfinder from 'portfinder'
import type {
  ServerState,
  OpenFileRequest,
  SendToAiRequest,
  SendToAiResponse,
  SendAnnotationsToAiRequest,
  SendAnnotationsToAiResponse,
} from '@inspecto-dev/types'
import { INSPECTO_API_PATHS } from '@inspecto-dev/types'
import { extractSnippet } from './snippet.js'
import { dispatchAnnotationsToAi } from './annotation-dispatch.js'
import { readTicket } from './dispatch-transport.js'
import { dispatchPromptThroughIde, resolvePromptDispatchRuntime } from './dispatch-runtime.js'
import { assertPathWithinProject, resolveWorkspacePath } from './path-guards.js'
import { buildClientConfig } from './client-config.js'
import { handleOpenFileRequest } from './open-file.js'
import { resolveProjectRoot } from './project-root.js'
import { watchConfig, unwatchConfig, getGlobalLogLevel } from '../config.js'
import { createLogger } from '../utils/logger.js'

const serverLogger = createLogger('inspecto:server', { logLevel: getGlobalLogLevel() })

export const serverState: ServerState = {
  port: null,
  running: false,
  projectRoot: '',
  configRoot: '',
  cwd: process.cwd(),
}

let serverInstance: http.Server | null = null

export async function startServer(): Promise<number> {
  if (serverState.running && serverState.port !== null) {
    return serverState.port
  }

  // Resolve project root at server start time so process.cwd() reflects the
  // actual project directory, not the module load-time cwd.
  serverState.projectRoot = resolveProjectRoot()
  serverState.configRoot = serverState.projectRoot
  serverState.cwd = process.cwd()

  portfinder.basePort = 5678
  const port = await portfinder.getPortPromise()

  // Watch for user config changes to trigger hot-reloads internally if needed
  watchConfig(
    () => {
      serverLogger.info('user config reloaded.')
    },
    serverState.cwd,
    serverState.configRoot,
  )

  serverInstance = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url ?? '/', `http://localhost:${port}`)
    handleRequest(url, req, res).catch(err => {
      serverLogger.error('server error:', err)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: String(err) }))
    })
  })

  await new Promise<void>((resolve, reject) => {
    serverInstance!.listen(port, '127.0.0.1', () => {
      serverInstance!.unref() // Allow process to exit
      resolve()
    })
    serverInstance!.once('error', reject)
  })

  // Add persistent error handler after successful startup
  serverInstance!.on('error', err => {
    serverLogger.error('persistent server error:', err)
  })

  serverState.port = port
  serverState.running = true

  // Write port file so the IDE extension can discover the server without scanning ports
  const portFile = path.join(os.tmpdir(), 'inspecto.port.json')
  try {
    let portData: Record<string, number> = {}
    if (fs.existsSync(portFile)) {
      try {
        portData = JSON.parse(fs.readFileSync(portFile, 'utf-8'))
      } catch (e) {
        // Invalid JSON, start fresh
      }
    }
    // Hash the project root to avoid invalid keys or paths in JSON
    const rootHash = crypto.createHash('md5').update(serverState.projectRoot).digest('hex')
    portData[rootHash] = port
    fs.writeFileSync(portFile, JSON.stringify(portData, null, 2), 'utf-8')
  } catch (e) {
    serverLogger.warn('Failed to write port file:', e)
    /* non-fatal — extension will fall back to scanning */
  }
  // Clean up on process exit (Vite terminates the process, not stopServer)
  process.once('exit', () => {
    try {
      if (fs.existsSync(portFile)) {
        const portData = JSON.parse(fs.readFileSync(portFile, 'utf-8'))
        const rootHash = crypto.createHash('md5').update(serverState.projectRoot).digest('hex')
        delete portData[rootHash]
        if (Object.keys(portData).length === 0) {
          fs.unlinkSync(portFile)
        } else {
          fs.writeFileSync(portFile, JSON.stringify(portData, null, 2), 'utf-8')
        }
      }
    } catch {
      /* ignore */
    }
  })

  serverLogger.info(`server running at http://127.0.0.1:${port}`)

  return port
}

export function stopServer(): void {
  if (serverInstance) {
    serverInstance.close()
    serverInstance = null
  }
  unwatchConfig()
  serverState.running = false
  serverState.port = null
  try {
    fs.unlinkSync(path.join(os.tmpdir(), 'inspecto.port'))
  } catch {
    /* ignore */
  }
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

export async function handleRequest(
  url: URL,
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const pathname = url.pathname

  // Health check - root or /inspecto/api/v1/health
  if ((pathname === '/health' || pathname === INSPECTO_API_PATHS.HEALTH) && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, port: serverState.port }))
    return
  }

  // Browser Client requests
  if (pathname === INSPECTO_API_PATHS.CLIENT_CONFIG && req.method === 'GET') {
    const config = await buildClientConfig(serverState)

    // Omit providers from the response sent to the client
    delete config.providers

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(config))
    return
  }

  if (pathname === INSPECTO_API_PATHS.IDE_INFO && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req))

      // Workspace matching defense mechanism against multiple IDE connections
      const ideWorkspace = body.workspaceRoot || ''
      const serverProjectRoot = serverState.projectRoot || ''

      const normalizedIdeRoot = ideWorkspace ? path.resolve(ideWorkspace) : ''
      const normalizedServerRoot = serverProjectRoot ? path.resolve(serverProjectRoot) : ''

      const isSameProject =
        !normalizedIdeRoot ||
        !normalizedServerRoot ||
        normalizedIdeRoot === normalizedServerRoot ||
        normalizedServerRoot.startsWith(normalizedIdeRoot + path.sep) ||
        normalizedIdeRoot.startsWith(normalizedServerRoot + path.sep)

      if (isSameProject) {
        serverState.ideInfo = body
        serverLogger.debug(
          `Accepted IDE info from matched workspace (ide-${body.ide} / schema-${body.scheme})`,
        )
      } else {
        serverLogger.debug(
          `Ignored IDE info from unrelated workspace (IDE Workspace: ${ideWorkspace}, Server: ${serverProjectRoot}, Scheme: ${body.scheme}, IDE: ${body.ide})`,
        )
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    } catch (e) {
      serverLogger.error(`Error parsing ${INSPECTO_API_PATHS.IDE_INFO} POST request:`, e)
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid JSON body' }))
    }
    return
  }

  if (pathname === INSPECTO_API_PATHS.IDE_OPEN && req.method === 'POST') {
    let body: OpenFileRequest
    try {
      body = JSON.parse(await readBody(req)) as OpenFileRequest
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid JSON body' }))
      return
    }

    try {
      handleOpenFileRequest(body, serverState)
    } catch {
      serverLogger.warn(`Security: Blocked path traversal attempt in IDE_OPEN: ${body.file}`)
      res.writeHead(403, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Access denied: File is outside of project workspace' }))
      return
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true }))
    return
  }

  if (pathname === INSPECTO_API_PATHS.PROJECT_SNIPPET && req.method === 'GET') {
    const file = url.searchParams.get('file') ?? ''
    const line = parseInt(url.searchParams.get('line') ?? '1', 10)
    const column = parseInt(url.searchParams.get('column') ?? '1', 10)
    const maxLines = parseInt(url.searchParams.get('maxLines') ?? '100', 10)

    try {
      const absolutePath = resolveWorkspacePath(file, serverState.cwd)

      // Security: Prevent path traversal attacks
      try {
        assertPathWithinProject(absolutePath, serverState.projectRoot)
      } catch {
        serverLogger.warn(`Security: Blocked path traversal attempt in PROJECT_SNIPPET: ${file}`)
        res.writeHead(403, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            success: false,
            error: 'Access denied: File is outside of project workspace',
            errorCode: 'FORBIDDEN',
          }),
        )
        return
      }

      const result = await extractSnippet({ file: absolutePath, line, column, maxLines })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    } catch (err: any) {
      const message = String(err.message || err)
      const errorCode = message.startsWith('FILE_NOT_FOUND') ? 'FILE_NOT_FOUND' : 'UNKNOWN'
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: message, errorCode }))
    }
    return
  }

  if (pathname === INSPECTO_API_PATHS.AI_DISPATCH && req.method === 'POST') {
    try {
      const rawBody = await readBody(req)
      const body = JSON.parse(rawBody) as SendToAiRequest
      const result = await dispatchToAi(body)
      res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    } catch (e) {
      serverLogger.error(`Error parsing ${INSPECTO_API_PATHS.AI_DISPATCH} request:`, e)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: String(e), errorCode: 'INTERNAL_ERROR' }))
    }
    return
  }

  if (pathname === INSPECTO_API_PATHS.AI_BATCH_DISPATCH && req.method === 'POST') {
    try {
      const rawBody = await readBody(req)
      const body = JSON.parse(rawBody) as SendAnnotationsToAiRequest
      const result = await dispatchAnnotationsToAi(body, serverState)
      res.writeHead(getBatchDispatchStatusCode(result.errorCode, result.success), {
        'Content-Type': 'application/json',
      })
      res.end(JSON.stringify(result))
    } catch (e) {
      serverLogger.error(`Error parsing ${INSPECTO_API_PATHS.AI_BATCH_DISPATCH} request:`, e)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: String(e), errorCode: 'INTERNAL_ERROR' }))
    }
    return
  }

  // Handle IDE payload ticket retrieval
  if (pathname.startsWith(`${INSPECTO_API_PATHS.AI_TICKET}/`) && req.method === 'GET') {
    const ticketId = pathname.substring(INSPECTO_API_PATHS.AI_TICKET.length + 1)
    const payloadStr = readTicket(ticketId)

    if (!payloadStr) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: 'Ticket not found or expired' }))
      return
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(payloadStr)
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'not found' }))
}

async function dispatchToAi(
  req: SendToAiRequest,
): Promise<SendToAiResponse & { fallbackPayload?: { prompt: string; file: string } }> {
  const { location, snippet, prompt, screenshotContext } = req

  const formattedPrompt =
    prompt ??
    `Please help me with this code from \`${location.file}\` (line ${location.line}):\n\n\`\`\`\n${snippet}\n\`\`\`\n`
  const runtime = resolvePromptDispatchRuntime(serverState)
  return dispatchPromptThroughIde(runtime, {
    prompt: formattedPrompt,
    filePath: location.file,
    line: location.line,
    column: location.column,
    snippet,
    ...(screenshotContext ? { screenshotContext } : {}),
  }) as SendToAiResponse & { fallbackPayload?: { prompt: string; file: string } }
}

function getBatchDispatchStatusCode(
  errorCode: SendAnnotationsToAiResponse['errorCode'],
  success: boolean,
): number {
  if (success) return 200
  if (errorCode === 'INVALID_REQUEST') return 400
  if (errorCode === 'FORBIDDEN_PATH') return 403
  return 500
}
