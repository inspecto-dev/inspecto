import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { execSync, execFileSync } from 'node:child_process'
import portfinder from 'portfinder'
import { Editor, launchIDE } from 'launch-ide'
import type {
  ServerState,
  OpenFileRequest,
  SendToAiRequest,
  SendToAiResponse,
  IdeType,
  Provider,
} from '@inspecto-dev/types'
import { INSPECTO_API_PATHS } from '@inspecto-dev/types'
import { extractSnippet } from './snippet.js'
import {
  loadUserConfigSync,
  loadPromptsConfig,
  resolveProviderMode,
  extractToolOverrides,
  watchConfig,
  unwatchConfig,
  resolveTargetTool,
  getGlobalLogLevel,
  resolveIntents,
} from '../config.js'
import { createLogger } from '../utils/logger.js'

const serverLogger = createLogger('inspecto:server', { logLevel: getGlobalLogLevel() })

// In-memory store for large payloads to bypass OS URI length limits.
// Keys are ticket UUIDs, values are JSON stringified AiPayload objects.
const payloadTickets = new Map<string, string>()

// Clean up old tickets to prevent memory leaks (e.g., if IDE never fetches them)
function createTicket(payload: any): string {
  const ticketId = crypto.randomUUID()
  payloadTickets.set(ticketId, JSON.stringify(payload))

  // Auto-expire tickets after 5 minutes
  setTimeout(
    () => {
      payloadTickets.delete(ticketId)
    },
    5 * 60 * 1000,
  )

  return ticketId
}

export const serverState: ServerState = {
  port: null,
  running: false,
  projectRoot: '',
  configRoot: '',
  cwd: process.cwd(),
}

let serverInstance: http.Server | null = null

// Remove unused detectTraeScheme function

function resolveProjectRoot(): string {
  const cwd = process.cwd()
  let gitRoot: string
  try {
    gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim()
  } catch (e) {
    serverLogger.warn('Failed to resolve git root via git rev-parse:', e)
    gitRoot = cwd
  }

  const visited = new Set<string>()
  const search = (start: string, stop: string) => {
    let current = start
    while (!visited.has(current)) {
      visited.add(current)
      if (fs.existsSync(path.join(current, '.inspecto'))) return current
      if (current === stop) break
      const parent = path.dirname(current)
      if (parent === current) break
      current = parent
    }
    return null
  }

  // First prefer cwd (handles nested packages with their own .inspecto)
  const cwdMatch = search(cwd, path.parse(cwd).root)
  if (cwdMatch) return cwdMatch

  // Then search from gitRoot upwards to filesystem root
  const repoMatch = search(gitRoot, path.parse(gitRoot).root)
  if (repoMatch) return repoMatch

  return gitRoot
}

// Function to safely launch a URI to avoid launch-ide swallow bugs on macOS
function launchURI(uri: string): void {
  try {
    if (process.platform === 'darwin') {
      execFileSync('open', [uri])
    } else if (process.platform === 'win32') {
      execFileSync('cmd', ['/c', 'start', '""', uri])
    } else {
      execFileSync('xdg-open', [uri])
    }
  } catch (e) {
    serverLogger.error('Failed to launch URI via execFileSync, falling back to launchIDE:', e)
    launchIDE({ file: uri })
  }
}

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

async function handleRequest(
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
    const userConfig = loadUserConfigSync(false, serverState.cwd, serverState.configRoot)
    const promptsConfig = await loadPromptsConfig(false, serverState.cwd, serverState.configRoot)
    const effectiveIde = (userConfig.ide ?? 'vscode') as IdeType

    let info: any
    if (!serverState.ideInfo) {
      info = {
        ide: effectiveIde,
      }
    } else {
      const { scheme: _scheme, ...rest } = serverState.ideInfo as any
      info = rest
    }

    const config = {
      ...info,
      prompts: resolveIntents(promptsConfig),
      hotKeys: userConfig['inspector.hotKey'] ?? 'alt',
      theme: userConfig['inspector.theme'] ?? 'auto',
      includeSnippet: userConfig['prompt.includeSnippet'] ?? false,
      autoSend: userConfig['prompt.autoSend'] ?? false,
    }

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

    const absolutePath = path.isAbsolute(body.file)
      ? path.resolve(body.file)
      : path.resolve(serverState.cwd, body.file)

    // Security: Prevent path traversal attacks
    const relativeToRoot = path.relative(serverState.projectRoot, absolutePath)
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
      serverLogger.warn(`Security: Blocked path traversal attempt in IDE_OPEN: ${body.file}`)
      res.writeHead(403, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Access denied: File is outside of project workspace' }))
      return
    }

    const userConfig = loadUserConfigSync(false, serverState.cwd, serverState.configRoot)

    // Strict Config Override: Respect user config if explicitly set and differs from active IDE
    const configuredIde = userConfig.ide
    const activeIde = serverState.ideInfo?.ide
    const activeIdeScheme = serverState.ideInfo?.scheme

    // Priority: 1. User config 2. Active IDE detection 3. Fallback
    const rawEditorHint = configuredIde || activeIde || activeIdeScheme || 'code'

    if (configuredIde && activeIdeScheme && !activeIdeScheme.includes(configuredIde)) {
      serverLogger.warn(
        `Active IDE is ${activeIdeScheme}, but config forces ${configuredIde}. Using configured IDE.`,
      )
    }

    let editorHint = rawEditorHint
    if (rawEditorHint === 'vscode') editorHint = 'code'
    else if (rawEditorHint === 'vscode-insiders') editorHint = 'code-insiders'
    else if (rawEditorHint === 'vscodium') editorHint = 'codium'
    // Map trae-cn back to trae for launchIDE to recognize it correctly,
    // since launchIDE only maps 'trae' in its keys.
    else if (rawEditorHint === 'trae-cn' || rawEditorHint === 'trae') editorHint = 'trae'

    serverLogger.debug(
      `IDE_OPEN: activeIde=${activeIde}, activeIdeScheme=${activeIdeScheme}, configuredIde=${configuredIde} -> rawEditorHint=${rawEditorHint}, finalEditorHint=${editorHint}`,
    )

    // Bypass launchIDE for VSCode family IDEs that support URL schemes.
    // launch-ide has a hardcoded dictionary that maps 'trae-cn' to 'trae://', which fails on macOS.
    // Using the URL scheme directly is more reliable and supports opening files even if the IDE isn't running yet.
    const VSCODE_FAMILY_SCHEMES = [
      'vscode',
      'vscode-insiders',
      'cursor',
      'windsurf',
      'trae',
      'trae-cn',
      'vscodium',
      'codebuddy',
      'codebuddy-cn',
      'antigravity',
    ]

    if (VSCODE_FAMILY_SCHEMES.includes(rawEditorHint)) {
      let normalizedPath = absolutePath.replace(/\\/g, '/')
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath
      }
      const encodedPath = encodeURI(normalizedPath)
      const uri = `${rawEditorHint}://file${encodedPath}:${body.line}:${body.column}`
      serverLogger.debug(`IDE_OPEN: Bypassing launchIDE, using URI scheme directly: ${uri}`)

      try {
        if (process.platform === 'darwin') {
          execFileSync('open', [uri])
        } else if (process.platform === 'win32') {
          execFileSync('cmd', ['/c', 'start', '""', uri])
        } else {
          execFileSync('xdg-open', [uri])
        }
      } catch (e) {
        serverLogger.error(`Failed to launch URI for IDE_OPEN (${uri}):`, e)
        // Fallback to launchIDE if scheme launch fails
        launchIDE({
          file: absolutePath,
          line: body.line,
          column: body.column,
          editor: editorHint as Editor,
          type: process.platform === 'darwin' ? 'open' : 'exec',
        })
      }
    } else {
      launchIDE({
        file: absolutePath,
        line: body.line,
        column: body.column,
        editor: editorHint as Editor,
        type: process.platform === 'darwin' ? 'open' : 'exec',
      })
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
      const absolutePath = path.isAbsolute(file)
        ? path.resolve(file)
        : path.resolve(serverState.cwd, file)

      // Security: Prevent path traversal attacks
      const relativeToRoot = path.relative(serverState.projectRoot, absolutePath)
      if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
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

  // Handle IDE payload ticket retrieval
  if (pathname.startsWith(`${INSPECTO_API_PATHS.AI_TICKET}/`) && req.method === 'GET') {
    const ticketId = pathname.substring(INSPECTO_API_PATHS.AI_TICKET.length + 1)
    const payloadStr = payloadTickets.get(ticketId)

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
  const { location, snippet, prompt } = req

  const userConfig = loadUserConfigSync(false, serverState.cwd, serverState.configRoot)
  const resolvedTarget = resolveTargetTool(userConfig)

  const formattedPrompt =
    prompt ??
    `Please help me with this code from \`${location.file}\` (line ${location.line}):\n\n\`\`\`\n${snippet}\n\`\`\`\n`

  const ideReportedMode = serverState.ideInfo?.providers[resolvedTarget]?.mode

  // Generate the full payload
  const configuredIde = userConfig.ide
  const activeIde = serverState.ideInfo?.ide
  const activeIdeScheme = serverState.ideInfo?.scheme

  // Priority: 1. User config 2. Active IDE Scheme (for URI construction) 3. Active IDE fallback
  const finalIde: string = configuredIde || activeIdeScheme || activeIde || 'vscode'

  if (configuredIde && activeIdeScheme && !activeIdeScheme.includes(configuredIde)) {
    serverLogger.warn(
      `dispatchToAi: Active IDE is ${activeIdeScheme}, but config forces ${configuredIde}. Using configured IDE.`,
    )
  }

  const mode = resolveProviderMode(resolvedTarget, finalIde as IdeType, userConfig)
  const overrides = extractToolOverrides(finalIde as IdeType, userConfig)[resolvedTarget] || {}
  overrides.type = mode

  const fullPayload = {
    ide: finalIde,
    target: resolvedTarget,
    targetType: mode,
    prompt: formattedPrompt,
    filePath: location.file,
    line: location.line,
    column: location.column,
    snippet,
    overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
    autoSend:
      userConfig['prompt.autoSend'] !== undefined
        ? Boolean(userConfig['prompt.autoSend'])
        : undefined,
  }

  // Create a ticket and store the full payload in memory
  const ticketId = createTicket(fullPayload)

  // Only pass the ticket and critical routing info via URI
  const params = new URLSearchParams()
  params.set('ticket', ticketId)
  params.set('target', resolvedTarget)

  // Use the exact scheme reported by the extension if available, fallback to user config or 'vscode'
  const uri = `${finalIde}://inspecto.inspecto/send?${params.toString()}`

  serverLogger.debug(`dispatchToAi: Generated URI: ${uri}`)

  launchURI(uri)

  // Return success along with the payload so the browser can fallback to clipboard
  return {
    success: true,
    fallbackPayload: {
      prompt: formattedPrompt,
      file: location.file,
    },
  }
}
