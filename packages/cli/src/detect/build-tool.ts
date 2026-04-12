// ============================================================
// src/detect/build-tool.ts — Build tool detection (v1)
//
// v1 supported: Vite / Webpack / Rspack / esbuild / Rollup
// Recognized but unsupported: Next.js / Nuxt / Remix / Astro / SvelteKit
// ============================================================
import path from 'node:path'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import { exists, readFile, readJSON } from '../utils/fs.js'
import type { BuildTool, BuildToolDetection } from '../types.js'

interface PackageJSON {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
  version?: string
}

/**
 * Helper to check if a package can be resolved from the root directory.
 * This handles monorepo hoisting and implicit dependencies.
 */
function isPackageResolvable(pkgName: string, root: string): boolean {
  try {
    const require = createRequire(path.join(root, 'package.json'))
    try {
      require.resolve(`${pkgName}/package.json`, { paths: [root] })
      return true
    } catch {
      require.resolve(pkgName, { paths: [root] })
      return true
    }
  } catch {
    return false
  }
}

/**
 * Attempts to read the actual version of a hoisted package from node_modules.
 */
async function getResolvedPackageVersion(pkgName: string, root: string): Promise<string | null> {
  try {
    const require = createRequire(path.join(root, 'package.json'))
    const pkgJsonPath = require.resolve(`${pkgName}/package.json`, { paths: [root] })
    const pkg = await readJSON<PackageJSON>(pkgJsonPath)
    return pkg?.version || null
  } catch {
    return null
  }
}

function parseFirstSemver(
  version: string | null,
): { major: number; minor: number; patch: number } | null {
  if (!version) return null

  const match = version.match(/(\d+)\.(\d+)\.(\d+)/)
  if (!match) {
    return null
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

function isLegacyRspackVersion(version: string | null): boolean {
  const parsed = parseFirstSemver(version)
  if (!parsed) return false

  return parsed.major === 0 && parsed.minor < 4
}

function isLegacyWebpackVersion(version: string | null): boolean {
  const parsed = parseFirstSemver(version)
  if (!parsed) return false

  return parsed.major === 4
}

/** Supported build tools in v1 */
const SUPPORTED_PATTERNS: { tool: BuildTool; files: string[]; label: string }[] = [
  {
    tool: 'vite',
    files: [
      'vite.config.ts',
      'vite.config.js',
      'vite.config.mts',
      'vite.config.mjs',
      'vite.config.cjs',
      'vite.config.cts',
    ],
    label: 'Vite',
  },
  {
    tool: 'rspack',
    files: ['rspack.config.js', 'rspack.config.ts', 'rspack.config.mjs'],
    label: 'Rspack',
  },
  {
    tool: 'rsbuild',
    files: ['rsbuild.config.js', 'rsbuild.config.ts', 'rsbuild.config.mjs'],
    label: 'Rsbuild',
  },
  {
    tool: 'webpack',
    files: [
      'webpack.config.js',
      'webpack.config.ts',
      'webpack.config.mjs',
      'webpack.config.cjs',
      'webpack.config.common.js',
      'webpack.config.common.ts',
      'webpack.config.dev.js',
      'webpack.config.dev.ts',
      'webpack.config.prod.js',
      'webpack.config.prod.ts',
      'webpack.config.esbuild.js',
      'webpack.config.esbuild.ts',
      'webpack.config.build-pre.js',
      'webpack.config.build-pre.ts',
    ],
    label: 'Webpack',
  },
  {
    tool: 'esbuild',
    files: ['esbuild.config.js', 'esbuild.config.ts', 'esbuild.config.mjs', 'build.js', 'build.ts'],
    label: 'esbuild',
  },
  {
    tool: 'rollup',
    files: ['rollup.config.js', 'rollup.config.ts', 'rollup.config.mjs'],
    label: 'Rollup',
  },
]

/** Recognized but unsupported meta-frameworks — detect via dep + config file */
const UNSUPPORTED_META: { name: string; dep: string; files: string[] }[] = [
  { name: 'Next.js', dep: 'next', files: ['next.config.mjs', 'next.config.js', 'next.config.ts'] },
  { name: 'Nuxt', dep: 'nuxt', files: ['nuxt.config.ts', 'nuxt.config.js'] },
  { name: 'Remix', dep: '@remix-run/dev', files: ['remix.config.js', 'remix.config.ts'] },
  { name: 'Astro', dep: 'astro', files: ['astro.config.mjs', 'astro.config.ts'] },
  { name: 'SvelteKit', dep: '@sveltejs/kit', files: ['svelte.config.js', 'svelte.config.ts'] },
]

interface DetectionTarget {
  /** Relative path provided via --packages ('' for repo root) */
  packagePath: string
  /** Absolute path to run detection from */
  absolutePath: string
}

export interface BuildToolResult {
  supported: BuildToolDetection[]
  unsupported: string[]
}

function normalizeRelativePath(root: string, filePath: string): string {
  const relative = path.relative(root, filePath)
  const normalized = relative.split(path.sep).join('/')
  return normalized || path.basename(filePath)
}

function createTargets(root: string, packagePaths?: string[]): DetectionTarget[] {
  if (!packagePaths || packagePaths.length === 0) {
    return [{ packagePath: '', absolutePath: root }]
  }

  return packagePaths.map(pkg => ({
    packagePath: pkg,
    absolutePath: pkg ? path.join(root, pkg) : root,
  }))
}

async function getWorkspacePackagePatterns(root: string): Promise<string[]> {
  const pkg = await readJSON<{ workspaces?: string[] | { packages?: string[] } }>(
    path.join(root, 'package.json'),
  )

  const workspaces = pkg?.workspaces
  if (Array.isArray(workspaces)) {
    return workspaces
  }

  if (workspaces && Array.isArray(workspaces.packages)) {
    return workspaces.packages
  }

  const pnpmWorkspace = await readFile(path.join(root, 'pnpm-workspace.yaml'))
  if (!pnpmWorkspace) {
    return []
  }

  const patterns: string[] = []
  for (const line of pnpmWorkspace.split('\n')) {
    const match = line.match(/^\s*-\s*['"]?([^'"]+)['"]?\s*$/)
    if (match?.[1]) {
      patterns.push(match[1])
    }
  }

  return patterns
}

async function expandWorkspacePattern(root: string, pattern: string): Promise<string[]> {
  const normalized = pattern.replace(/\\/g, '/').replace(/\/$/, '')
  if (!normalized || normalized.startsWith('!')) {
    return []
  }

  if (!normalized.includes('*')) {
    return (await exists(path.join(root, normalized))) ? [normalized] : []
  }

  const starIndex = normalized.indexOf('*')
  const baseDir = normalized.slice(0, starIndex).replace(/\/$/, '')
  const suffix = normalized.slice(starIndex + 1)

  if (suffix && suffix !== '') {
    return []
  }

  const absoluteBaseDir = path.join(root, baseDir)
  if (!(await exists(absoluteBaseDir))) {
    return []
  }

  try {
    const entries = await fs.readdir(absoluteBaseDir, { withFileTypes: true })
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => path.posix.join(baseDir, entry.name))
  } catch {
    return []
  }
}

async function detectWorkspaceTargets(root: string): Promise<DetectionTarget[]> {
  const patterns = await getWorkspacePackagePatterns(root)
  if (patterns.length === 0) {
    return []
  }

  const packagePaths = new Set<string>()
  for (const pattern of patterns) {
    const expanded = await expandWorkspacePattern(root, pattern)
    for (const packagePath of expanded) {
      packagePaths.add(packagePath)
    }
  }

  return Array.from(packagePaths).map(packagePath => ({
    packagePath,
    absolutePath: path.join(root, packagePath),
  }))
}

/**
 * Detect all build tools / meta-frameworks.
 * Returns supported tools and recognized-but-unsupported meta-frameworks.
 */
export async function detectBuildTools(
  root: string,
  packagePaths?: string[],
): Promise<BuildToolResult> {
  const supported: BuildToolDetection[] = []
  const unsupported = new Set<string>()
  const explicitTargets = createTargets(root, packagePaths)
  const workspaceTargets =
    !packagePaths || packagePaths.length === 0 ? await detectWorkspaceTargets(root) : []
  const targets = workspaceTargets.length > 0 ? workspaceTargets : explicitTargets

  for (const target of targets) {
    const pkg = await readJSON<PackageJSON>(path.join(target.absolutePath, 'package.json'))
    const allDeps = { ...pkg?.dependencies, ...pkg?.devDependencies }
    const scripts = pkg?.scripts || {}

    const supportedChecks = SUPPORTED_PATTERNS.map(pattern =>
      detectPattern({
        pattern,
        workspaceRoot: root,
        targetRoot: target.absolutePath,
        packagePath: target.packagePath,
        allDeps,
        scripts,
      }),
    )

    const supportedResults = await Promise.all(supportedChecks)
    for (const result of supportedResults) {
      if (result) {
        supported.push(result)
      }
    }

    const unsupportedChecks = UNSUPPORTED_META.map(async meta => {
      if (!(meta.dep in allDeps)) return null
      for (const file of meta.files) {
        if (await exists(path.join(target.absolutePath, file))) {
          return meta.name
        }
      }
      return null
    })

    const unsupportedResults = await Promise.all(unsupportedChecks)
    for (const result of unsupportedResults) {
      if (result) {
        unsupported.add(result)
      }
    }
  }

  return { supported, unsupported: Array.from(unsupported) }
}

interface PatternContext {
  pattern: { tool: BuildTool; files: string[]; label: string }
  workspaceRoot: string
  targetRoot: string
  packagePath: string
  allDeps: Record<string, string | undefined>
  scripts: Record<string, string>
}

function rankScriptCommand(name: string, command: string): number {
  const haystack = `${name} ${command}`.toLowerCase()
  let score = 0

  if (/(^|[\s:_-])(start|dev|serve|watch)([\s:_-]|$)/.test(haystack)) score += 8
  if (/(^|[\s:_-])(prod|build|release|stats)([\s:_-]|$)/.test(haystack)) score -= 3
  if (/(^|[\s:_-])(dll|vendor)([\s:_-]|$)/.test(haystack)) score -= 6
  if (haystack.includes('webpack-dev-server')) score += 3
  if (haystack.includes('webpack')) score += 1
  if (haystack.includes('rspack')) score += 1

  return score
}

function extractConfigArgs(scriptContent: string): string[] {
  return Array.from(scriptContent.matchAll(/(?:-c|--config)\s+([^\s'"`;]+)/g))
    .map(match => match[1])
    .filter((value): value is string => Boolean(value))
}

async function resolveScriptRelativeCandidate(
  targetRoot: string,
  scriptPath: string,
  candidate: string,
): Promise<string | null> {
  const normalizedCandidate = candidate.replace(/^['"`]|['"`]$/g, '')
  const normalizedRelativeCandidate = path.normalize(normalizedCandidate)
  const possiblePaths: string[] = []

  if (normalizedRelativeCandidate.startsWith('..')) {
    possiblePaths.push(
      path.normalize(path.join(path.dirname(scriptPath), normalizedRelativeCandidate)),
    )
  } else {
    possiblePaths.push(normalizedRelativeCandidate)
    possiblePaths.push(
      path.normalize(path.join(path.dirname(scriptPath), normalizedRelativeCandidate)),
    )
  }

  for (const possiblePath of possiblePaths) {
    if (await exists(path.join(targetRoot, possiblePath))) {
      return possiblePath.split(path.sep).join('/')
    }
  }

  return null
}

async function resolveRspackConfigFromScript(
  targetRoot: string,
  scriptPath: string,
): Promise<string | null> {
  const scriptContent = await readFile(path.join(targetRoot, scriptPath))
  if (!scriptContent) {
    return null
  }

  for (const candidate of extractConfigArgs(scriptContent)) {
    const resolved = await resolveScriptRelativeCandidate(targetRoot, scriptPath, candidate)
    if (resolved) {
      return resolved
    }
  }

  const matches = scriptContent.matchAll(
    /['"`]([^'"`\n]*rspack[^'"`\n]*config[^'"`\n]*\.(?:js|ts|mjs|cjs))['"`]/g,
  )

  for (const match of matches) {
    const candidate = match[1]
    if (!candidate) continue
    const resolved = await resolveScriptRelativeCandidate(targetRoot, scriptPath, candidate)
    if (resolved) {
      return resolved
    }
  }

  return null
}

async function resolveWebpackBaseConfigFromFile(
  targetRoot: string,
  configPath: string,
): Promise<string | null> {
  const configContent = await readFile(path.join(targetRoot, configPath))
  if (!configContent) {
    return null
  }

  for (const candidate of extractConfigArgs(configContent)) {
    const resolved = await resolveScriptRelativeCandidate(targetRoot, configPath, candidate)
    if (resolved) {
      return resolved
    }
  }

  const matches = configContent.matchAll(
    /(?:configPath\s*=\s*|require\()\s*['"`]([^'"`\n]*webpack[^'"`\n]*config[^'"`\n]*\.(?:js|ts|mjs|cjs))['"`]/g,
  )

  for (const match of matches) {
    const candidate = match[1]
    if (!candidate) continue
    const resolved = await resolveScriptRelativeCandidate(targetRoot, configPath, candidate)
    if (resolved) {
      return resolved
    }
  }

  return null
}

async function detectPattern({
  pattern,
  workspaceRoot,
  targetRoot,
  packagePath,
  allDeps,
  scripts,
}: PatternContext): Promise<BuildToolDetection | null> {
  let hasDep: boolean
  let resolvedVersion: string | null = null

  if (pattern.tool === 'rspack') {
    const depName = allDeps['@rspack/cli'] ? '@rspack/cli' : '@rspack/core'
    hasDep =
      !!allDeps['@rspack/cli'] ||
      !!allDeps['@rspack/core'] ||
      isPackageResolvable('@rspack/core', targetRoot)

    if (hasDep) {
      resolvedVersion =
        allDeps[depName] || (await getResolvedPackageVersion('@rspack/core', targetRoot))
    }
  } else if (pattern.tool === 'webpack') {
    const depName = allDeps['webpack'] ? 'webpack' : 'webpack-cli'
    hasDep =
      !!allDeps['webpack'] || !!allDeps['webpack-cli'] || isPackageResolvable('webpack', targetRoot)

    if (hasDep) {
      resolvedVersion = allDeps[depName] || (await getResolvedPackageVersion('webpack', targetRoot))
    }
  } else if (pattern.tool === 'rsbuild') {
    hasDep = !!allDeps['@rsbuild/core'] || isPackageResolvable('@rsbuild/core', targetRoot)
  } else if (pattern.tool === 'vite') {
    hasDep = !!allDeps['vite'] || isPackageResolvable('vite', targetRoot)
  } else {
    hasDep = !!allDeps[pattern.tool] || isPackageResolvable(pattern.tool, targetRoot)
  }

  let detectedFile = ''
  let inferredFromScripts = false

  if (pattern.tool === 'esbuild' && !hasDep) {
    return null
  }

  for (const file of pattern.files) {
    if (await exists(path.join(targetRoot, file))) {
      detectedFile = file
      break
    }
  }

  if (
    hasDep &&
    !detectedFile &&
    (pattern.tool === 'esbuild' ||
      pattern.tool === 'rollup' ||
      pattern.tool === 'webpack' ||
      pattern.tool === 'rspack' ||
      pattern.tool === 'rsbuild')
  ) {
    const rankedScripts = Object.entries(scripts).sort(
      ([leftName, leftCommand], [rightName, rightCommand]) =>
        rankScriptCommand(rightName, rightCommand) - rankScriptCommand(leftName, leftCommand),
    )

    for (const [, cmd] of rankedScripts) {
      if (pattern.tool === 'webpack' || pattern.tool === 'rspack') {
        for (const configArg of extractConfigArgs(cmd)) {
          const resolvedConfig = await resolveScriptRelativeCandidate(targetRoot, '', configArg)
          if (resolvedConfig && (cmd.includes(pattern.tool) || cmd.includes(`${pattern.tool}-`))) {
            if (pattern.tool === 'webpack') {
              detectedFile =
                (await resolveWebpackBaseConfigFromFile(targetRoot, resolvedConfig)) ??
                resolvedConfig
            } else {
              detectedFile =
                (await resolveRspackConfigFromScript(targetRoot, resolvedConfig)) ?? resolvedConfig
            }
            break
          }
        }

        if (detectedFile) {
          break
        }
      }

      if (cmd.includes('node ')) {
        const match = cmd.match(/node\s+([^\s]+\.(js|mjs|cjs|ts))/)
        if (match && match[1]) {
          if (await exists(path.join(targetRoot, match[1]))) {
            if (cmd.includes(pattern.tool) || match[1].includes(pattern.tool)) {
              if (pattern.tool === 'rspack') {
                detectedFile =
                  (await resolveRspackConfigFromScript(targetRoot, match[1])) ?? match[1]
              } else if (pattern.tool === 'webpack') {
                detectedFile =
                  (await resolveWebpackBaseConfigFromFile(targetRoot, match[1])) ?? match[1]
              } else {
                detectedFile = match[1]
              }
              break
            }
          }
        }
      } else if (cmd.includes(`${pattern.tool} `)) {
        if (pattern.tool === 'webpack' || pattern.tool === 'rspack') {
          const configMatch = cmd.match(/--config\s+([^\s]+)/)
          if (configMatch && configMatch[1]) {
            if (await exists(path.join(targetRoot, configMatch[1]))) {
              detectedFile = configMatch[1]
              break
            }
          }
        }

        if (!detectedFile) {
          inferredFromScripts = true
          detectedFile = 'package.json (scripts)'
          break
        }
      }
    }
  }

  if (!detectedFile) {
    if (
      hasDep &&
      (pattern.tool === 'rollup' ||
        pattern.tool === 'webpack' ||
        pattern.tool === 'rspack' ||
        pattern.tool === 'esbuild')
    ) {
      // dependency present but no config/scripting evidence; provide low-confidence detection
      return {
        tool: pattern.tool,
        configPath: 'package.json (dependency)',
        label: `${pattern.label} (detected via dependency)`,
        ...(packagePath ? { packagePath } : {}),
      }
    }
    return null
  }

  let isLegacyRspack = false
  let isLegacyWebpack = false

  if (pattern.tool === 'rspack') {
    if (isLegacyRspackVersion(resolvedVersion)) {
      isLegacyRspack = true
    }
  } else if (pattern.tool === 'webpack') {
    if (isLegacyWebpackVersion(resolvedVersion)) {
      isLegacyWebpack = true
    }
  }

  const absoluteConfig = path.join(targetRoot, detectedFile)
  const relativeConfig = normalizeRelativePath(workspaceRoot, absoluteConfig)

  return {
    tool: pattern.tool,
    configPath: relativeConfig,
    label: `${pattern.label} (${relativeConfig})${isLegacyRspack ? ' [Legacy]' : ''}${
      isLegacyWebpack ? ' [Webpack 4]' : ''
    }${inferredFromScripts ? ' [Scripts Detected]' : ''}`,
    ...(isLegacyRspack ? { isLegacyRspack: true } : {}),
    ...(isLegacyWebpack ? { isLegacyWebpack: true } : {}),
    ...(packagePath ? { packagePath } : {}),
  }
}

/**
 * Determine which detection to use for injection.
 */
export function resolveInjectionTarget(
  detections: BuildToolDetection[],
): BuildToolDetection | null | 'ambiguous' {
  if (detections.length === 0) return null
  if (detections.length === 1) return detections[0]!
  return 'ambiguous'
}
