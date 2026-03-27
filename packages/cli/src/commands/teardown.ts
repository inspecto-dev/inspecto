// ============================================================
// src/commands/teardown.ts — Precise uninstall with install.lock
// ============================================================
import path from 'node:path'
import { log } from '../utils/logger.js'
import { exists, readJSON, copyFile, removeDir, removeFile } from '../utils/fs.js'
import { shell } from '../utils/exec.js'
import { detectPackageManager, getUninstallCommand } from '../detect/package-manager.js'
import { cleanGitignore } from '../inject/gitignore.js'
import type { InstallLock } from '../types.js'

export async function teardown(): Promise<void> {
  const root = process.cwd()

  log.header('Inspecto Teardown')

  const lockPath = path.join(root, '.inspecto', 'install.lock')
  const lock = await readJSON<InstallLock>(lockPath)

  if (!lock) {
    // ---- Best-effort mode (no install.lock) ----
    log.warn('No .inspecto/install.lock found. Running in best-effort mode.')
    log.blank()

    // Try to remove dependency
    const pm = await detectPackageManager(root)
    try {
      const cmd = getUninstallCommand(pm, '@inspecto/plugin')
      await shell(cmd, root)
      log.success('Removed @inspecto/plugin from devDependencies')
    } catch {
      log.warn('Could not remove @inspecto/plugin (may not be installed)')
    }

    // Remove .inspecto directory
    if (await exists(path.join(root, '.inspecto'))) {
      await removeDir(path.join(root, '.inspecto'))
      log.success('Deleted .inspecto/ directory')
    }

    // Clean gitignore
    await cleanGitignore(root)
    log.success('Cleaned .gitignore entries')

    // Warn about config file
    log.warn('Cannot restore build config (no backup reference)')
    log.hint('Please manually remove the inspecto() plugin from your build config')

    log.blank()
    return
  }

  // ---- Precise mode (with install.lock) ----
  log.success('Reading .inspecto/install.lock...')
  log.blank()

  for (const mutation of lock.mutations) {
    switch (mutation.type) {
      case 'file_modified': {
        if (mutation.backup && mutation.path) {
          const backupPath = path.join(root, mutation.backup)
          const targetPath = path.join(root, mutation.path)

          if (mutation.path === '.gitignore') {
            // For .gitignore, use the clean function instead of backup restore
            await cleanGitignore(root)
            log.success('Cleaned .gitignore entries')
            // Remove the .gitignore backup if it exists
            await removeFile(backupPath)
          } else if (await exists(backupPath)) {
            await copyFile(backupPath, targetPath)
            await removeFile(backupPath)
            log.success(`Restored ${mutation.path} from backup`)
          } else {
            log.warn(`Backup not found: ${mutation.backup}`)
            log.hint(`Please manually remove inspecto from ${mutation.path}`)
          }
        } else if (mutation.path && mutation.path !== '.gitignore') {
          log.warn(`Cannot auto-restore ${mutation.path} (no backup recorded)`)
          log.hint(`Please manually remove the inspecto() plugin from ${mutation.path}`)
        }
        break
      }

      case 'file_created': {
        // Will be cleaned up when we delete .inspecto/ directory
        break
      }

      case 'dependency_added': {
        if (mutation.name) {
          const pm = await detectPackageManager(root)
          try {
            const cmd = getUninstallCommand(pm, mutation.name)
            await shell(cmd, root)
            log.success(`Removed ${mutation.name} from devDependencies`)
          } catch {
            log.warn(`Could not remove ${mutation.name}`)
          }
        }
        break
      }

      case 'extension_installed': {
        if (mutation.id) {
          log.warn(`VS Code extension not auto-uninstalled`)
          log.hint(`Run: code --uninstall-extension ${mutation.id}`)
        }
        break
      }
    }
  }

  // Remove .inspecto directory (includes install.lock, settings.json, cache.json)
  await removeDir(path.join(root, '.inspecto'))
  log.success('Deleted .inspecto/ directory')

  // Clean .gitignore if not already handled
  await cleanGitignore(root)

  log.blank()
  log.success('Done. All Inspecto traces removed.')
  log.blank()
}
