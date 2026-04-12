import fs from 'node:fs'
import path from 'node:path'
import type { OnboardingPatchPlan } from '../types.js'

type RouterMode = 'app' | 'pages' | 'mixed' | 'unknown'

export interface NextJsGuidance {
  framework: 'react'
  metaFramework: 'Next.js'
  routerMode: RouterMode
  autoApplied: string[]
  pendingSteps: string[]
  assistantPrompt: string
  patches: OnboardingPatchPlan[]
}

const NEXT_CONFIG_CANDIDATES = ['next.config.ts', 'next.config.mjs', 'next.config.js'] as const
const APP_ROUTER_LAYOUTS = [
  'app/layout.tsx',
  'app/layout.jsx',
  'src/app/layout.tsx',
  'src/app/layout.jsx',
] as const
const PAGES_ROUTER_APPS = [
  'pages/_app.tsx',
  'pages/_app.jsx',
  'src/pages/_app.tsx',
  'src/pages/_app.jsx',
] as const
const PACKAGE_JSON_PATH = 'package.json'

function findFirstExisting(root: string, candidates: readonly string[]): string | undefined {
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(root, candidate))) {
      return candidate
    }
  }

  return undefined
}

function detectRouterMode(root: string): RouterMode {
  const hasAppRouter = Boolean(findFirstExisting(root, APP_ROUTER_LAYOUTS))
  const hasPagesRouter = Boolean(findFirstExisting(root, PAGES_ROUTER_APPS))

  if (hasAppRouter && hasPagesRouter) return 'mixed'
  if (hasAppRouter) return 'app'
  if (hasPagesRouter) return 'pages'
  return 'unknown'
}

function detectNextConfigPath(root: string): string | undefined {
  return findFirstExisting(root, NEXT_CONFIG_CANDIDATES)
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
  if (
    /export\s+default\s*\{[\s\S]*\}/m.test(source) ||
    /module\.exports\s*=\s*\{[\s\S]*\}/m.test(source) ||
    /const\s+[A-Za-z0-9_$]+\s*(?::[^=]+)?=\s*\{[\s\S]*\}\s*;?\s*export\s+default\s+[A-Za-z0-9_$]+\s*;?/m.test(
      source,
    ) ||
    /\/\*\*[\s\S]*?@type\s*\{import\('next'\)\.NextConfig\}[\s\S]*?\*\/[\s\S]*?(export\s+default|module\.exports)\s*=?\s*\{[\s\S]*\}/m.test(
      source,
    )
  ) {
    return {
      status: 'planned',
      reason: 'next_config_object_export',
      confidence: 'high',
    }
  }

  if (
    /module\.exports\s*=\s*[A-Za-z0-9_$]+\s*\(/m.test(source) ||
    /export\s+default\s+[A-Za-z0-9_$]+\s*\(/m.test(source)
  ) {
    return {
      status: 'manual_patch_required',
      reason: 'next_config_wrapped_export',
      confidence: 'medium',
    }
  }

  if (source.trim().length === 0) {
    return {
      status: 'manual_patch_required',
      reason: 'next_config_missing',
      confidence: 'low',
    }
  }

  return {
    status: 'manual_patch_required',
    reason: 'next_config_complex_shape',
    confidence: 'medium',
  }
}

function buildPatchSnippet(): string {
  return [
    "import { webpackPlugin as inspecto } from '@inspecto-dev/plugin'",
    '',
    'webpack(config, { dev, isServer }) {',
    '  if (dev) {',
    '    config.plugins.push(inspecto())',
    '  }',
    '  return config',
    '}',
  ].join('\n')
}

function buildAppRouterMountSnippet(): string {
  return [
    "import { useEffect } from 'react'",
    '',
    'function InspectoProvider() {',
    '  useEffect(() => {',
    "    if (process.env.NODE_ENV !== 'production') {",
    "      import('@inspecto-dev/core').then(({ mountInspector }) => {",
    '        mountInspector()',
    '      })',
    '    }',
    '  }, [])',
    '',
    '  return null',
    '}',
    '',
    'Render <InspectoProvider /> from app/layout.tsx inside the <body> tree.',
  ].join('\n')
}

function buildPagesRouterMountSnippet(): string {
  return [
    "import { useEffect } from 'react'",
    '',
    'useEffect(() => {',
    "  if (process.env.NODE_ENV !== 'production') {",
    "    import('@inspecto-dev/core').then(({ mountInspector }) => {",
    '      mountInspector()',
    '    })',
    '  }',
    '}, [])',
    '',
    'Add this effect to pages/_app.tsx without changing the existing app wrapper behavior.',
  ].join('\n')
}

function detectWebpackDevScriptPatch(root: string): OnboardingPatchPlan | undefined {
  const packageJsonSource = readConfig(root, PACKAGE_JSON_PATH)
  if (!packageJsonSource) {
    return undefined
  }

  try {
    const packageJson = JSON.parse(packageJsonSource) as { scripts?: Record<string, string> }
    const devScript = packageJson.scripts?.dev
    if (!devScript || !/\bnext\s+dev\b/.test(devScript) || /--webpack\b/.test(devScript)) {
      return undefined
    }

    return {
      path: PACKAGE_JSON_PATH,
      status: 'manual_patch_required',
      reason: 'next_dev_script_requires_webpack',
      confidence: 'medium',
      snippet: '"dev": "next dev --webpack"',
    }
  } catch {
    return undefined
  }
}

function buildPendingSteps(
  routerMode: RouterMode,
  configPath: string,
  needsWebpackDevScript: boolean,
): string[] {
  const routerHint =
    routerMode === 'app'
      ? 'Complete the remaining client-side mount step for your App Router entry.'
      : routerMode === 'pages'
        ? 'Complete the remaining client-side mount step for your Pages Router entry.'
        : routerMode === 'mixed'
          ? 'Complete the remaining client-side mount step for the router entry your team actually uses in development.'
          : 'Complete the remaining client-side mount step in the appropriate Next.js entry file.'

  return [
    `Review the generated Next.js patch plan for ${configPath}.`,
    ...(needsWebpackDevScript
      ? ['Update the Next.js dev script to use webpack mode for Inspecto validation.']
      : []),
    'Keep the Inspecto webpack plugin enabled for both server and client development compilers in App Router projects.',
    routerHint,
  ]
}

export function createNextJsGuidance(root: string): NextJsGuidance {
  const configPath = detectNextConfigPath(root) ?? 'next.config.js'
  const configSource = readConfig(root, detectNextConfigPath(root))
  const patchShape = detectPatchShape(configSource)
  const routerMode = detectRouterMode(root)
  const webpackDevScriptPatch = detectWebpackDevScriptPatch(root)

  return {
    framework: 'react',
    metaFramework: 'Next.js',
    routerMode,
    autoApplied: ['dependencies', 'inspecto_settings'],
    pendingSteps: buildPendingSteps(routerMode, configPath, Boolean(webpackDevScriptPatch)),
    assistantPrompt:
      'Complete the remaining Inspecto onboarding for this Next.js project. Use the generated patches directly, keep existing app behavior unchanged, avoid unrelated documentation searches unless a patch is insufficient, and finish the client-side mount step safely.',
    patches: [
      {
        path: configPath,
        status: patchShape.status,
        reason: patchShape.reason,
        confidence: patchShape.confidence,
        snippet: buildPatchSnippet(),
      },
      ...(routerMode === 'app' || routerMode === 'mixed'
        ? [
            {
              path: findFirstExisting(root, APP_ROUTER_LAYOUTS) ?? 'app/layout.tsx',
              status: 'manual_patch_required' as const,
              reason: 'next_app_router_mount',
              confidence: 'medium' as const,
              snippet: buildAppRouterMountSnippet(),
            },
          ]
        : []),
      ...(routerMode === 'pages' || routerMode === 'mixed'
        ? [
            {
              path: findFirstExisting(root, PAGES_ROUTER_APPS) ?? 'pages/_app.tsx',
              status: 'manual_patch_required' as const,
              reason: 'next_pages_router_mount',
              confidence: 'medium' as const,
              snippet: buildPagesRouterMountSnippet(),
            },
          ]
        : []),
      ...(webpackDevScriptPatch ? [webpackDevScriptPatch] : []),
    ],
  }
}
