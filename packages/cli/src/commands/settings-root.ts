import { execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { exists } from '../utils/fs.js'

export async function resolveSettingsRoot(cwd: string): Promise<string | null> {
  let current = cwd
  const home = os.homedir()
  const gitRoot = resolveGitRoot(cwd)

  while (true) {
    if (gitRoot && !isUnderOrEqual(current, gitRoot)) return null
    if (current === home) return null
    if (isHomeOrHomeAncestor(current, home)) return null
    if (await exists(path.join(current, '.inspecto'))) return current
    if (gitRoot && current === gitRoot) return null

    const parent = path.dirname(current)
    if (parent === current) return null
    current = parent
  }
}

function resolveGitRoot(cwd: string): string | null {
  try {
    const output = execSync('git rev-parse --show-toplevel', { cwd, encoding: 'utf-8' })
    return typeof output === 'string' ? output.trim() : null
  } catch {
    return null
  }
}

function isUnderOrEqual(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(root + path.sep)
}

function isHomeOrHomeAncestor(candidate: string, home: string): boolean {
  return candidate === home || home.startsWith(candidate + path.sep)
}
