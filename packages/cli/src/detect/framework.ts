// ============================================================
// src/detect/framework.ts — Frontend framework detection
//
// v1 supported: React / Vue
// Recognized but unsupported: Solid, Svelte, Angular, Preact, Lit
// ============================================================
import path from 'node:path'
import { readJSON } from '../utils/fs.js'

export type Framework = 'react' | 'vue'

export interface FrameworkDetection {
  supported: Framework[]
  unsupported: { name: string; dep: string }[]
}

interface PackageJSON {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

/** Supported frameworks in v1 */
const SUPPORTED_FRAMEWORKS: { framework: Framework; deps: string[] }[] = [
  { framework: 'react', deps: ['react', 'react-dom'] },
  { framework: 'vue', deps: ['vue'] },
]

/** Recognized but not supported in v1 — detect and warn */
const UNSUPPORTED_FRAMEWORKS: { name: string; dep: string }[] = [
  { name: 'Solid', dep: 'solid-js' },
  { name: 'Svelte', dep: 'svelte' },
  { name: 'Angular', dep: '@angular/core' },
  { name: 'Preact', dep: 'preact' },
  { name: 'Lit', dep: 'lit' },
]

/**
 * Detect frontend frameworks.
 * Returns both supported and recognized-but-unsupported frameworks.
 */
export async function detectFrameworks(root: string): Promise<FrameworkDetection> {
  const pkg = await readJSON<PackageJSON>(path.join(root, 'package.json'))
  if (!pkg) return { supported: [], unsupported: [] }

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  }

  const supported: Framework[] = []
  for (const { framework, deps } of SUPPORTED_FRAMEWORKS) {
    if (deps.some(dep => dep in allDeps)) {
      supported.push(framework)
    }
  }

  const unsupported: { name: string; dep: string }[] = []
  for (const fw of UNSUPPORTED_FRAMEWORKS) {
    if (fw.dep in allDeps) {
      unsupported.push(fw)
    }
  }

  return { supported, unsupported }
}
