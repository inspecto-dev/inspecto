import path from 'node:path'
import { readJSON, removeFile, writeJSON } from '../utils/fs.js'
import { updateGitignore } from '../inject/gitignore.js'
import { log } from '../utils/logger.js'
import { writeCommandOutput } from '../utils/output.js'

export interface InspectoDevConfig {
  cliBin?: string
  devRepo?: string
}

export interface DevConfigCommandResult {
  status: 'ok'
  configPath: string
  config: InspectoDevConfig
}

interface DevLinkOptions {
  cliBin?: string
  devRepo?: string
  json?: boolean
}

const DEV_CONFIG_PATH = path.join('.inspecto', 'dev.json')

function absoluteDevConfigPath(root: string): string {
  return path.join(root, DEV_CONFIG_PATH)
}

function printDevConfigResult(result: DevConfigCommandResult): void {
  log.header('Inspecto Dev')
  log.info(`Config: ${result.configPath}`)
  if (result.config.cliBin) {
    log.hint(`cliBin: ${result.config.cliBin}`)
  }
  if (result.config.devRepo) {
    log.hint(`devRepo: ${result.config.devRepo}`)
  }
  if (!result.config.cliBin && !result.config.devRepo) {
    log.hint('No local dev overrides are configured.')
  }
}

async function readExistingConfig(root: string): Promise<InspectoDevConfig> {
  const configPath = absoluteDevConfigPath(root)
  const config = await readJSON<InspectoDevConfig>(configPath)
  if (!config || typeof config !== 'object') {
    return {}
  }

  return config
}

export async function devLink(options: DevLinkOptions): Promise<DevConfigCommandResult> {
  const root = process.cwd()
  const configPath = absoluteDevConfigPath(root)
  const existing = await readExistingConfig(root)
  const nextConfig: InspectoDevConfig = {
    ...existing,
    ...(options.cliBin ? { cliBin: options.cliBin } : {}),
    ...(options.devRepo ? { devRepo: options.devRepo } : {}),
  }

  await writeJSON(configPath, nextConfig)
  await updateGitignore(root, false, false, true)

  return writeCommandOutput(
    {
      status: 'ok',
      configPath,
      config: nextConfig,
    },
    options.json ?? false,
    printDevConfigResult,
  )
}

export async function devStatus(json = false): Promise<DevConfigCommandResult> {
  const root = process.cwd()
  const configPath = absoluteDevConfigPath(root)
  const config = await readExistingConfig(root)

  return writeCommandOutput(
    {
      status: 'ok',
      configPath,
      config,
    },
    json,
    printDevConfigResult,
  )
}

export async function devUnlink(json = false): Promise<DevConfigCommandResult> {
  const root = process.cwd()
  const configPath = absoluteDevConfigPath(root)

  await removeFile(configPath)

  return writeCommandOutput(
    {
      status: 'ok',
      configPath,
      config: {},
    },
    json,
    printDevConfigResult,
  )
}
