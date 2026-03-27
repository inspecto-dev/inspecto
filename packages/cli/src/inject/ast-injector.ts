// ============================================================
// src/inject/ast-injector.ts — Safe plugin injection (v1)
//
// v1 scope: Standard `plugins: [...]` array injection.
// Covers Vite / Webpack / Rspack / esbuild / Rollup configs.
// Meta-framework special strategies (Next.js, Nuxt) deferred.
//
// Safety protocol:
//   1. Backup original file (.bak)
//   2. Idempotency check (skip if already injected)
//   3. Attempt regex-based injection
//   4. Basic syntax validation
//   5. Graceful degradation on any failure
// ============================================================

import path from 'node:path'
import { exists, readFile, writeFile, copyFile } from '../utils/fs.js'
import { log } from '../utils/logger.js'
import type { BuildTool, BuildToolDetection, Mutation } from '../types.js'

// ---- Import & plugin expression per build tool ----

const IMPORT_MAP: Record<BuildTool, string> = {
  vite: `import { vitePlugin as inspecto } from '@inspecto/plugin'`,
  webpack: `import { webpackPlugin as inspecto } from '@inspecto/plugin'`,
  rspack: `import { rspackPlugin as inspecto } from '@inspecto/plugin'`,
  rsbuild: `import { rspackPlugin as inspecto } from '@inspecto/plugin'`,
  esbuild: `import { esbuildPlugin as inspecto } from '@inspecto/plugin'`,
  rollup: `import { rollupPlugin as inspecto } from '@inspecto/plugin'`,
}

function getImportStatement(tool: BuildTool, isLegacyRspack?: boolean): string {
  if (tool === 'rspack' && isLegacyRspack) {
    return `import { rspackPlugin as inspecto } from '@inspecto/plugin/legacy/rspack'`
  }
  return IMPORT_MAP[tool]
}

function getPluginExpression(isLegacyRspack?: boolean): string {
  if (isLegacyRspack) {
    return `process.env.NODE_ENV !== 'production' && inspecto({
      pathType: 'absolute',
      escapeTags: ['Transition', 'AnimatePresence'],
    }) as any`
  }
  return `process.env.NODE_ENV !== 'production' && inspecto()`
}

// ---- Manual fallback instructions ----

function printManualInstructions(
  tool: BuildTool,
  configPath: string,
  reason: string,
  isLegacyRspack?: boolean,
) {
  const isRsbuild = tool === 'rsbuild'

  log.warn(`Could not safely auto-inject into ${configPath}`)
  log.hint(`(reason: ${reason})`)
  log.blank()
  log.hint('Please add the following manually:')

  if (isRsbuild) {
    log.codeBlock([
      getImportStatement(tool, isLegacyRspack),
      '',
      '// Add to tools.rspack:',
      `tools: {`,
      `  rspack: {`,
      `    plugins: [`,
      `      ${getPluginExpression(isLegacyRspack)},`,
      `    ]`,
      `  }`,
      `}`,
    ])
  } else {
    log.codeBlock([
      getImportStatement(tool, isLegacyRspack),
      '',
      '// Add to your plugins array:',
      `plugins: [`,
      `  ${getPluginExpression(isLegacyRspack)},`,
      `  ...otherPlugins`,
      `].filter(Boolean)`,
    ])
  }
}

// ---- Injection helpers ----

/** Check if inspecto is already injected (idempotency). */
function isAlreadyInjected(content: string): boolean {
  return (
    content.includes('@inspecto/plugin') ||
    content.includes('inspecto()') ||
    content.includes('aiDevInspector')
  ) // Legacy support
}

/** Inject import statement after the last existing import. */
function injectImport(content: string, importStmt: string): string {
  const importRegex = /^import\s.+$/gm
  let lastImportEnd = 0
  let match: RegExpExecArray | null

  while ((match = importRegex.exec(content)) !== null) {
    const lineEnd = content.indexOf('\n', match.index)
    if (lineEnd > lastImportEnd) {
      lastImportEnd = lineEnd
    }
  }

  // Also handle CJS require patterns
  if (lastImportEnd === 0) {
    const requireRegex = /^(?:const|let|var)\s.+=\s*require\(.+\).*$/gm
    while ((match = requireRegex.exec(content)) !== null) {
      const lineEnd = content.indexOf('\n', match.index)
      if (lineEnd > lastImportEnd) {
        lastImportEnd = lineEnd
      }
    }
  }

  if (lastImportEnd > 0) {
    return content.slice(0, lastImportEnd) + '\n' + importStmt + content.slice(lastImportEnd)
  }

  // No imports found, add at the beginning
  return importStmt + '\n\n' + content
}

/**
 * Core injection strategy.
 * For most tools: find `plugins: [` and insert after `[`.
 * For rsbuild: find `tools: { rspack: { plugins: [` or try to add it.
 */
function injectIntoPluginsArray(content: string, detection: BuildToolDetection): string | null {
  const tool = detection.tool
  if (tool === 'rsbuild') {
    // rsbuild needs to inject into tools.rspack.plugins or tools.rspack(config, { appendPlugins })
    // Due to the complexity of rsbuild config, we'll try a simple regex for `tools: { rspack: { plugins: [`
    // If that fails, we fallback to manual instructions which are explicitly for rsbuild.

    // Check if tools.rspack exists
    if (!content.includes('tools:') && !content.includes('rspack:')) {
      // Very basic config, we can try to inject before the closing brace of defineConfig
      const exportRegex = /(export default defineConfig\(\{)/
      const match = exportRegex.exec(content)
      if (match) {
        const insertPos = match.index + match[0].length
        const pluginExpr = `\n  tools: {\n    rspack: {\n      plugins: [\n        ${getPluginExpression(detection.isLegacyRspack)}\n      ]\n    }\n  },`
        return content.slice(0, insertPos) + pluginExpr + content.slice(insertPos)
      }
    }

    // Otherwise it's too complex for simple regex, force manual degradation
    return null
  }

  const pluginsRegex = /(plugins\s*:\s*\[)/
  const match = pluginsRegex.exec(content)
  if (!match) return null

  const insertPos = match.index + match[0].length
  const pluginExpr = `\n    ${getPluginExpression(detection.isLegacyRspack)},`

  return content.slice(0, insertPos) + pluginExpr + content.slice(insertPos)
}

/** Basic bracket-balance validation. */
function validateBrackets(content: string): boolean {
  const openBraces = (content.match(/\{/g) || []).length
  const closeBraces = (content.match(/\}/g) || []).length
  const openBrackets = (content.match(/\[/g) || []).length
  const closeBrackets = (content.match(/\]/g) || []).length

  return Math.abs(openBraces - closeBraces) <= 1 && Math.abs(openBrackets - closeBrackets) <= 1
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
): Promise<InjectionResult> {
  const configPath = path.join(root, detection.configPath)
  const backupPath = configPath + '.bak'
  const mutations: Mutation[] = []

  // Step 1: Read config file
  const content = await readFile(configPath)
  if (!content) {
    printManualInstructions(
      detection.tool,
      detection.configPath,
      'config file not readable',
      detection.isLegacyRspack,
    )
    return { success: false, mutations, failureReason: 'config file not readable' }
  }

  // Step 2: Idempotency check
  if (isAlreadyInjected(content)) {
    log.success(`Plugin already injected in ${detection.configPath} (skipped)`)

    // We still want to record the mutation so teardown knows how to clean it up
    // However, if the user manually added it, we shouldn't overwrite their code with a .bak on teardown.
    // To handle this, we register a special 'plugin_injected' mutation instead of 'file_modified',
    // which tells teardown to use AST-removal instead of .bak restoration (if we implement it)
    // For now, we will assume if it's already there and a .bak exists, we track it for restoration.
    if (await exists(backupPath)) {
      mutations.push({
        type: 'file_modified',
        path: detection.configPath,
        backup: detection.configPath + '.bak',
        description: 'Previously injected inspecto() plugin',
      })
    } else {
      // If no backup exists, we just mark it as modified but without backup
      // This tells teardown it was touched but cannot be safely rolled back
      mutations.push({
        type: 'file_modified',
        path: detection.configPath,
        description: 'Previously injected inspecto() plugin (no backup)',
      })
    }

    return { success: true, mutations }
  }

  // Step 3: Backup
  if (!dryRun) {
    await copyFile(configPath, backupPath)
    mutations.push({
      type: 'file_modified',
      path: detection.configPath,
      backup: detection.configPath + '.bak',
      description: 'Injected inspecto() plugin',
    })
  }
  log.success(`Backed up ${detection.configPath} → ${detection.configPath}.bak`)

  // Step 4: Inject into plugins array
  const injected = injectIntoPluginsArray(content, detection)
  if (!injected) {
    printManualInstructions(
      detection.tool,
      detection.configPath,
      'could not locate plugins array — file may use dynamic config, function wrapper, or non-standard export',
      detection.isLegacyRspack,
    )
    return {
      success: false,
      mutations,
      failureReason: 'could not locate plugins array',
    }
  }

  // Step 5: Inject import statement
  const importStmt = getImportStatement(detection.tool, detection.isLegacyRspack)
  const modifiedContent = injectImport(injected, importStmt)

  // Step 6: Bracket-balance validation
  if (!validateBrackets(modifiedContent)) {
    log.error('Syntax validation failed after injection')
    if (!dryRun) {
      await copyFile(backupPath, configPath)
      log.success(`Restored ${detection.configPath} from backup`)
    }
    printManualInstructions(
      detection.tool,
      detection.configPath,
      'injection produced unbalanced brackets',
      detection.isLegacyRspack,
    )
    return {
      success: false,
      mutations: [], // Rolled back
      failureReason: 'injection produced invalid syntax',
    }
  }

  // Step 7: Write
  if (dryRun) {
    log.dryRun(`Would inject plugin into ${detection.configPath}`)
  } else {
    await writeFile(configPath, modifiedContent)
    log.success(`Injected plugin into ${detection.configPath}`)
  }

  return { success: true, mutations }
}
