import path from 'node:path'
import { exists, readJSON } from '../utils/fs.js'
import {
  HOST_IDE_IDS,
  getHostIdeArtifactPath,
  isSupportedHostIde,
  type SupportedHostIde,
} from '../integrations/capabilities.js'
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
  const settingsPaths = [
    path.join(cwd, '.inspecto', 'settings.local.json'),
    path.join(cwd, '.inspecto', 'settings.json'),
  ]

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
    process.env.TRAE_APP_DIR ||
    process.env.__CFBundleIdentifier === 'com.byteocean.trae' ||
    process.env.COCO_IDE_PLUGIN_TYPE === 'Trae' ||
    (process.env.npm_config_user_agent && process.env.npm_config_user_agent.includes('trae'))
  ) {
    detected.add('trae')
  }

  if (
    process.env.__CFBundleIdentifier === 'com.byteocean.trae.cn' ||
    process.env.COCO_IDE_PLUGIN_TYPE === 'TraeCN' ||
    (process.env.npm_config_user_agent && process.env.npm_config_user_agent.includes('trae-cn'))
  ) {
    detected.add('trae-cn')
  }

  if (detected.size === 0 && process.env.TERM_PROGRAM === 'vscode') {
    detected.add('vscode')
  }

  return Array.from(detected)
}

async function detectArtifactHostIdes(cwd: string): Promise<SupportedHostIde[]> {
  const artifactOrder: SupportedHostIde[] = ['cursor', 'trae', 'trae-cn', 'vscode']
  const candidates = artifactOrder.map(ide => ({
    ide,
    target: getHostIdeArtifactPath(ide, cwd),
  }))

  const resolved = await Promise.all(
    candidates.map(async candidate => ((await exists(candidate.target)) ? candidate.ide : null)),
  )

  return resolved.filter((value): value is SupportedHostIde => value !== null)
}
