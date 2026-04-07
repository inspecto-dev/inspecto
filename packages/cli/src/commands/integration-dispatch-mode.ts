import { homedir } from 'node:os'
import path from 'node:path'
import type { ProviderMode, SupportedHostIde } from '@inspecto-dev/types'
import { exists, readJSON } from '../utils/fs.js'
import { which } from '../utils/exec.js'
import {
  getDualModeAssistantCapability,
  getHostIdeExtensionDir,
} from '../integrations/capabilities.js'

interface ResolveIntegrationDispatchModeOptions {
  assistant: string
  hostIde: SupportedHostIde
  homeDir?: string
}

interface ResolveIntegrationDispatchModeResult {
  mode: ProviderMode | null
  ready: boolean
  reason: string
}

export async function resolveIntegrationDispatchMode(
  options: ResolveIntegrationDispatchModeOptions,
): Promise<ResolveIntegrationDispatchModeResult> {
  const assistantRule = getDualModeAssistantCapability(options.assistant)
  const home = options.homeDir ?? homedir()
  const extensionDir = getHostIdeExtensionDir(options.hostIde, home)

  if (assistantRule && extensionDir) {
    if (await isIdeExtensionInstalled(assistantRule.extensionId, extensionDir)) {
      return {
        mode: 'extension',
        ready: true,
        reason: `${options.hostIde}_${options.assistant}_extension`,
      }
    }

    if (await which(assistantRule.cliBin)) {
      return {
        mode: 'cli',
        ready: true,
        reason: `${options.assistant}_cli`,
      }
    }

    return {
      mode: null,
      ready: false,
      reason: `missing_${options.assistant}_runtime`,
    }
  }

  return {
    mode: null,
    ready: true,
    reason: 'default',
  }
}

async function isIdeExtensionInstalled(
  extensionId: string,
  extensionsDir: string,
): Promise<boolean> {
  if (!(await exists(extensionsDir))) {
    return false
  }

  let extensionFolders: string[]
  try {
    const { readdir } = await import('node:fs/promises')
    extensionFolders = await readdir(extensionsDir)
  } catch {
    return false
  }

  const obsoletePath = path.join(extensionsDir, '.obsolete')
  let obsoleteFolders = new Set<string>()
  if (await exists(obsoletePath)) {
    const obsolete = await readJSON<Record<string, boolean>>(obsoletePath)
    if (obsolete) {
      obsoleteFolders = new Set(Object.keys(obsolete))
    }
  }

  return extensionFolders.some(folder => {
    if (obsoleteFolders.has(folder)) return false
    const lower = folder.toLowerCase()
    const normalized = extensionId.toLowerCase()
    return lower === normalized || lower.startsWith(`${normalized}-`)
  })
}
