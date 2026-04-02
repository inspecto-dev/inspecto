// ============================================================
// src/inject/gitignore.ts — .gitignore management
// ============================================================
import path from 'node:path'
import { readFile, writeFile } from '../utils/fs.js'
import { log } from '../utils/logger.js'

/** Rules for default mode: fine-grained rules only */
const DEFAULT_RULES = ['.inspecto/install.lock', '.inspecto/cache.json', '.inspecto/*.local.json']

/** Rules for shared mode: same as default in current design to allow settings.json */
const SHARED_RULES = ['.inspecto/install.lock', '.inspecto/cache.json', '.inspecto/*.local.json']

/**
 * Update .gitignore based on the init mode.
 *
 * Handles mode switching: if switching from default → shared,
 * replaces the broad `.inspecto/` rule with fine-grained rules.
 */
export async function updateGitignore(
  root: string,
  shared: boolean,
  dryRun: boolean,
): Promise<void> {
  const gitignorePath = path.join(root, '.gitignore')
  let content = (await readFile(gitignorePath)) ?? ''

  const desiredRules = shared ? SHARED_RULES : DEFAULT_RULES
  const hasGlobalRule = content.match(/^\.inspecto\/\s*$/m) !== null

  // Mode switch: If the user previously had the broad `.inspecto/` rule, replace it
  if (hasGlobalRule) {
    content = content.replace(/^\.inspecto\/\s*$/gm, SHARED_RULES.join('\n'))
    if (!dryRun) {
      await writeFile(gitignorePath, content)
    }
    log.success('Updated .gitignore: .inspecto/ is no longer fully ignored')
    return
  }

  // Check if rules already exist
  const missingRules = desiredRules.filter(rule => !content.includes(rule))
  if (missingRules.length === 0) {
    return // Already configured
  }

  // Append rules
  const section = '\n# Inspecto\n' + missingRules.join('\n') + '\n'
  content = content.trimEnd() + '\n' + section

  if (dryRun) {
    log.dryRun(`Would update .gitignore with: ${missingRules.join(', ')}`)
  } else {
    await writeFile(gitignorePath, content)
    log.success('Updated .gitignore')
  }
}

/**
 * Remove all Inspecto-related entries from .gitignore.
 */
export async function cleanGitignore(root: string): Promise<void> {
  const gitignorePath = path.join(root, '.gitignore')
  const content = await readFile(gitignorePath)
  if (!content) return

  const cleaned = content
    .replace(/^# Inspecto\s*$/m, '')
    .replace(/^\.inspecto\/?\s*$/gm, '')
    .replace(/^\.inspecto\/install\.lock\s*$/gm, '')
    .replace(/^\.inspecto\/cache\.json\s*$/gm, '')
    .replace(/^\.inspecto\/\*\.local\.json\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n') // Collapse excess blank lines

  await writeFile(gitignorePath, cleaned)
}
