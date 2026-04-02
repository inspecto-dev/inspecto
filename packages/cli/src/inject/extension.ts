// ============================================================
// src/inject/extension.ts — VS Code extension auto-installer
// ============================================================
//
// Waterfall degradation strategy:
//   Level 1: `code --install-extension` (code in PATH)
//   Level 2: Find VS Code binary at known paths
//   Level 3: Open `vscode:extension/` URI scheme
//   Level 4: Print manual installation instructions
// ============================================================

import { which, run, shell } from '../utils/exec.js'
import { exists } from '../utils/fs.js'
import { log } from '../utils/logger.js'
import type { Mutation } from '../types.js'

const EXTENSION_ID = 'inspecto.inspecto'

/** Known VS Code binary locations by platform */
const VSCODE_PATHS: Record<string, string[]> = {
  darwin: [
    '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
    '/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders',
    `${process.env.HOME}/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code`,
  ],
  linux: ['/usr/bin/code', '/usr/share/code/bin/code', '/snap/bin/code', '/usr/bin/code-insiders'],
  win32: [
    `${process.env.LOCALAPPDATA}\\Programs\\Microsoft VS Code\\bin\\code.cmd`,
    `${process.env.LOCALAPPDATA}\\Programs\\Microsoft VS Code Insiders\\bin\\code-insiders.cmd`,
    `${process.env.PROGRAMFILES}\\Microsoft VS Code\\bin\\code.cmd`,
  ],
}

/** Try to find the VS Code binary at known filesystem paths */
async function findVSCodeBinary(): Promise<string | null> {
  const platform = process.platform
  const candidates = VSCODE_PATHS[platform] || []

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate
    }
  }

  // Also check for code-insiders in PATH
  if (await which('code-insiders')) {
    return 'code-insiders'
  }

  return null
}

/** Try to open a URI using the system default handler */
async function tryOpenURI(uri: string): Promise<boolean> {
  try {
    const platform = process.platform
    if (platform === 'win32') {
      await shell(`cmd /c start "" "${uri}"`)
    } else {
      const openCmd = platform === 'darwin' ? 'open' : 'xdg-open'
      await shell(`${openCmd} "${uri}"`)
    }
    return true
  } catch {
    return false
  }
}

/**
 * Attempt to install the VS Code extension using waterfall degradation.
 */
export async function installExtension(dryRun: boolean, ide?: string): Promise<Mutation | null> {
  if (dryRun) {
    log.dryRun('Would attempt to install VS Code extension')
    return null
  }

  const isVSCode = !ide || ide === 'vscode'

  if (isVSCode) {
    // Level 1: Direct `code` command
    if (await which('code')) {
      try {
        await run('code', ['--install-extension', EXTENSION_ID])
        log.success('VS Code extension installed via CLI')
        return { type: 'extension_installed', id: EXTENSION_ID }
      } catch {
        // Fall through to next level
      }
    }

    // Level 2: Find VS Code binary at known paths
    const codePath = await findVSCodeBinary()
    if (codePath) {
      try {
        await run(codePath, ['--install-extension', EXTENSION_ID])
        log.success('VS Code extension installed via binary path')
        log.info(
          'Tip: Add "code" to your PATH to help Inspecto detect other AI tools in the future',
        )
        return { type: 'extension_installed', id: EXTENSION_ID }
      } catch {
        // Fall through to next level
      }
    }

    // Level 3: URI scheme
    const uri = `vscode:extension/${EXTENSION_ID}`
    if (await tryOpenURI(uri)) {
      log.warn('Opened extension page in VS Code')
      log.hint('Please click "Install" in the opened VS Code window to complete setup.')
      return { type: 'extension_installed', id: EXTENSION_ID, manual_action_required: true }
    }

    // Level 4: Manual fallback
    log.warn('Could not auto-install VS Code extension')
    log.hint('Please install it manually to enable Inspector features:')
    log.hint('  1. Open VS Code')
    log.hint('  2. Press Ctrl+Shift+X (or Cmd+Shift+X)')
    log.hint('  3. Search for "Inspecto"')
    log.hint(`  Or visit: https://marketplace.visualstudio.com/items?itemName=${EXTENSION_ID}`)
    return null
  }

  // Other IDEs: Prompt to install via VSIX
  log.warn(`Could not auto-install extension for ${ide}`)
  log.hint('Please install it manually to enable Inspector features:')
  log.hint(
    '  1. Download the latest .vsix file (Open VSX: https://open-vsx.org/extension/inspecto/inspecto)',
  )
  log.hint(`  2. Open ${ide}`)
  log.hint('  3. Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P)')
  log.hint('  4. Type and select "Extensions: Install from VSIX..."')
  log.hint('  5. Select the downloaded .vsix file')
  return null
}

/**
 * Check if the extension is already installed.
 */
export async function isExtensionInstalled(): Promise<boolean> {
  try {
    // Try `code --list-extensions` first
    if (await which('code')) {
      const { stdout } = await run('code', ['--list-extensions'])
      return stdout.toLowerCase().includes(EXTENSION_ID)
    }

    // Try known binary path
    const codePath = await findVSCodeBinary()
    if (codePath) {
      const { stdout } = await run(codePath, ['--list-extensions'])
      return stdout.toLowerCase().includes(EXTENSION_ID)
    }

    return false
  } catch {
    return false
  }
}
