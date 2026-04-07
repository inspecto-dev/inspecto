import path from 'node:path'
import {
  DUAL_MODE_PROVIDER_CAPABILITIES,
  HOST_IDE_IDS,
  getHostIdeLabel,
  isSupportedHostIde,
  type DualModeProvider,
  type SupportedHostIde,
} from '@inspecto-dev/types'

type Platform = 'darwin' | 'linux' | 'win32'

interface HostIdeCapability {
  label: string
  artifactDir: string
  extensionDir: string
  binaryName?: string
  binaryPaths?: Partial<Record<Platform, string[]>>
}

export const HOST_IDE_CAPABILITIES: Record<SupportedHostIde, HostIdeCapability> = {
  vscode: {
    label: 'VS Code',
    artifactDir: '.vscode',
    extensionDir: '.vscode/extensions',
    binaryName: 'code',
    binaryPaths: {
      darwin: [
        '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
        '/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders',
        `${process.env.HOME}/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code`,
      ],
      linux: [
        '/usr/bin/code',
        '/usr/share/code/bin/code',
        '/snap/bin/code',
        '/usr/bin/code-insiders',
      ],
      win32: [
        `${process.env.LOCALAPPDATA}\\Programs\\Microsoft VS Code\\bin\\code.cmd`,
        `${process.env.LOCALAPPDATA}\\Programs\\Microsoft VS Code Insiders\\bin\\code-insiders.cmd`,
        `${process.env.PROGRAMFILES}\\Microsoft VS Code\\bin\\code.cmd`,
      ],
    },
  },
  cursor: {
    label: 'Cursor',
    artifactDir: '.cursor',
    extensionDir: '.cursor/extensions',
    binaryName: 'cursor',
    binaryPaths: {
      darwin: [
        '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
        `${process.env.HOME}/Applications/Cursor.app/Contents/Resources/app/bin/cursor`,
      ],
      linux: ['/usr/bin/cursor', '/opt/Cursor/resources/app/bin/cursor'],
      win32: [
        `${process.env.LOCALAPPDATA}\\Programs\\Cursor\\resources\\app\\bin\\cursor.cmd`,
        `${process.env.PROGRAMFILES}\\Cursor\\resources\\app\\bin\\cursor.cmd`,
      ],
    },
  },
  trae: {
    label: 'Trae',
    artifactDir: '.trae',
    extensionDir: '.trae/extensions',
    binaryName: 'trae',
    binaryPaths: {
      darwin: [
        '/Applications/Trae.app/Contents/Resources/app/bin/trae',
        `${process.env.HOME}/Applications/Trae.app/Contents/Resources/app/bin/trae`,
      ],
      linux: ['/usr/bin/trae', '/opt/Trae/resources/app/bin/trae'],
      win32: [
        `${process.env.LOCALAPPDATA}\\Programs\\Trae\\resources\\app\\bin\\trae.cmd`,
        `${process.env.PROGRAMFILES}\\Trae\\resources\\app\\bin\\trae.cmd`,
      ],
    },
  },
  'trae-cn': {
    label: 'Trae CN',
    artifactDir: '.trae-cn',
    extensionDir: '.trae-cn/extensions',
    binaryName: 'trae-cn',
    binaryPaths: {
      darwin: [
        '/Applications/Trae CN.app/Contents/Resources/app/bin/trae-cn',
        `${process.env.HOME}/Applications/Trae CN.app/Contents/Resources/app/bin/trae-cn`,
      ],
      linux: ['/usr/bin/trae-cn', '/opt/Trae CN/resources/app/bin/trae-cn'],
      win32: [
        `${process.env.LOCALAPPDATA}\\Programs\\Trae CN\\resources\\app\\bin\\trae-cn.cmd`,
        `${process.env.PROGRAMFILES}\\Trae CN\\resources\\app\\bin\\trae-cn.cmd`,
      ],
    },
  },
}

export { HOST_IDE_IDS, getHostIdeLabel, isSupportedHostIde }
export type { SupportedHostIde }

export type DualModeAssistant = DualModeProvider

export function getHostIdeResolutionSourceLabel(source: string): string {
  if (source === 'explicit') return 'from --host-ide'
  if (source === 'config') return 'from .inspecto settings'
  if (source === 'env') return 'from IDE terminal environment'
  if (source === 'artifact') return 'from project files'
  return source
}

export function getHostIdeArtifactPath(ide: SupportedHostIde, cwd: string): string {
  return path.join(cwd, HOST_IDE_CAPABILITIES[ide].artifactDir)
}

export function getHostIdeExtensionDir(ide: SupportedHostIde, homeDir: string): string {
  return path.join(homeDir, HOST_IDE_CAPABILITIES[ide].extensionDir)
}

export function getHostIdeBinaryName(ide: SupportedHostIde): string | null {
  return HOST_IDE_CAPABILITIES[ide].binaryName ?? null
}

export function getHostIdeBinaryCandidates(ide: SupportedHostIde): string[] {
  const platform = process.platform as Platform
  return HOST_IDE_CAPABILITIES[ide].binaryPaths?.[platform] ?? []
}

export function getDualModeAssistantCapability(assistant: string) {
  return DUAL_MODE_PROVIDER_CAPABILITIES[assistant as DualModeProvider]
}
