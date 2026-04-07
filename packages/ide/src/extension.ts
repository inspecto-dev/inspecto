import * as crypto from 'node:crypto'
import * as vscode from 'vscode'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { getDualModeProviderCapability, type IdeInfo } from '@inspecto-dev/types'
import { INSPECTO_API_PATHS } from '@inspecto-dev/types'
import { InspectoUriHandler } from './uri-handler'
import { detectIde, resolveAvailableTargets, isExtensionInstalled } from './ide-detector'

const MAX_RETRIES = 5
const RETRY_BASE_MS = 1000

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('Inspecto')
  context.subscriptions.push(outputChannel)
  outputChannel.appendLine('Inspecto extension activated')
  outputChannel.appendLine(`IDE: ${vscode.env.uriScheme} / ${vscode.env.appName}`)

  // Detect IDE once — shared by URI handler and server push
  const ide = detectIde()
  const targets = resolveAvailableTargets(ide)

  outputChannel.appendLine(`Detected IDE: ${ide}`)
  outputChannel.appendLine(`Resolved targets: ${targets.join(', ')}`)

  context.subscriptions.push(vscode.window.registerUriHandler(new InspectoUriHandler(ide)))

  context.subscriptions.push(
    vscode.commands.registerCommand('inspecto.help', () => {
      vscode.window.showInformationMessage('inspecto: Use the browser overlay to inspect elements.')
    }),
  )

  let retryTimeoutId: NodeJS.Timeout | undefined

  const pushInfoWithRetry = async (attempt = 1): Promise<boolean> => {
    const workspaceRoot = getPreferredWorkspaceRoot()

    const claudeCapability = getDualModeProviderCapability('claude-code')
    const geminiCapability = getDualModeProviderCapability('gemini')
    const codexCapability = getDualModeProviderCapability('codex')

    const info: IdeInfo = {
      ide,
      scheme: vscode.env.uriScheme,
      workspaceRoot,
      providers: {
        copilot: { mode: 'extension', installed: targets.includes('copilot') },
        'claude-code': {
          mode:
            claudeCapability && isExtensionInstalled(claudeCapability.extensionId)
              ? 'extension'
              : 'cli',
          installed: targets.includes('claude-code'),
        },
        gemini: {
          mode:
            geminiCapability && isExtensionInstalled(geminiCapability.extensionId)
              ? 'extension'
              : 'cli',
          installed: targets.includes('gemini'),
        },
        codex: {
          mode:
            codexCapability && isExtensionInstalled(codexCapability.extensionId)
              ? 'extension'
              : 'cli',
          installed: targets.includes('codex'),
        },
        coco: { mode: 'cli', installed: targets.includes('coco') },
        trae: { mode: 'builtin', installed: targets.includes('trae') },
        cursor: { mode: 'builtin', installed: targets.includes('cursor') },
      },
    }

    outputChannel.appendLine(
      `[inspecto] Pushing IDE info (attempt ${attempt}): ide=${ide}, scheme=${vscode.env.uriScheme}, workspace=${workspaceRoot}`,
    )

    const success = await pushIdeInfoToServer(info)

    if (success) return true

    if (attempt < MAX_RETRIES) {
      // Exponential backoff: 2s, 4s, 8s, 16s
      const delay = Math.pow(2, attempt) * RETRY_BASE_MS
      if (retryTimeoutId) clearTimeout(retryTimeoutId)
      retryTimeoutId = setTimeout(() => pushInfoWithRetry(attempt + 1), delay)
    } else {
      outputChannel.appendLine(
        '[inspecto] Could not reach dev server after 5 attempts. Start your dev server and run "Inspecto: Push IDE Info" to retry.',
      )
    }

    return false
  }

  // Push immediately on activation
  pushInfoWithRetry()

  // Watch for inspecto.port.json file changes so we can push info automatically
  // when the user restarts their dev server.
  const portFile = path.join(os.tmpdir(), 'inspecto.port.json')
  let portFileWatcher: fs.FSWatcher | undefined
  try {
    // We watch the tmpdir because the file might not exist yet
    portFileWatcher = fs.watch(os.tmpdir(), (eventType, filename) => {
      if (
        (!filename || filename === 'inspecto.port.json') &&
        (eventType === 'change' || eventType === 'rename')
      ) {
        // Debounce slightly to ensure the server has finished booting
        if (retryTimeoutId) clearTimeout(retryTimeoutId)
        retryTimeoutId = setTimeout(() => {
          outputChannel.appendLine('Detected dev server restart, pushing IDE info...')
          pushInfoWithRetry(1)
        }, 500)
      }
    })
  } catch (e) {
    outputChannel.appendLine(`Failed to setup port file watcher: ${e}`)
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('inspecto.reportIde', async () => {
      if (retryTimeoutId) clearTimeout(retryTimeoutId)
      const success = await pushInfoWithRetry(1)
      if (success) {
        vscode.window.showInformationMessage('inspecto: Pushed IDE info to local dev server.')
      } else {
        vscode.window.showWarningMessage('inspecto: Could not reach dev server. Is it running?')
      }
    }),
  )

  context.subscriptions.push({
    dispose: () => {
      if (retryTimeoutId) clearTimeout(retryTimeoutId)
      if (portFileWatcher) portFileWatcher.close()
    },
  })
}

async function pushIdeInfoToServer(info: IdeInfo): Promise<boolean> {
  const ports = resolveServerPorts()
  for (const port of ports) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}${INSPECTO_API_PATHS.IDE_INFO}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      })
      if (res.ok) return true
    } catch {
      continue
    }
  }
  return false
}

export function resolveServerPorts(): number[] {
  const portFile = path.join(os.tmpdir(), 'inspecto.port.json')
  try {
    const raw = fs.readFileSync(portFile, 'utf-8').trim()
    const portData = JSON.parse(raw) as Record<string, number>

    const activePorts = Object.values(portData)

    const prioritized: number[] = []
    const seen = new Set<number>()
    const workspaceRoots = getWorkspaceRoots()
    for (const root of workspaceRoots) {
      const hash = crypto.createHash('md5').update(root).digest('hex')
      const port = portData[hash]
      if (port && !seen.has(port)) {
        prioritized.push(port)
        seen.add(port)
      }
    }

    const remaining = activePorts.filter(port => !seen.has(port))
    if (prioritized.length > 0 || remaining.length > 0) {
      return [...prioritized, ...remaining]
    }
  } catch {
    // File not present or invalid — fall through to scan range
  }

  // Fallback to legacy single-port file
  const legacyPortFile = path.join(os.tmpdir(), 'inspecto.port')
  try {
    const raw = fs.readFileSync(legacyPortFile, 'utf-8').trim()
    const port = parseInt(raw, 10)
    if (!isNaN(port) && port > 0 && port < 65536) {
      return [port]
    }
  } catch {
    // Legacy file not present
  }

  // Scan range fallback: covers portfinder's typical allocation window
  return Array.from({ length: 23 }, (_, i) => 5678 + i)
}

function getWorkspaceRoots(): string[] {
  const folders = vscode.workspace.workspaceFolders
  if (!folders || folders.length === 0) return []
  const roots = folders.map(folder => folder.uri.fsPath)
  return Array.from(new Set(roots))
}

function hasInspectoConfig(root: string): boolean {
  try {
    return fs.existsSync(path.join(root, '.inspecto'))
  } catch {
    return false
  }
}

function getPreferredWorkspaceRoot(): string {
  const editor = vscode.window.activeTextEditor
  if (editor) {
    const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri)
    if (folder && hasInspectoConfig(folder.uri.fsPath)) {
      return folder.uri.fsPath
    }
  }

  const roots = getWorkspaceRoots()
  const inspectoRoot = roots.find(root => hasInspectoConfig(root))
  if (inspectoRoot) return inspectoRoot

  if (editor) {
    const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri)
    if (folder) return folder.uri.fsPath
  }

  return roots[0] ?? ''
}

export function __testingGetPreferredWorkspaceRoot(): string {
  return getPreferredWorkspaceRoot()
}

export function deactivate(): void {
  // Disposables registered via context.subscriptions are cleaned up automatically.
  // deactivate() is kept as the required VS Code lifecycle hook.
}
