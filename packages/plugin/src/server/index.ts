import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execSync, execFileSync } from 'node:child_process'
import portfinder from 'portfinder'
import { launchIDE } from 'launch-ide'
import type {
  ServerState,
  OpenFileRequest,
  SendToAiRequest,
  SendToAiResponse,
  IdeType,
  AiTool,
} from '@inspecto/types'
import { extractSnippet } from './snippet.js'
import {
  loadUserConfigSync,
  loadPromptsConfig,
  resolveToolMode,
  extractToolOverrides,
  watchConfig,
  unwatchConfig,
  resolveTargetTool,
} from '../config.js'

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
  let gitRoot: string
  try {
    gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim()
  } catch {
    gitRoot = process.cwd()
  }

  // Walk upward from gitRoot looking for the nearest ancestor that contains .inspecto/.
  // This handles nested-git-repo playgrounds (e.g. playground/nextjs has its own .git
  // but the real config lives in the monorepo root two levels up).
  let current = gitRoot
  while (true) {
    if (fs.existsSync(path.join(current, '.inspecto'))) return current
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  // No .inspecto/ found anywhere — fall back to the git root (or cwd)
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
    console.error('[inspecto] Failed to launch URI via execFileSync, falling back to launchIDE:', e)
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
      console.log('[inspecto] user config reloaded.')
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
      console.error('[inspecto] server error:', err)
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
    console.error('[inspecto] persistent server error:', err)
  })

  serverState.port = port
  serverState.running = true

  // Write port file so the IDE extension can discover the server without scanning ports
  const portFile = path.join(os.tmpdir(), 'inspecto.port')
  try {
    fs.writeFileSync(portFile, String(port), 'utf-8')
  } catch {
    /* non-fatal — extension will fall back to scanning */
  }
  // Clean up on process exit (Vite terminates the process, not stopServer)
  process.once('exit', () => {
    try {
      fs.unlinkSync(portFile)
    } catch {
      /* ignore */
    }
  })

  console.log(`[inspecto] server running at http://127.0.0.1:${port}`)

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

  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, port: serverState.port }))
    return
  }

  if (pathname === '/config' && req.method === 'GET') {
    const userConfig = loadUserConfigSync(false, serverState.cwd, serverState.configRoot)
    const promptsConfig = await loadPromptsConfig(false, serverState.cwd, serverState.configRoot)
    const effectiveIde = (userConfig.ide ?? 'vscode') as IdeType

    let info: any
    if (!serverState.ideInfo) {
      // Extension hasn't registered yet — derive available targets from user config
      const fallbackTargets = userConfig.providers
        ? (Object.keys(userConfig.providers) as AiTool[])
        : ['claude-code', 'gemini', 'coco', 'codex']

      info = {
        ide: effectiveIde,
        providers: fallbackTargets.reduce(
          (acc, target) => {
            acc[target] = {
              mode: resolveToolMode(target as AiTool, effectiveIde, userConfig),
              installed: false,
            }
            return acc
          },
          {} as Record<string, { mode: string; installed: boolean }>,
        ),
      }
    } else {
      const { scheme: _scheme, ...rest } = serverState.ideInfo as any
      info = rest
    }

    // Ensure provider modes are correct even if provided by IDE
    const resolvedProviders = { ...info.providers }
    for (const tool in resolvedProviders) {
      resolvedProviders[tool].mode = resolveToolMode(tool as AiTool, info.ide, userConfig)
    }

    const config = {
      ...info,
      providers: resolvedProviders,
      providerOverrides: extractToolOverrides(info.ide, userConfig),
      prompts: promptsConfig,
      hotKeys: userConfig.hotKeys,
      includeSnippet: userConfig.includeSnippet,
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(config))
    return
  }

  if (pathname === '/config' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req))
      serverState.ideInfo = body
      console.log(`[inspecto] Received IDE info from extension:`, body)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    } catch (e) {
      console.error('[inspecto] Error parsing /config POST request:', e)
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid JSON body' }))
    }
    return
  }

  if (pathname === '/open' && req.method === 'POST') {
    let body: OpenFileRequest
    try {
      body = JSON.parse(await readBody(req)) as OpenFileRequest
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid JSON body' }))
      return
    }

    const absolutePath = path.isAbsolute(body.file)
      ? body.file
      : path.resolve(serverState.cwd, body.file)

    const userConfig = loadUserConfigSync(false, serverState.cwd, serverState.configRoot)
    const ide = (userConfig.ide ?? 'vscode') as IdeType
    const editorHint = 'code'
    launchIDE({
      file: absolutePath,
      line: body.line,
      column: body.column,
      editor: editorHint,
      type: process.platform === 'darwin' ? 'open' : 'exec',
    })

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true }))
    return
  }

  if (pathname === '/snippet' && req.method === 'GET') {
    const file = url.searchParams.get('file') ?? ''
    const line = parseInt(url.searchParams.get('line') ?? '1', 10)
    const column = parseInt(url.searchParams.get('column') ?? '1', 10)
    const maxLines = parseInt(url.searchParams.get('maxLines') ?? '100', 10)

    try {
      const absolutePath = path.isAbsolute(file) ? file : path.resolve(serverState.cwd, file)

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

  if (pathname === '/send-to-ai' && req.method === 'POST') {
    try {
      const rawBody = await readBody(req)
      const body = JSON.parse(rawBody) as SendToAiRequest
      const result = await dispatchToAi(body)
      res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    } catch (e) {
      console.error('[inspecto] Error parsing /send-to-ai request:', e)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: String(e), errorCode: 'INTERNAL_ERROR' }))
    }
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'not found' }))
}

async function dispatchToAi(req: SendToAiRequest): Promise<SendToAiResponse> {
  const { location, snippet, prompt } = req

  const userConfig = loadUserConfigSync(false, serverState.cwd, serverState.configRoot)
  // userConfig.ide allows the user to declare their IDE explicitly in settings.
  // It takes priority over the runtime-detected IDE so that a dev server started
  // from VS Code can still dispatch to Trae/Cursor when the user says so.
  const ide = (userConfig.ide ?? 'vscode') as IdeType

  // Resolve preferred target based on phase-target-mode-unification.md strategy
  const resolvedTarget = resolveTargetTool(userConfig)

  const formattedPrompt =
    prompt ??
    `Please help me with this code from \`${location.file}\` (line ${location.line}):\n\n\`\`\`\n${snippet}\n\`\`\`\n`

  const params = new URLSearchParams()
  params.set('target', resolvedTarget)

  const overrides = extractToolOverrides(ide, userConfig)[resolvedTarget]
  if (overrides) {
    params.set('overrides', JSON.stringify(overrides))
  }

  params.set('prompt', formattedPrompt)
  params.set('file', location.file)
  params.set('line', String(location.line))
  params.set('col', String(location.column))
  params.set('snippet', snippet)

  // Use the exact scheme reported by the extension if available
  const scheme = serverState.ideInfo?.scheme || 'vscode'

  const uri = `${scheme}://inspecto.inspecto/send?${params.toString()}`

  console.log(`[inspecto] dispatchToAi: Generated URI: ${uri}`)

  launchURI(uri)
  return { success: true }
}
