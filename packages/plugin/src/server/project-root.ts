import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execSync } from 'node:child_process'
import { createLogger } from '../utils/logger.js'
import { getGlobalLogLevel } from '../config.js'

const serverLogger = createLogger('inspecto:server', { logLevel: getGlobalLogLevel() })

function resolveGitRoot(_cwd: string): string | null {
  try {
    const output = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' })
    return typeof output === 'string' ? output.trim() : null
  } catch (e) {
    serverLogger.warn('Failed to resolve git root via git rev-parse:', e)
    return null
  }
}

function findNearestAncestorWith(
  start: string,
  predicate: (dir: string) => boolean,
): string | null {
  let current = start
  while (true) {
    if (predicate(current)) return current
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

function findNearestAncestorWithin(
  start: string,
  stopAt: string,
  predicate: (dir: string) => boolean,
): string | null {
  let current = start
  const isUnderOrEqual = current === stopAt || current.startsWith(stopAt + path.sep)
  if (!isUnderOrEqual) return null

  while (true) {
    if (predicate(current)) return current
    if (current === stopAt) break
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

export function resolveWorkspaceRoot(): string {
  const cwd = process.cwd()
  const gitRoot = resolveGitRoot(cwd)
  const packageRoot = findNearestAncestorWith(cwd, dir =>
    fs.existsSync(path.join(dir, 'package.json')),
  )
  const home = os.homedir()
  const hasProjectInspecto = (dir: string) =>
    !isHomeOrHomeAncestor(dir, home) && fs.existsSync(path.join(dir, '.inspecto'))
  const inspectoRoot = gitRoot
    ? findNearestAncestorWithin(cwd, gitRoot, hasProjectInspecto)
    : findNearestAncestorWith(cwd, hasProjectInspecto)
  if (inspectoRoot) return inspectoRoot

  if (gitRoot) return gitRoot
  if (packageRoot) return packageRoot

  return cwd
}

export function resolveProjectRoot(): string {
  const cwd = process.cwd()
  const packageRoot = findNearestAncestorWith(cwd, dir =>
    fs.existsSync(path.join(dir, 'package.json')),
  )
  if (packageRoot) return packageRoot

  const gitRoot = resolveGitRoot(cwd)
  const home = os.homedir()
  const hasProjectInspecto = (dir: string) =>
    !isHomeOrHomeAncestor(dir, home) && fs.existsSync(path.join(dir, '.inspecto'))
  const inspectoRoot = gitRoot
    ? findNearestAncestorWithin(cwd, gitRoot, hasProjectInspecto)
    : findNearestAncestorWith(cwd, hasProjectInspecto)
  if (inspectoRoot) return inspectoRoot

  return gitRoot ?? cwd
}

function isHomeOrHomeAncestor(dir: string, home: string): boolean {
  return dir === home || home.startsWith(dir + path.sep)
}
