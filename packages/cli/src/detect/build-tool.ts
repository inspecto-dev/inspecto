// ============================================================
// src/detect/build-tool.ts — Build tool detection (v1)
//
// v1 supported: Vite / Webpack / Rspack / esbuild / Rollup
// Recognized but unsupported: Next.js / Nuxt / Remix / Astro / SvelteKit
// ============================================================
import path from 'node:path'
import { exists, readJSON } from '../utils/fs.js'
import type { BuildTool, BuildToolDetection } from '../types.js'

interface PackageJSON {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

/** Supported build tools in v1 */
const SUPPORTED_PATTERNS: { tool: BuildTool; files: string[]; label: string }[] = [
  {
    tool: 'vite',
    files: ['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs'],
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
    files: ['webpack.config.js', 'webpack.config.ts', 'webpack.config.mjs', 'webpack.config.cjs'],
    label: 'Webpack',
  },
  {
    tool: 'esbuild',
    files: ['esbuild.config.js', 'esbuild.config.ts', 'esbuild.config.mjs'],
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

export interface BuildToolResult {
  supported: BuildToolDetection[]
  unsupported: string[]
}

/**
 * Detect all build tools / meta-frameworks.
 * Returns supported tools and recognized-but-unsupported meta-frameworks.
 */
export async function detectBuildTools(root: string): Promise<BuildToolResult> {
  const supported: BuildToolDetection[] = []
  const unsupported: string[] = []

  // Detect supported build tools (by config file)
  const pkg = await readJSON<PackageJSON>(path.join(root, 'package.json'))
  const allDeps = { ...pkg?.dependencies, ...pkg?.devDependencies }

  for (const pattern of SUPPORTED_PATTERNS) {
    for (const file of pattern.files) {
      if (await exists(path.join(root, file))) {
        let isLegacyRspack = false
        if (pattern.tool === 'rspack') {
          const version = allDeps['@rspack/cli'] || allDeps['@rspack/core']
          if (
            version &&
            (version.includes('0.3.') || version.includes('0.2.') || version.includes('0.1.'))
          ) {
            isLegacyRspack = true
          }
        }

        supported.push({
          tool: pattern.tool,
          configPath: file,
          label: `${pattern.label} (${file})${isLegacyRspack ? ' [Legacy]' : ''}`,
          isLegacyRspack,
        })
        break // One match per tool
      }
    }
  }

  for (const meta of UNSUPPORTED_META) {
    if (!(meta.dep in allDeps)) continue
    for (const file of meta.files) {
      if (await exists(path.join(root, file))) {
        unsupported.push(meta.name)
        break
      }
    }
  }

  return { supported, unsupported }
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
