import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { createLogger } from '../utils/logger.js'
import { getGlobalLogLevel } from '../config.js'

const serverLogger = createLogger('inspecto:server', { logLevel: getGlobalLogLevel() })

export function resolveProjectRoot(): string {
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

  const cwdMatch = search(cwd, path.parse(cwd).root)
  if (cwdMatch) return cwdMatch

  const repoMatch = search(gitRoot, path.parse(gitRoot).root)
  if (repoMatch) return repoMatch

  return gitRoot
}
