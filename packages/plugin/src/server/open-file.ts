import { execFileSync } from 'node:child_process'
import { Editor, launchIDE } from 'launch-ide'
import type { OpenFileRequest, ServerState } from '@inspecto-dev/types'
import { loadUserConfigSync } from '../config.js'
import { createLogger } from '../utils/logger.js'
import { getGlobalLogLevel } from '../config.js'
import { assertPathWithinIdeOpenScope, resolveWorkspacePath } from './path-guards.js'

const serverLogger = createLogger('inspecto:server', { logLevel: getGlobalLogLevel() })

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

export function handleOpenFileRequest(
  body: OpenFileRequest,
  serverState: ServerState,
): { success: true } {
  const absolutePath = resolveWorkspacePath(body.file, serverState.cwd)

  assertPathWithinIdeOpenScope(absolutePath, serverState.projectRoot)

  const userConfig = loadUserConfigSync(false, serverState.cwd, serverState.configRoot)
  const configuredIde = userConfig.ide
  const activeIde = serverState.ideInfo?.ide
  const activeIdeScheme = serverState.ideInfo?.scheme

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
  else if (rawEditorHint === 'trae-cn' || rawEditorHint === 'trae') editorHint = 'trae'

  serverLogger.debug(
    `IDE_OPEN: activeIde=${activeIde}, activeIdeScheme=${activeIdeScheme}, configuredIde=${configuredIde} -> rawEditorHint=${rawEditorHint}, finalEditorHint=${editorHint}`,
  )

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

  return { success: true }
}
