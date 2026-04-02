// ============================================================
// src/types.ts — Shared type definitions
// ============================================================

/** Package manager detection result */
export type PackageManager = 'bun' | 'pnpm' | 'yarn' | 'npm'

/** Supported build tools (v1) */
export type BuildTool = 'vite' | 'webpack' | 'rspack' | 'rsbuild' | 'esbuild' | 'rollup'

/** Machine-readable status for onboarding commands */
export type CommandStatus = 'ok' | 'warning' | 'blocked' | 'error'

/** Structured message emitted by onboarding commands */
export interface CommandMessage {
  code: string
  message: string
}

export interface OnboardingProvider {
  id: string
  label: string
  supported: boolean
  preferredMode: 'cli' | 'extension'
}

/** Detected build tool with its config path */
export interface BuildToolDetection {
  tool: BuildTool
  configPath: string
  /** Human-readable label like "Vite (vite.config.ts)" */
  label: string
  /** Whether this is a legacy rspack version (< 0.4.0) */
  isLegacyRspack?: boolean
  /** Whether this is Webpack 4.x */
  isLegacyWebpack?: boolean
  /** Relative package path when using --packages */
  packagePath?: string
}

/** Normalized onboarding context shared by detection/planning */
export interface OnboardingContext {
  root: string
  packageManager: PackageManager
  buildTools: {
    supported: BuildToolDetection[]
    unsupported: string[]
  }
  frameworks: {
    supported: string[]
    unsupported: string[]
  }
  ides: Array<{ ide: string; supported: boolean }>
  providers: OnboardingProvider[]
}

/** Machine-readable detection output for skill-first onboarding */
export interface DetectionResult {
  status: CommandStatus
  warnings: CommandMessage[]
  blockers: CommandMessage[]
  project: {
    root: string
    packageManager: PackageManager
  }
  environment: {
    frameworks: string[]
    unsupportedFrameworks: string[]
    buildTools: BuildToolDetection[]
    unsupportedBuildTools: string[]
    ides: Array<{ ide: string; supported: boolean }>
    providers: OnboardingProvider[]
  }
}

/** Machine-readable onboarding plan output */
export interface PlanResult {
  status: CommandStatus
  warnings: CommandMessage[]
  blockers: CommandMessage[]
  strategy: 'supported' | 'manual' | 'unsupported'
  actions: Array<{
    type: 'install_dependency' | 'modify_file' | 'install_extension' | 'manual_step'
    target: string
    description: string
  }>
  defaults: {
    provider?: string
    ide?: string
    shared: boolean
    extension: boolean
  }
}

/** A single doctor diagnostic check/result */
export interface DoctorDiagnostic {
  code: string
  status: 'ok' | 'warning' | 'error'
  message: string
  hints: string[]
  details?: Record<string, unknown>
}

/** Machine-readable diagnostics output for `inspecto doctor` */
export interface DoctorResult {
  status: CommandStatus
  summary: {
    errors: number
    warnings: number
  }
  project: {
    root: string
    packageManager?: PackageManager
  }
  errors: DoctorDiagnostic[]
  warnings: DoctorDiagnostic[]
  checks: DoctorDiagnostic[]
}

/** Options passed to `inspecto init` */
export interface InitOptions {
  shared: boolean
  skipInstall: boolean
  dryRun: boolean
  provider?: string
  noExtension: boolean
  packages?: string[]
  force: boolean
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
