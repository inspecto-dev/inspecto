import fs from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { exists, readJSON, writeFile, writeJSON } from '../utils/fs.js'
import { log } from '../utils/logger.js'
import { writeCommandOutput } from '../utils/output.js'
import { runIntegrationAutomation } from './integration-automation.js'
import { isSupportedHostIde, type SupportedHostIde } from '../integrations/capabilities.js'

const REPO_RAW_BASE = 'https://raw.githubusercontent.com/inspecto-dev/inspecto/main'
const TOTAL_STEPS = 6

type AssistantId = 'codex' | 'claude-code' | 'copilot' | 'cursor' | 'gemini' | 'trae' | 'coco'
type ClaudeScope = 'project' | 'user'
type CopilotMode = 'skills' | 'instructions' | 'agents'
type CursorMode = 'skills' | 'rules' | 'agents'

interface DownloadAsset {
  source: string
  target: string
  executable?: boolean
  localSource?: string
}

export interface IntegrationManifest {
  assistant: string
  type: 'native-skill' | 'context-template'
  installTarget: string
  preferredInstall: string
  cliSupported: boolean
}

export interface IntegrationDescription {
  assistant: string
  type: IntegrationManifest['type']
  targets: string[]
  preferredInstall: string
  cliSupported: boolean
}

export interface InstallIntegrationOptions {
  scope?: ClaudeScope
  mode?: CopilotMode | CursorMode
  force?: boolean
  ide?: string
  inspectoVsix?: string
  compact?: boolean
  preview?: boolean
  json?: boolean
}

interface InstallPlan {
  assets: DownloadAsset[]
  successMessage: string
  nextStep: string
}

interface InspectoSettingsShape {
  ide?: string
  [key: string]: unknown
}

export interface IntegrationInstallResult {
  status: 'launched' | 'partial' | 'blocked' | 'preview' | 'preview_blocked'
  assistant: string
  preview: boolean
  assets: string[]
  message: string
  nextStep?: string
  automation: Awaited<ReturnType<typeof runIntegrationAutomation>>
}

const INTEGRATION_MANIFESTS: IntegrationManifest[] = [
  {
    assistant: 'codex',
    type: 'native-skill',
    installTarget: '.agents/skills/',
    preferredInstall:
      'npx @inspecto-dev/cli integrations install codex --host-ide <vscode|cursor|trae|trae-cn>',
    cliSupported: true,
  },
  {
    assistant: 'claude-code',
    type: 'native-skill',
    installTarget: '.claude/skills/ or ~/.claude/skills/',
    preferredInstall:
      'npx @inspecto-dev/cli integrations install claude-code --scope project --host-ide <vscode|cursor|trae|trae-cn>',
    cliSupported: true,
  },
  {
    assistant: 'copilot',
    type: 'native-skill',
    installTarget: '.github/skills/inspecto-onboarding/',
    preferredInstall:
      'npx @inspecto-dev/cli integrations install copilot --host-ide <vscode|cursor|trae|trae-cn>',
    cliSupported: true,
  },
  {
    assistant: 'cursor',
    type: 'native-skill',
    installTarget: '.cursor/skills/inspecto-onboarding/',
    preferredInstall:
      'npx @inspecto-dev/cli integrations install cursor --host-ide <vscode|cursor|trae|trae-cn>',
    cliSupported: true,
  },
  {
    assistant: 'gemini',
    type: 'native-skill',
    installTarget: '.gemini/skills/inspecto-onboarding/',
    preferredInstall:
      'npx @inspecto-dev/cli integrations install gemini --host-ide <vscode|cursor|trae|trae-cn>',
    cliSupported: true,
  },
  {
    assistant: 'trae',
    type: 'native-skill',
    installTarget: '.trae/skills/inspecto-onboarding/',
    preferredInstall:
      'npx @inspecto-dev/cli integrations install trae --host-ide <vscode|cursor|trae|trae-cn>',
    cliSupported: true,
  },
  {
    assistant: 'coco',
    type: 'native-skill',
    installTarget: '.trae/skills/inspecto-onboarding/',
    preferredInstall:
      'npx @inspecto-dev/cli integrations install coco --host-ide <vscode|cursor|trae|trae-cn>',
    cliSupported: true,
  },
]

export async function installIntegration(
  assistant: string,
  options: InstallIntegrationOptions = {},
): Promise<IntegrationInstallResult> {
  const plan = resolveInstallPlan(assistant, options)
  const manifest = getIntegrationManifest(assistant)
  const silent = options.json ?? false

  if (!silent) {
    log.header('Inspecto Integration Install')
  }

  if (!options.preview) {
    // Check for existing files
    const existingFiles = new Map<string, string>()
    for (const asset of plan.assets) {
      if (await exists(asset.target)) {
        if (options.force) {
          // Will overwrite later
        } else if (manifest.type === 'context-template') {
          // Safe to append for templates and markdown files
          const originalContent = await fs.readFile(asset.target, 'utf-8')
          existingFiles.set(asset.target, originalContent)
          if (!silent) {
            log.info(`File ${asset.target} already exists. Content will be appended safely.`)
          }
        } else {
          // Native skills (like codex, claude-code) shouldn't be blindly appended to
          throw new Error(
            `Refusing to overwrite existing file: ${asset.target}. Re-run with --force if you want to replace it.`,
          )
        }
      }
    }

    const downloadedAssets = [] as Array<{ asset: DownloadAsset; content: string }>

    for (const asset of plan.assets) {
      let content = await loadAsset(asset)

      // Handle appending if needed
      if (existingFiles.has(asset.target)) {
        const existingContent = existingFiles.get(asset.target)!
        if (
          !existingContent.includes('Inspecto Onboarding') &&
          !existingContent.includes('inspecto-onboarding')
        ) {
          content = `${existingContent}\n\n---\n\n${content}`
        } else {
          if (!silent) {
            log.info(
              `Skipping ${asset.target} as it seems to already contain Inspecto rules. Use --force to overwrite.`,
            )
          }
          continue // Skip this asset
        }
      }

      downloadedAssets.push({ asset, content })
    }

    for (const { asset, content } of downloadedAssets) {
      await writeFile(asset.target, content)

      if (asset.executable) {
        await fs.chmod(asset.target, 0o755)
      }
    }
  }

  if (shouldPersistHostIdeSetting(options)) {
    await persistHostIdeSetting(options.ide!)
  }

  const stepOneMessage = options.preview
    ? formatIntegrationStep(1, `Previewing ${getAssistantLabel(assistant)} integration assets`)
    : formatIntegrationStep(1, `Installed ${getAssistantLabel(assistant)} integration assets`)

  if (!silent) {
    if (options.preview) {
      log.info(stepOneMessage)
    } else {
      log.success(stepOneMessage)
    }
    for (const asset of plan.assets) {
      log.hint(asset.target)
    }
    if (!options.preview) {
      log.hint(plan.nextStep)
    }
  }

  if (shouldSkipAutomationForInstall(options)) {
    const message = `Installed ${getAssistantLabel(assistant)} integration assets. User-level installs only write integration assets and do not launch onboarding automatically.`
    const nextStep = options.ide
      ? `Run the install command again from your target project root with --host-ide ${options.ide} when you want to launch onboarding automatically.`
      : 'Run the install command again from your target project root with --host-ide <vscode|cursor|trae|trae-cn> when you want to launch onboarding automatically.'
    const result: IntegrationInstallResult = {
      status: 'partial',
      assistant,
      preview: options.preview ?? false,
      assets: plan.assets.map(asset => asset.target),
      message,
      nextStep,
      automation: {
        status: 'blocked',
        message,
        nextStep,
      },
    }

    if (options.json) {
      return writeCommandOutput(result, true, () => {})
    }

    log.ready(message)
    if (options.ide) {
      log.hint(
        `The provided --host-ide value is saved only as a rerun hint for later; this command does not open ${formatHostIdeLabel(options.ide)} for user-level installs.`,
      )
    }
    log.hint(nextStep)
    return result
  }

  const automationResult = await runIntegrationAutomation(
    assistant,
    { ...options, silent },
    process.cwd(),
  )
  const result: IntegrationInstallResult = {
    status: automationResult.status,
    assistant,
    preview: options.preview ?? false,
    assets: plan.assets.map(asset => asset.target),
    message: automationResult.message,
    ...(automationResult.nextStep ? { nextStep: automationResult.nextStep } : {}),
    automation: automationResult,
  }

  if (options.json) {
    return writeCommandOutput(result, true, () => {})
  }

  if (automationResult.status === 'launched') {
    log.ready(automationResult.message)
    return result
  }

  if (automationResult.status === 'preview') {
    log.ready(automationResult.message)
    if (automationResult.nextStep) {
      log.hint(automationResult.nextStep)
    }
    return result
  }

  if (automationResult.status === 'partial' || automationResult.status === 'preview_blocked') {
    log.warn(automationResult.message)
    if (automationResult.nextStep) {
      log.hint(automationResult.nextStep)
    }
    return result
  }

  log.warn(automationResult.message)
  if (automationResult.nextStep) {
    log.hint(automationResult.nextStep)
  }
  return result
}

function shouldPersistHostIdeSetting(
  options: InstallIntegrationOptions,
): options is InstallIntegrationOptions & { ide: SupportedHostIde } {
  return (
    !options.preview && !shouldSkipAutomationForInstall(options) && isSupportedHostIde(options.ide)
  )
}

async function persistHostIdeSetting(ide: SupportedHostIde): Promise<void> {
  const settingsPath = path.join(process.cwd(), '.inspecto', 'settings.local.json')
  const existingSettings = await readJSON<InspectoSettingsShape>(settingsPath)
  const mergedSettings =
    existingSettings && typeof existingSettings === 'object'
      ? { ...existingSettings, ide }
      : { ide }

  await writeJSON(settingsPath, mergedSettings)
}

function shouldSkipAutomationForInstall(options: InstallIntegrationOptions): boolean {
  return options.scope === 'user' && !options.preview
}

export function listIntegrationManifests(): IntegrationManifest[] {
  return INTEGRATION_MANIFESTS.map(manifest => ({ ...manifest }))
}

export function describeIntegration(
  assistant: string,
  options: InstallIntegrationOptions = {},
): IntegrationDescription {
  const manifest = getIntegrationManifest(assistant)

  const targets = manifest.cliSupported
    ? resolveInstallPlan(assistant, options).assets.map(asset => asset.target)
    : [manifest.installTarget]

  return {
    assistant: manifest.assistant,
    type: manifest.type,
    targets,
    preferredInstall: manifest.preferredInstall,
    cliSupported: manifest.cliSupported,
  }
}

export function printIntegrationList(): void {
  log.header('Inspecto Integrations')
  for (const manifest of INTEGRATION_MANIFESTS) {
    const support = manifest.cliSupported ? 'CLI' : 'native installer'
    log.info(`${manifest.assistant} — ${manifest.type} — ${manifest.installTarget} — ${support}`)
  }
}

export function printIntegrationPath(
  assistant: string,
  options: InstallIntegrationOptions = {},
): void {
  const description = describeIntegration(assistant, options)

  log.header(`Inspecto Integration Paths: ${description.assistant}`)
  for (const target of description.targets) {
    log.info(target)
  }

  if (description.cliSupported) {
    log.hint(`Preferred install: ${description.preferredInstall}`)
  } else {
    log.hint(`Native install required: ${description.preferredInstall}`)
  }
}

function resolveInstallPlan(assistant: string, options: InstallIntegrationOptions): InstallPlan {
  switch (assistant as AssistantId) {
    case 'codex':
      return resolveCodexPlan(options)
    case 'claude-code':
      return resolveClaudeCodePlan(options)
    case 'copilot':
      return resolveCopilotPlan(options)
    case 'cursor':
      return resolveCursorPlan(options)
    case 'gemini':
      return {
        assets: [
          {
            source: `${REPO_RAW_BASE}/skills/inspecto-onboarding-gemini/SKILL.md`,
            target: '.gemini/skills/inspecto-onboarding/SKILL.md',
            localSource: 'skills/inspecto-onboarding-gemini/SKILL.md',
          },
        ],
        successMessage: 'Installed Gemini skill to .gemini/skills/inspecto-onboarding/SKILL.md',
        nextStep: 'Start a new Gemini CLI session and use /skills list to verify.',
      }
    case 'trae':
      return {
        assets: [
          {
            source: `${REPO_RAW_BASE}/skills/inspecto-onboarding-trae/SKILL.md`,
            target: '.trae/skills/inspecto-onboarding/SKILL.md',
            localSource: 'skills/inspecto-onboarding-trae/SKILL.md',
          },
          {
            source: `${REPO_RAW_BASE}/skills/inspecto-onboarding-trae/scripts/run-inspecto.sh`,
            target: '.trae/skills/inspecto-onboarding/scripts/run-inspecto.sh',
            localSource: 'skills/inspecto-onboarding-trae/scripts/run-inspecto.sh',
            executable: true,
          },
        ],
        successMessage: 'Installed Trae skill to .trae/skills/inspecto-onboarding/SKILL.md',
        nextStep: 'Open a new Trae chat and verify the inspecto-onboarding skill is available.',
      }
    case 'coco':
      return {
        assets: [
          {
            source: `${REPO_RAW_BASE}/skills/inspecto-onboarding-trae/SKILL.md`,
            target: '.trae/skills/inspecto-onboarding/SKILL.md',
            localSource: 'skills/inspecto-onboarding-trae/SKILL.md',
          },
          {
            source: `${REPO_RAW_BASE}/skills/inspecto-onboarding-trae/scripts/run-inspecto.sh`,
            target: '.trae/skills/inspecto-onboarding/scripts/run-inspecto.sh',
            localSource: 'skills/inspecto-onboarding-trae/scripts/run-inspecto.sh',
            executable: true,
          },
        ],
        successMessage: 'Installed Coco skill to .trae/skills/inspecto-onboarding/SKILL.md',
        nextStep: 'Start a new Coco session.',
      }
    default:
      throw new Error(`Unknown assistant: ${assistant}`)
  }
}

function getIntegrationManifest(assistant: string): IntegrationManifest {
  const manifest = INTEGRATION_MANIFESTS.find(item => item.assistant === assistant)

  if (!manifest) {
    throw new Error(
      `Unknown assistant: ${assistant}. Run 'inspecto integrations list' to see available targets.`,
    )
  }

  return manifest
}

function formatIntegrationStep(step: number, text: string): string {
  return `Step ${step}/${TOTAL_STEPS}: ${text}`
}

function getAssistantLabel(assistant: string): string {
  if (assistant === 'claude-code') return 'Claude Code'
  if (assistant === 'codex') return 'Codex'
  if (assistant === 'copilot') return 'GitHub Copilot'
  if (assistant === 'cursor') return 'Cursor'
  if (assistant === 'gemini') return 'Gemini'
  if (assistant === 'trae') return 'Trae'
  if (assistant === 'coco') return 'Coco'
  return assistant
}

function formatHostIdeLabel(ide: string): string {
  if (ide === 'vscode') return 'VS Code'
  if (ide === 'cursor') return 'Cursor'
  if (ide === 'trae') return 'Trae'
  if (ide === 'trae-cn') return 'Trae CN'
  return ide
}

function resolveCodexPlan(options: InstallIntegrationOptions): InstallPlan {
  const scope = options.scope ?? 'project'

  if (options.mode !== undefined) {
    throw new Error('`--mode` is not supported for codex.')
  }

  const baseDir =
    scope === 'user'
      ? path.join(homedir(), '.agents/skills/inspecto-onboarding-codex')
      : '.agents/skills/inspecto-onboarding-codex'

  return {
    assets: [
      {
        source: `${REPO_RAW_BASE}/skills/inspecto-onboarding-codex/SKILL.md`,
        target: path.join(baseDir, 'SKILL.md'),
        localSource: 'skills/inspecto-onboarding-codex/SKILL.md',
      },
      {
        source: `${REPO_RAW_BASE}/skills/inspecto-onboarding-codex/agents/openai.yaml`,
        target: path.join(baseDir, 'agents/openai.yaml'),
        localSource: 'skills/inspecto-onboarding-codex/agents/openai.yaml',
      },
      {
        source: `${REPO_RAW_BASE}/skills/inspecto-onboarding-codex/scripts/run-inspecto.sh`,
        target: path.join(baseDir, 'scripts/run-inspecto.sh'),
        executable: true,
        localSource: 'skills/inspecto-onboarding-codex/scripts/run-inspecto.sh',
      },
    ],
    successMessage: `Installed Codex skill to ${baseDir}`,
    nextStep: 'Restart Codex or start a new Codex session to load the skill.',
  }
}

function resolveClaudeCodePlan(options: InstallIntegrationOptions): InstallPlan {
  const scope = options.scope ?? 'project'
  const unsupportedMode = options.mode !== undefined

  if (unsupportedMode) {
    throw new Error(
      '`--mode` is not supported for claude-code. Use `--scope project|user` instead.',
    )
  }

  if (scope !== 'project' && scope !== 'user') {
    throw new Error(`Unknown Claude Code scope: ${scope}`)
  }

  const baseDir =
    scope === 'user'
      ? path.join(homedir(), '.claude/skills/inspecto-onboarding-claude-code')
      : '.claude/skills/inspecto-onboarding-claude-code'

  return {
    assets: [
      {
        source: `${REPO_RAW_BASE}/skills/inspecto-onboarding-claude-code/SKILL.md`,
        target: path.join(baseDir, 'SKILL.md'),
        localSource: 'skills/inspecto-onboarding-claude-code/SKILL.md',
      },
      {
        source: `${REPO_RAW_BASE}/skills/inspecto-onboarding-claude-code/agents/openai.yaml`,
        target: path.join(baseDir, 'agents/openai.yaml'),
        localSource: 'skills/inspecto-onboarding-claude-code/agents/openai.yaml',
      },
      {
        source: `${REPO_RAW_BASE}/skills/inspecto-onboarding-claude-code/scripts/run-inspecto.sh`,
        target: path.join(baseDir, 'scripts/run-inspecto.sh'),
        executable: true,
        localSource: 'skills/inspecto-onboarding-claude-code/scripts/run-inspecto.sh',
      },
    ],
    successMessage: `Installed Claude Code skill to ${baseDir}`,
    nextStep: 'Restart Claude Code to load the new skill.',
  }
}

function resolveCopilotPlan(options: InstallIntegrationOptions): InstallPlan {
  const mode = options.mode ?? 'skills'

  if (options.scope !== undefined) {
    throw new Error(
      '`--scope` is not supported for copilot. Use `--mode skills|instructions|agents` instead.',
    )
  }

  switch (mode) {
    case 'skills':
    case 'instructions': // Legacy fallback gracefully acts as skills mode now
    case 'agents': // Legacy fallback gracefully acts as skills mode now
      return {
        assets: [
          {
            source: `${REPO_RAW_BASE}/skills/inspecto-onboarding-copilot/SKILL.md`,
            target: '.github/skills/inspecto-onboarding/SKILL.md',
            localSource: 'skills/inspecto-onboarding-copilot/SKILL.md',
          },
        ],
        successMessage: 'Installed Copilot skill to .github/skills/inspecto-onboarding/SKILL.md',
        nextStep: 'Open a new Copilot chat or agent session.',
      }
    default:
      throw new Error(`Unknown Copilot mode: ${mode}`)
  }
}

function resolveCursorPlan(options: InstallIntegrationOptions): InstallPlan {
  const mode = options.mode ?? 'skills'

  if (options.scope !== undefined) {
    throw new Error('`--scope` is not supported for cursor. Use `--mode skills|agents` instead.')
  }

  switch (mode) {
    case 'skills':
    case 'rules': // Legacy fallback gracefully acts as skills mode now
    case 'agents': // Legacy fallback gracefully acts as skills mode now
      return {
        assets: [
          {
            source: `${REPO_RAW_BASE}/skills/inspecto-onboarding-cursor/SKILL.md`,
            target: '.cursor/skills/inspecto-onboarding/SKILL.md',
            localSource: 'skills/inspecto-onboarding-cursor/SKILL.md',
          },
        ],
        successMessage: 'Installed Cursor skill to .cursor/skills/inspecto-onboarding/SKILL.md',
        nextStep: 'Open a new Cursor chat.',
      }
    default:
      throw new Error(`Unknown Cursor mode: ${mode}`)
  }
}

async function loadAsset(asset: DownloadAsset): Promise<string> {
  if (asset.localSource) {
    const localPath = await resolveBundledAssetPath(asset.localSource)
    if (localPath) {
      return await fs.readFile(localPath, 'utf-8')
    }
  }

  return await downloadAsset(asset.source)
}

async function resolveBundledAssetPath(relativePath: string): Promise<string | null> {
  const startDir = path.dirname(fileURLToPath(import.meta.url))
  let currentDir = startDir

  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = path.join(currentDir, relativePath)
    if (await exists(candidate)) {
      return candidate
    }

    const parent = path.dirname(currentDir)
    if (parent === currentDir) break
    currentDir = parent
  }

  return null
}

async function downloadAsset(source: string): Promise<string> {
  let response: Response

  try {
    response = await fetch(source)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    const wrappedError = new Error(`Failed to download ${source}: ${reason}`)
    ;(wrappedError as Error & { cause?: unknown }).cause = error
    throw wrappedError
  }

  if (!response.ok) {
    throw new Error(`Failed to download ${source}: ${response.status} ${response.statusText}`)
  }

  return await response.text()
}
