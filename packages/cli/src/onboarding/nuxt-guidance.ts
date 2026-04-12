import fs from 'node:fs'
import path from 'node:path'
import type { OnboardingPatchPlan } from '../types.js'

export interface NuxtGuidance {
  framework: 'vue'
  metaFramework: 'Nuxt'
  autoApplied: string[]
  pendingSteps: string[]
  assistantPrompt: string
  patches: OnboardingPatchPlan[]
}

const NUXT_CONFIG_CANDIDATES = ['nuxt.config.ts', 'nuxt.config.js'] as const

function findFirstExisting(root: string, candidates: readonly string[]): string | undefined {
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(root, candidate))) {
      return candidate
    }
  }

  return undefined
}

function readConfig(root: string, relativePath?: string): string {
  if (!relativePath) return ''
  const filePath = path.join(root, relativePath)
  if (!fs.existsSync(filePath)) return ''
  return fs.readFileSync(filePath, 'utf8')
}

function detectPatchShape(source: string): {
  status: OnboardingPatchPlan['status']
  reason: OnboardingPatchPlan['reason']
  confidence: OnboardingPatchPlan['confidence']
} {
  if (/with[A-Za-z0-9_$]*\s*\(\s*defineNuxtConfig/m.test(source)) {
    return {
      status: 'manual_patch_required',
      reason: 'nuxt_config_wrapped_export',
      confidence: 'medium',
    }
  }

  if (/defineNuxtConfig\s*\(\s*\{[\s\S]*\}\s*\)/m.test(source)) {
    return {
      status: 'planned',
      reason: 'nuxt_config_object_export',
      confidence: 'high',
    }
  }

  if (source.trim().length === 0) {
    return {
      status: 'manual_patch_required',
      reason: 'nuxt_config_missing',
      confidence: 'low',
    }
  }

  return {
    status: 'manual_patch_required',
    reason: 'nuxt_config_complex_shape',
    confidence: 'medium',
  }
}

function buildNuxtConfigSnippet(): string {
  return [
    "import { vitePlugin as inspecto } from '@inspecto-dev/plugin'",
    '',
    'export default defineNuxtConfig({',
    '  vite: {',
    '    plugins: [inspecto()],',
    '  },',
    '})',
  ].join('\n')
}

function buildNuxtPluginSnippet(): string {
  return [
    'export default defineNuxtPlugin(() => {',
    '  if (import.meta.dev) {',
    "    import('@inspecto-dev/core').then(({ mountInspector }) => {",
    '      mountInspector()',
    '    })',
    '  }',
    '})',
  ].join('\n')
}

export function createNuxtGuidance(root: string): NuxtGuidance {
  const configPath = findFirstExisting(root, NUXT_CONFIG_CANDIDATES) ?? 'nuxt.config.ts'
  const configSource = readConfig(root, findFirstExisting(root, NUXT_CONFIG_CANDIDATES))
  const patchShape = detectPatchShape(configSource)

  const hasSrcDir =
    fs.existsSync(path.join(root, 'src')) && fs.statSync(path.join(root, 'src')).isDirectory()
  const pluginPath = hasSrcDir ? 'src/plugins/inspecto.client.ts' : 'plugins/inspecto.client.ts'

  return {
    framework: 'vue',
    metaFramework: 'Nuxt',
    autoApplied: ['dependencies', 'inspecto_settings'],
    pendingSteps: [
      `Review the generated Nuxt patch plan for ${configPath}.`,
      `Complete the remaining Nuxt client plugin mount step in ${pluginPath}.`,
    ],
    assistantPrompt:
      'Complete the remaining Inspecto onboarding for this Nuxt project. Review the generated patch plan, keep existing app behavior unchanged, and finish the client plugin mount step safely.',
    patches: [
      {
        path: configPath,
        status: patchShape.status,
        reason: patchShape.reason,
        confidence: patchShape.confidence,
        snippet: buildNuxtConfigSnippet(),
      },
      {
        path: pluginPath,
        status: 'manual_patch_required',
        reason: 'nuxt_client_plugin_mount',
        confidence: 'medium',
        snippet: buildNuxtPluginSnippet(),
      },
    ],
  }
}
