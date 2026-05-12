import path from 'node:path'
import os from 'node:os'
import { exists, readJSON } from '../utils/fs.js'
import {
  getHostIdeArtifactPath,
  isSupportedHostIde,
  type SupportedHostIde,
} from '../integrations/capabilities.js'
import { resolveSettingsRoot } from './settings-root.js'
export type HostIdeConfidence = 'high' | 'medium' | 'low'
export type HostIdeSource = 'explicit' | 'config' | 'env' | 'artifact' | 'ambiguous' | 'none'

export interface ResolveIntegrationHostIdeOptions {
  explicitIde?: string
  cwd?: string
  ignoreProjectArtifacts?: boolean
}

export interface ResolvedIntegrationHostIde {
  ide: SupportedHostIde | null
  confidence: HostIdeConfidence
  source: HostIdeSource
  candidates: SupportedHostIde[]
}

interface InspectoSettingsShape {
  ide?: string
}

export async function resolveIntegrationHostIde(
  options: ResolveIntegrationHostIdeOptions = {},
): Promise<ResolvedIntegrationHostIde> {
  if (isSupportedHostIde(options.explicitIde)) {
    return {
      ide: options.explicitIde,
      confidence: 'high',
      source: 'explicit',
      candidates: [options.explicitIde],
    }
  }

  const cwd = options.cwd ?? process.cwd()
  const configuredIde = await resolveConfiguredIde(cwd)
  if (configuredIde) {
    return {
      ide: configuredIde,
      confidence: 'high',
      source: 'config',
      candidates: [configuredIde],
    }
  }

  const envCandidates = detectEnvHostIdes()
  if (envCandidates.length === 1) {
    return {
      ide: envCandidates[0]!,
      confidence: 'high',
      source: 'env',
      candidates: envCandidates,
    }
  }

  if (envCandidates.length > 1) {
    return {
      ide: null,
      confidence: 'low',
      source: 'ambiguous',
      candidates: envCandidates,
    }
  }

  if (!options.ignoreProjectArtifacts) {
    const artifactCandidates = await detectArtifactHostIdes(cwd)
    if (artifactCandidates.length === 1) {
      return {
        ide: artifactCandidates[0]!,
        confidence: 'medium',
        source: 'artifact',
        candidates: artifactCandidates,
      }
    }

    if (artifactCandidates.length > 1) {
      return {
        ide: null,
        confidence: 'low',
        source: 'ambiguous',
        candidates: artifactCandidates,
      }
    }
  }

  return {
    ide: null,
    confidence: 'low',
    source: 'none',
    candidates: [],
  }
}

async function resolveConfiguredIde(cwd: string): Promise<SupportedHostIde | null> {
  const settingsRoot = await resolveSettingsRoot(cwd)
  const settingsPaths = settingsRoot
    ? [
        path.join(settingsRoot, '.inspecto', 'settings.local.json'),
        path.join(settingsRoot, '.inspecto', 'settings.json'),
        path.join(os.homedir(), '.inspecto', 'settings.json'),
      ]
    : [path.join(os.homedir(), '.inspecto', 'settings.json')]

  for (const settingsPath of settingsPaths) {
    const settings = await readJSON<InspectoSettingsShape>(settingsPath)
    if (settings && isSupportedHostIde(settings.ide)) {
      return settings.ide
    }
  }

  return null
}

function detectEnvHostIdes(): SupportedHostIde[] {
  const detected = new Set<SupportedHostIde>()

  if (process.env.CURSOR_TRACE_DIR || process.env.CURSOR_CHANNEL) {
    detected.add('cursor')
  }

  if (
    process.env.__CFBundleIdentifier === 'com.byteocean.trae.cn' ||
    process.env.COCO_IDE_PLUGIN_TYPE === 'TraeCN' ||
    (process.env.npm_config_user_agent && process.env.npm_config_user_agent.includes('trae-cn'))
  ) {
    detected.add('trae-cn')
  } else if (
    process.env.TRAE_APP_DIR ||
    process.env.__CFBundleIdentifier === 'com.byteocean.trae' ||
    process.env.COCO_IDE_PLUGIN_TYPE === 'Trae' ||
    (process.env.npm_config_user_agent && process.env.npm_config_user_agent.includes('trae'))
  ) {
    detected.add('trae')
  }

  if (
    process.env.__CFBundleIdentifier === 'ai.codebuddy.mac.cn' ||
    process.env.COCO_IDE_PLUGIN_TYPE === 'CodeBuddyCN' ||
    (process.env.npm_config_user_agent &&
      process.env.npm_config_user_agent.includes('codebuddy-cn'))
  ) {
    detected.add('codebuddy-cn')
  } else if (
    process.env.__CFBundleIdentifier === 'ai.codebuddy.mac' ||
    process.env.COCO_IDE_PLUGIN_TYPE === 'CodeBuddy' ||
    (process.env.npm_config_user_agent && process.env.npm_config_user_agent.includes('codebuddy'))
  ) {
    detected.add('codebuddy')
  }

  if (detected.size === 0 && process.env.TERM_PROGRAM === 'vscode') {
    detected.add('vscode')
  }

  return Array.from(detected)
}

async function detectArtifactHostIdes(cwd: string): Promise<SupportedHostIde[]> {
  const artifactOrder: SupportedHostIde[] = [
    'cursor',
    'trae',
    'trae-cn',
    'codebuddy',
    'codebuddy-cn',
    'vscode',
  ]
  const candidates = artifactOrder.map(ide => ({
    ide,
    target: getHostIdeArtifactPath(ide, cwd),
  }))

  const resolved = await Promise.all(
    candidates.map(async candidate => ((await exists(candidate.target)) ? candidate.ide : null)),
  )

  return resolved.filter((value): value is SupportedHostIde => value !== null)
}
