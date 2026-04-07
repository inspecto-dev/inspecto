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
import {
  getHostIdeBinaryCandidates,
  getHostIdeBinaryName,
  getHostIdeLabel,
  isSupportedHostIde,
  type SupportedHostIde,
} from '../integrations/capabilities.js'
import { log } from '../utils/logger.js'
import type { Mutation } from '../types.js'

const EXTENSION_ID = 'inspecto.inspecto'

/** Try to find the VS Code binary at known filesystem paths */
async function findVSCodeBinary(): Promise<string | null> {
  const candidates = getHostIdeBinaryCandidates('vscode')
  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate
    }
  }

  if (await which('code-insiders')) {
    return 'code-insiders'
  }

  return null
}

async function findIdeBinary(ide: SupportedHostIde): Promise<string | null> {
  const binaryName = getHostIdeBinaryName(ide)
  if (binaryName && (await which(binaryName))) {
    return binaryName
  }

  if (ide === 'vscode') {
    return findVSCodeBinary()
  }

  const candidates = getHostIdeBinaryCandidates(ide)
  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate
    }
  }

  return null
}

async function installAlternativeIdeExtension(
  binaryPath: string,
  ideLabel: string,
  extensionRef: string,
  quiet: boolean,
): Promise<Mutation | null> {
  try {
    const { stdout } = await run(binaryPath, ['--list-extensions'])
    if (extensionRef === EXTENSION_ID && stdout.toLowerCase().includes(EXTENSION_ID)) {
      if (!quiet) {
        log.success(`${ideLabel} extension already installed`)
      }
      return { type: 'extension_installed', id: EXTENSION_ID, description: 'already_installed' }
    }
  } catch {
    // Continue to install attempt if listing fails.
  }

  try {
    await run(binaryPath, ['--install-extension', extensionRef, '--force'])
    if (!quiet) {
      log.success(`${ideLabel} extension installed via CLI`)
    }
    return { type: 'extension_installed', id: extensionRef, description: 'installed_via_cli' }
  } catch {
    try {
      const { stdout } = await run(binaryPath, ['--list-extensions'])
      if (extensionRef === EXTENSION_ID && stdout.toLowerCase().includes(EXTENSION_ID)) {
        if (!quiet) {
          log.success(`${ideLabel} extension already installed`)
        }
        return { type: 'extension_installed', id: EXTENSION_ID, description: 'already_installed' }
      }
    } catch {
      // Fall through to manual guidance.
    }

    return null
  }
}

export async function resolveHostIdeBinary(ide: string): Promise<string | null> {
  if (!isSupportedHostIde(ide)) return null
  return findIdeBinary(ide)
}

export async function openIdeWorkspace(ide: string, cwd: string): Promise<boolean> {
  const binaryPath = await resolveHostIdeBinary(ide)
  if (!binaryPath) {
    return false
  }

  try {
    await run(binaryPath, ['--new-window', cwd])
    return true
  } catch {
    return false
  }
}

/** Try to open a URI using the system default handler */
export async function openUri(uri: string): Promise<boolean> {
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
export async function installExtension(
  dryRun: boolean,
  ide?: string,
  quiet = false,
  extensionRef = EXTENSION_ID,
): Promise<Mutation | null> {
  if (dryRun) {
    if (!quiet) {
      log.dryRun('Would attempt to install VS Code extension')
    }
    return null
  }

  const isVSCode = !ide || ide === 'vscode'

  if (isVSCode) {
    // Level 1: Direct `code` command
    if (await which('code')) {
      try {
        await run('code', ['--install-extension', EXTENSION_ID])
        if (!quiet) {
          log.success('VS Code extension installed via CLI')
        }
        return { type: 'extension_installed', id: EXTENSION_ID, description: 'installed_via_cli' }
      } catch {
        // Fall through to next level
      }
    }

    // Level 2: Find VS Code binary at known paths
    const codePath = await findVSCodeBinary()
    if (codePath) {
      try {
        await run(codePath, ['--install-extension', EXTENSION_ID])
        if (!quiet) {
          log.success('VS Code extension installed via binary path')
          log.info(
            'Tip: Add "code" to your PATH to help Inspecto detect other AI tools in the future',
          )
        }
        return { type: 'extension_installed', id: EXTENSION_ID, description: 'installed_via_cli' }
      } catch {
        // Fall through to next level
      }
    }

    // Level 3: URI scheme
    const uri = `vscode:extension/${EXTENSION_ID}`
    if (await openUri(uri)) {
      if (!quiet) {
        log.warn('Opened extension page in VS Code')
        log.hint('Please click "Install" in the opened VS Code window to complete setup.')
      }
      return {
        type: 'extension_installed',
        id: EXTENSION_ID,
        description: 'opened_install_page',
        manual_action_required: true,
      }
    }

    // Level 4: Manual fallback
    if (!quiet) {
      log.warn('Could not auto-install VS Code extension')
      log.hint('Please install it manually to enable Inspector features:')
      log.hint('  1. Open VS Code')
      log.hint('  2. Press Ctrl+Shift+X (or Cmd+Shift+X)')
      log.hint('  3. Search for "Inspecto"')
      log.hint(`  Or visit: https://marketplace.visualstudio.com/items?itemName=${EXTENSION_ID}`)
    }
    return null
  }

  if (ide === 'cursor' && process.platform === 'darwin') {
    const cursorPath = await findIdeBinary('cursor')
    if (cursorPath) {
      const result = await installAlternativeIdeExtension(
        cursorPath,
        getHostIdeLabel('cursor'),
        extensionRef,
        quiet,
      )
      if (result) {
        return result
      }
    }
  }

  if (ide === 'trae' && process.platform === 'darwin') {
    const traePath = await findIdeBinary('trae')
    if (traePath) {
      const result = await installAlternativeIdeExtension(
        traePath,
        getHostIdeLabel('trae'),
        extensionRef,
        quiet,
      )
      if (result) {
        return result
      }
    }
  }

  if (ide === 'trae-cn' && process.platform === 'darwin') {
    const traeCnPath = await findIdeBinary('trae-cn')
    if (traeCnPath) {
      const result = await installAlternativeIdeExtension(
        traeCnPath,
        getHostIdeLabel('trae-cn'),
        extensionRef,
        quiet,
      )
      if (result) {
        return result
      }
    }
  }

  // Other IDEs: Prompt to install via VSIX
  if (!quiet) {
    log.warn(`Could not auto-install extension for ${ide}`)
    log.hint('Please install it manually to enable Inspector features:')
    log.hint(
      '  1. Download the latest .vsix file (Open VSX: https://open-vsx.org/extension/inspecto/inspecto)',
    )
    log.hint(`  2. Open ${ide}`)
    log.hint('  3. Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P)')
    log.hint('  4. Type and select "Extensions: Install from VSIX..."')
    log.hint('  5. Select the downloaded .vsix file')
  }
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
