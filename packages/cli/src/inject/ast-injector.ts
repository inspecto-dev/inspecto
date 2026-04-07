// ============================================================
// src/inject/ast-injector.ts — Safe plugin injection (v1)
//
// Implements the Strategy Pattern to delegate AST manipulation
// and manual instruction generation to specific build tool strategies.
//
// Safety protocol:
//   1. Parse config file safely
//   2. Idempotency check (skip if already injected)
//   3. Find matching strategy
//   4. Delegate injection to strategy
//   5. Write modified configuration back to file
//   6. Fallback to manual instructions if automatic modification fails
// ============================================================

import path from 'node:path'
import { loadFile, writeFile as writeAstFile } from 'magicast'
import { readFile } from '../utils/fs.js'
import { log } from '../utils/logger.js'
import type { BuildToolDetection, Mutation } from '../types.js'
import { STRATEGIES } from './strategies/index.js'
import type { InjectStrategy } from './strategies/types.js'

function printManualInstructions(
  strategy: InjectStrategy | undefined,
  detection: BuildToolDetection,
  reason: string,
  quiet = false,
) {
  if (quiet) return
  log.warn(`Could not automatically configure ${detection.configPath}`)
  log.hint(`(reason: ${reason})`)
  log.blank()
  log.hint('Please add the following manually:')

  if (strategy) {
    const instructions = strategy.getManualInstructions(detection, reason)
    log.copyableCodeBlock(instructions)
  } else {
    log.error(`Unsupported build tool: ${detection.tool}`)
  }
}

/** Check if inspecto is already injected (idempotency). */
function isAlreadyInjected(content: string): boolean {
  const normalized = content.replace(/\s+/g, ' ')
  const importPlugin = /import\s+(.+?)\s+from\s+['"]@inspecto-dev\/plugin['"]/g
  const requirePlugin = /require\(['"]@inspecto-dev\/plugin['"]\)/
  const legacyImport = /import\s+.*ai-dev-inspector/.test(normalized)
  const legacyRequire = /require\(['"]ai-dev-inspector['"]\)/.test(normalized)

  if (legacyImport || legacyRequire || requirePlugin.test(normalized)) return true

  let match: RegExpExecArray | null
  importPlugin.lastIndex = 0
  while ((match = importPlugin.exec(normalized))) {
    const importClause = match[1] || ''
    if (/inspecto/.test(importClause) || /vitePlugin/.test(importClause)) {
      return true
    }
  }

  return false
}

// ---- Main injection orchestrator ----

export interface InjectionResult {
  success: boolean
  mutations: Mutation[]
  failureReason?: string
}

export async function injectPlugin(
  root: string,
  detection: BuildToolDetection,
  dryRun: boolean,
  quiet = false,
): Promise<InjectionResult> {
  const configPath = path.join(root, detection.configPath)
  const mutations: Mutation[] = []

  const strategy = STRATEGIES.find(s => s.supports(detection.tool))

  // Step 1: Read config file to check existence and idempotency
  const content = await readFile(configPath)
  if (!content) {
    printManualInstructions(strategy, detection, 'config file not readable', quiet)
    return { success: false, mutations, failureReason: 'config file not readable' }
  }

  // Step 2: Idempotency check
  if (isAlreadyInjected(content)) {
    if (!quiet) {
      log.success(`Plugin already configured in ${detection.configPath} (skipped)`)
    }

    mutations.push({
      type: 'file_modified',
      path: detection.configPath,
      description: 'Previously configured inspecto() plugin',
    })

    return { success: true, mutations }
  }

  if (!strategy) {
    printManualInstructions(
      strategy,
      detection,
      `No injection strategy found for ${detection.tool}`,
      quiet,
    )
    return { success: false, mutations, failureReason: 'No strategy found' }
  }

  // Step 3: Automatic configuration
  if (dryRun) {
    if (!quiet) {
      log.dryRun(`Would automatically configure plugin in ${detection.configPath}`)
    }
    return { success: true, mutations: [] }
  }

  try {
    const mod = await loadFile(configPath)

    // Delegate to strategy
    strategy.inject({
      mod,
      detection,
    })

    // Step 4: Write modified config back to file
    await writeAstFile(mod, configPath)

    mutations.push({
      type: 'file_modified',
      path: detection.configPath,
      description: 'Automatically configured inspecto() plugin',
    })

    if (!quiet) {
      log.success(`Configured plugin in ${detection.configPath}`)
    }
    return { success: true, mutations }
  } catch (err) {
    // Graceback degradation
    printManualInstructions(
      strategy,
      detection,
      `Automatic configuration unavailable: ${err instanceof Error ? err.message : String(err)}`,
      quiet,
    )
    return {
      success: false,
      mutations,
      failureReason: 'Automatic configuration unavailable',
    }
  }
}
