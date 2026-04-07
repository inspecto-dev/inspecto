// ============================================================
// src/detect/package-manager.ts — Lockfile-based PM detection
// ============================================================
import path from 'node:path'
import { exists } from '../utils/fs.js'
import type { PackageManager } from '../types.js'

/**
 * Detect the package manager by checking lockfile presence.
 * Priority: bun > pnpm > yarn > npm (fallback)
 */
export async function detectPackageManager(root: string): Promise<PackageManager> {
  const checks: [string, PackageManager][] = [
    ['bun.lockb', 'bun'],
    ['bun.lock', 'bun'],
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['package-lock.json', 'npm'],
  ]

  const results = await Promise.all(
    checks.map(async ([file, pm]) => {
      const isExist = await exists(path.join(root, file))
      return { isExist, pm }
    }),
  )

  for (const result of results) {
    if (result.isExist) {
      return result.pm
    }
  }

  return 'npm' // fallback
}

/** Get the install command for a package manager */
export function getInstallCommand(pm: PackageManager, pkg: string): string {
  switch (pm) {
    case 'bun':
      return `bun add -D ${pkg}`
    case 'pnpm':
      return `pnpm add -D ${pkg}`
    case 'yarn':
      return `yarn add -D ${pkg}`
    case 'npm':
      return `npm install -D ${pkg}`
  }
}

/** Get the uninstall command for a package manager */
export function getUninstallCommand(pm: PackageManager, pkg: string): string {
  switch (pm) {
    case 'bun':
      return `bun remove ${pkg}`
    case 'pnpm':
      return `pnpm remove ${pkg}`
    case 'yarn':
      return `yarn remove ${pkg}`
    case 'npm':
      return `npm uninstall ${pkg}`
  }
}
