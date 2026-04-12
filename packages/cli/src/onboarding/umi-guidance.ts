import fs from 'node:fs'
import path from 'node:path'
import type { OnboardingPatchPlan } from '../types.js'

export interface UmiGuidance {
  framework: 'react'
  metaFramework: 'Umi'
  autoApplied: string[]
  pendingSteps: string[]
  assistantPrompt: string
  patches: OnboardingPatchPlan[]
}

const UMI_CONFIG_CANDIDATES = [
  '.umirc.ts',
  '.umirc.js',
  'config/config.ts',
  'config/config.js',
] as const

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
  if (/defineConfig\s*\(\s*\{[\s\S]*\}\s*\)/m.test(source)) {
    return {
      status: 'planned',
      reason: 'umi_config_object_export',
      confidence: 'high',
    }
  }

  if (source.trim().length === 0) {
    return {
      status: 'manual_patch_required',
      reason: 'umi_config_missing',
      confidence: 'low',
    }
  }

  return {
    status: 'manual_patch_required',
    reason: 'umi_config_complex_shape',
    confidence: 'medium',
  }
}

function buildUmiConfigSnippet(): string {
  return [
    "import { defineConfig } from 'umi'",
    "import { webpack4Plugin } from '@inspecto-dev/plugin/legacy/webpack4'",
    '',
    'export default defineConfig({',
    '  chainWebpack(memo) {',
    "    if (process.env.NODE_ENV === 'development') {",
    "      memo.plugin('inspecto').use(webpack4Plugin())",
    '    }',
    '  },',
    '})',
  ].join('\n')
}

function buildUmiMountSnippet(): string {
  return [
    "import { useEffect } from 'react'",
    '',
    'export function rootContainer(container: React.ReactNode) {',
    '  return (',
    '    <InspectoWrapper>{container}</InspectoWrapper>',
    '  )',
    '}',
    '',
    'function InspectoWrapper({ children }: { children: React.ReactNode }) {',
    '  useEffect(() => {',
    "    if (process.env.NODE_ENV !== 'production') {",
    "      import('@inspecto-dev/core').then(({ mountInspector }) => {",
    '        mountInspector({',
    "          serverUrl: 'http://127.0.0.1:' + ((window as any).__AI_INSPECTOR_PORT__ || 5678),",
    '        })',
    '      })',
    '    }',
    '  }, [])',
    '',
    '  return <>{children}</>',
    '}',
  ].join('\n')
}

export function createUmiGuidance(root: string): UmiGuidance {
  const configPath = findFirstExisting(root, UMI_CONFIG_CANDIDATES) ?? '.umirc.ts'
  const configSource = readConfig(root, findFirstExisting(root, UMI_CONFIG_CANDIDATES))
  const patchShape = detectPatchShape(configSource)

  return {
    framework: 'react',
    metaFramework: 'Umi',
    autoApplied: ['dependencies', 'inspecto_settings'],
    pendingSteps: [
      `Review the generated Umi patch plan for ${configPath}.`,
      'Complete the remaining client-side mount step in src/app.tsx.',
    ],
    assistantPrompt:
      'Complete the remaining Inspecto onboarding for this Umi project. Review the generated patch plan, keep existing app behavior unchanged, and finish the client-side mount step safely.',
    patches: [
      {
        path: configPath,
        status: patchShape.status,
        reason: patchShape.reason,
        confidence: patchShape.confidence,
        snippet: buildUmiConfigSnippet(),
      },
      {
        path: 'src/app.tsx',
        status: 'manual_patch_required',
        reason: 'umi_app_mount',
        confidence: 'medium',
        snippet: buildUmiMountSnippet(),
      },
    ],
  }
}
