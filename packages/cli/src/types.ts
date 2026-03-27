// ============================================================
// src/types.ts — Shared type definitions
// ============================================================

/** Package manager detection result */
export type PackageManager = 'bun' | 'pnpm' | 'yarn' | 'npm'

/** Supported build tools (v1) */
export type BuildTool = 'vite' | 'webpack' | 'rspack' | 'rsbuild' | 'esbuild' | 'rollup'

/** Detected build tool with its config path */
export interface BuildToolDetection {
  tool: BuildTool
  configPath: string
  /** Human-readable label like "Vite (vite.config.ts)" */
  label: string
  /** Whether this is a legacy rspack version (< 0.4.0) */
  isLegacyRspack?: boolean
}

/** Options passed to `inspecto init` */
export interface InitOptions {
  shared: boolean
  skipInstall: boolean
  dryRun: boolean
  prefer?: string
  noExtension: boolean
  packages?: string[]
}

/** A single mutation recorded in install.lock */
export interface Mutation {
  type: 'file_modified' | 'file_created' | 'dependency_added' | 'extension_installed'
  path?: string
  backup?: string
  name?: string
  id?: string
  dev?: boolean
  description?: string
  manual_action_required?: boolean
}

/** Structure of .inspecto/install.lock */
export interface InstallLock {
  version: string
  created_at: string
  mutations: Mutation[]
}
