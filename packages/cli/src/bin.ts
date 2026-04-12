// ============================================================
// src/bin.ts — CLI entry point
//
// v1 scope: VS Code | React + Vue | Vite + Webpack + Rspack + esbuild + Rollup
// ============================================================
import { cac, type CAC } from 'cac'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { apply } from './commands/apply.js'
import { detect } from './commands/detect.js'
import { devLink, devStatus, devUnlink } from './commands/dev-config.js'
import { init } from './commands/init.js'
import { doctor } from './commands/doctor.js'
import { onboard } from './commands/onboard.js'
import { plan } from './commands/plan.js'
import { teardown } from './commands/teardown.js'
import {
  type InstallIntegrationOptions,
  installIntegration,
  printIntegrationList,
  printIntegrationPath,
} from './commands/integration-install.js'
import { integrationDoctor } from './commands/integration-doctor.js'
import { reportCommandError } from './utils/output.js'

const require = createRequire(import.meta.url)
const { version } = require('../package.json')

interface GlobalOptions {
  debug?: boolean
}

interface JsonCommandOptions extends GlobalOptions {
  json?: boolean
}

interface InitCommandOptions extends GlobalOptions {
  shared?: boolean
  skipInstall?: boolean
  dryRun?: boolean
  provider?: string
  noExtension?: boolean
  packages?: string
  force?: boolean
}

interface ApplyCommandOptions extends JsonCommandOptions {
  shared?: boolean
  skipInstall?: boolean
  dryRun?: boolean
  extension?: boolean
}

interface OnboardCliOptions extends JsonCommandOptions {
  target?: string
  yes?: boolean
  shared?: boolean
  skipInstall?: boolean
  dryRun?: boolean
  extension?: boolean
}

interface IntegrationCommandOptions extends JsonCommandOptions {
  scope?: string
  mode?: string
  hostIde?: string
  inspectoVsix?: string
  compact?: boolean
  preview?: boolean
  force?: boolean
}

interface DevCommandOptions extends JsonCommandOptions {
  cliBin?: string
  repo?: string
}

const integrationScopes = ['project', 'user'] as const
const integrationModes = ['skills', 'instructions', 'agents', 'rules'] as const

function exitWithError(error: unknown, options: JsonCommandOptions = {}): never {
  reportCommandError(error, {
    debug: options.debug ?? false,
    json: options.json ?? false,
  })
  process.exit(1)
}

export function createCli(_argv: readonly string[] = process.argv): CAC {
  const cli: CAC = cac('inspecto')

  cli
    .command('dev <subcommand>', 'Manage project-local Inspecto development overrides')
    .option('--cli-bin <path>', 'Point this project at a local CLI dist/bin.js')
    .option('--repo <path>', 'Point this project at a local Inspecto repository root')
    .option('--json', 'Print machine-readable JSON output', { default: false })
    .option('--debug', 'Enable debug mode to show full error traces', { default: false })
    .action(async (subcommand: string, options: DevCommandOptions) => {
      try {
        if (subcommand === 'link') {
          if (!options.cliBin && !options.repo) {
            throw new Error('The `dev link` subcommand requires --cli-bin <path> or --repo <path>.')
          }

          await devLink({
            ...(options.cliBin ? { cliBin: options.cliBin } : {}),
            ...(options.repo ? { devRepo: options.repo } : {}),
            json: options.json ?? false,
          })
          return
        }

        if (subcommand === 'status') {
          await devStatus(options.json ?? false)
          return
        }

        if (subcommand === 'unlink') {
          await devUnlink(options.json ?? false)
          return
        }

        throw new Error(
          'Usage:\n  inspecto dev link [--cli-bin <path>] [--repo <path>]\n  inspecto dev status [--json]\n  inspecto dev unlink [--json]',
        )
      } catch (error) {
        exitWithError(error, options)
      }
    })

  cli
    .command('init', 'Set up Inspecto in your project')
    .option('--shared', 'Share .inspecto/settings.json with your team via Git', { default: false })
    .option('--skip-install', 'Skip npm dependency installation', { default: false })
    .option('--dry-run', 'Preview changes without modifying files', { default: false })
    .option('--provider <provider>', 'Set default provider (e.g. copilot, claude-code)')
    .option('--no-extension', 'Skip VS Code extension installation', { default: false })
    .option('--packages <names>', '(Monorepo) Comma-separated list of packages to inject')
    .option('--force', 'Force initialization even if environment is unsupported', {
      default: false,
    })
    .option('--debug', 'Enable debug mode to show full error traces', { default: false })
    .action(async (options: InitCommandOptions) => {
      try {
        await init({
          shared: options.shared ?? false,
          skipInstall: options.skipInstall ?? false,
          dryRun: options.dryRun ?? false,
          ...(options.provider && { provider: options.provider }),
          noExtension: options.noExtension ?? false,
          ...(options.packages && {
            packages: options.packages.split(',').map((s: string) => s.trim()),
          }),
          force: options.force ?? false,
        })
      } catch (error) {
        exitWithError(error, options)
      }
    })

  cli
    .command('doctor', 'Diagnose your Inspecto installation')
    .option('--json', 'Print machine-readable JSON output', { default: false })
    .option('--debug', 'Enable debug mode to show full error traces', { default: false })
    .action(async (options: JsonCommandOptions) => {
      try {
        await doctor({ json: options.json ?? false })
      } catch (error) {
        exitWithError(error, options)
      }
    })

  cli
    .command('onboard', 'Run assistant-oriented Inspecto onboarding in one structured flow')
    .option('--json', 'Print machine-readable JSON output', { default: false })
    .option(
      '--target <candidateIdOrPath>',
      'Select the build target to onboard using a returned candidateId or compatible config path',
    )
    .option('--yes', 'Accept a lightweight confirmation gate automatically', { default: false })
    .option('--shared', 'Write shared Inspecto settings instead of local-only settings')
    .option('--skip-install', 'Skip npm dependency installation')
    .option('--dry-run', 'Preview changes without modifying files')
    .option('--no-extension', 'Skip IDE extension installation')
    .option('--debug', 'Enable debug mode to show full error traces', { default: false })
    .action(async (options: OnboardCliOptions) => {
      try {
        await onboard({
          json: options.json ?? false,
          ...(options.target && { target: options.target }),
          yes: options.yes ?? false,
          ...(options.shared !== undefined && { shared: options.shared }),
          ...(options.skipInstall !== undefined && { skipInstall: options.skipInstall }),
          ...(options.dryRun !== undefined && { dryRun: options.dryRun }),
          ...(options.extension === false && { noExtension: true }),
        })
      } catch (error) {
        exitWithError(error, options)
      }
    })

  cli
    .command('detect', 'Detect whether the current project can be onboarded automatically')
    .option('--json', 'Print machine-readable JSON output', { default: false })
    .option('--debug', 'Enable debug mode to show full error traces', { default: false })
    .action(async (options: JsonCommandOptions) => {
      try {
        await detect(options.json ?? false)
      } catch (error) {
        exitWithError(error, options)
      }
    })

  cli
    .command('plan', 'Preview the onboarding plan for the current project')
    .option('--json', 'Print machine-readable JSON output', { default: false })
    .option('--debug', 'Enable debug mode to show full error traces', { default: false })
    .action(async (options: JsonCommandOptions) => {
      try {
        await plan(options.json ?? false)
      } catch (error) {
        exitWithError(error, options)
      }
    })

  cli
    .command('apply', 'Apply the onboarding plan to the current project')
    .option('--json', 'Print machine-readable JSON output', { default: false })
    .option('--shared', 'Write shared Inspecto settings instead of local-only settings')
    .option('--skip-install', 'Skip npm dependency installation')
    .option('--dry-run', 'Preview changes without modifying files')
    .option('--no-extension', 'Skip IDE extension installation')
    .option('--debug', 'Enable debug mode to show full error traces', { default: false })
    .action(async (options: ApplyCommandOptions) => {
      try {
        await apply({
          json: options.json ?? false,
          ...(options.shared !== undefined && { shared: options.shared }),
          ...(options.skipInstall !== undefined && { skipInstall: options.skipInstall }),
          ...(options.dryRun !== undefined && { dryRun: options.dryRun }),
          ...(options.extension === false && { noExtension: true }),
        })
      } catch (error) {
        exitWithError(error, options)
      }
    })

  cli
    .command('teardown', 'Remove Inspecto from your project')
    .option('--debug', 'Enable debug mode to show full error traces', { default: false })
    .action(async (options: GlobalOptions) => {
      try {
        await teardown()
      } catch (error) {
        exitWithError(error, options)
      }
    })

  cli
    .command('integrations [...args]', 'Manage assistant integration assets')
    .option('--json', 'Print machine-readable JSON output', { default: false })
    .option(
      '--scope <scope>',
      'Set install scope for supported assistants (e.g. claude-code: project|user)',
    )
    .option(
      '--mode <mode>',
      'Set install mode for supported assistants (e.g. copilot: skills|instructions|agents)',
    )
    .option('--host-ide <ide>', 'Choose the host IDE for automatic extension install and launch')
    .option('--inspecto-vsix <path>', 'Install the Inspecto extension from a local .vsix path')
    .option('--compact', 'Print a shorter text summary for integration doctor')
    .option('--preview', 'Preview integration changes and IDE automation without executing them')
    .option('--force', 'Overwrite existing integration files', { default: false })
    .option('--debug', 'Enable debug mode to show full error traces', { default: false })
    .action(async (args: string[], options: IntegrationCommandOptions) => {
      try {
        const [subcommand, assistant, ...rest] = args
        const integrationOptions = buildIntegrationOptions(options)

        if (subcommand === 'list') {
          if (
            assistant ||
            rest.length > 0 ||
            options.scope ||
            options.mode ||
            options.hostIde ||
            options.inspectoVsix ||
            options.compact ||
            options.json ||
            options.preview ||
            options.force
          ) {
            throw new Error(
              'The `list` subcommand does not accept assistant names, --scope, --mode, --host-ide, --inspecto-vsix, --compact, --json, --preview, or --force.',
            )
          }

          printIntegrationList()
          return
        }

        if (subcommand === 'path' && assistant) {
          if (rest.length > 0) {
            throw new Error('The `path` subcommand accepts exactly one assistant argument.')
          }

          if (options.force) {
            throw new Error('The `path` subcommand does not support `--force`.')
          }

          if (options.hostIde) {
            throw new Error('The `path` subcommand does not support `--host-ide`.')
          }

          if (options.inspectoVsix) {
            throw new Error('The `path` subcommand does not support `--inspecto-vsix`.')
          }

          if (options.preview) {
            throw new Error('The `path` subcommand does not support `--preview`.')
          }

          if (options.compact) {
            throw new Error('The `path` subcommand does not support `--compact`.')
          }

          if (options.json) {
            throw new Error('The `path` subcommand does not support `--json`.')
          }

          printIntegrationPath(assistant, integrationOptions)
          return
        }

        if (subcommand === 'doctor' && assistant) {
          if (rest.length > 0) {
            throw new Error('The `doctor` subcommand accepts exactly one assistant argument.')
          }

          if (options.force) {
            throw new Error('The `doctor` subcommand does not support `--force`.')
          }

          if (options.preview) {
            throw new Error('The `doctor` subcommand does not support `--preview`.')
          }

          await integrationDoctor(assistant, { ...integrationOptions, failOnBlocked: true })
          return
        }

        if (subcommand !== 'install' || !assistant) {
          throw new Error(
            [
              'Usage:',
              '  inspecto integrations list',
              '  inspecto integrations path <assistant> [--scope <scope>] [--mode <mode>]',
              '  inspecto integrations doctor <assistant> [--scope <scope>] [--mode <mode>] [--host-ide <ide>] [--inspecto-vsix <path>] [--compact] [--json]',
              '  inspecto integrations install <assistant> [--scope <scope>] [--mode <mode>] [--host-ide <ide>] [--inspecto-vsix <path>] [--preview] [--json] [--force]',
            ].join('\n'),
          )
        }

        if (rest.length > 0) {
          throw new Error('The `install` subcommand accepts exactly one assistant argument.')
        }

        await installIntegration(assistant, {
          ...integrationOptions,
          force: options.force ?? false,
        })
      } catch (error) {
        exitWithError(error, options)
      }
    })

  cli.help()
  cli.version(version)

  return cli
}

function buildIntegrationOptions(options: IntegrationCommandOptions): InstallIntegrationOptions {
  const resolved: InstallIntegrationOptions = {}

  if (options.scope) {
    if (isIntegrationScope(options.scope)) {
      resolved.scope = options.scope
    } else {
      throw new Error(`Unknown integration scope: ${options.scope}`)
    }
  }

  if (options.mode) {
    if (isIntegrationMode(options.mode)) {
      resolved.mode = options.mode
    } else {
      throw new Error(`Unknown integration mode: ${options.mode}`)
    }
  }

  if (options.hostIde) {
    resolved.ide = options.hostIde
  }

  if (options.inspectoVsix) {
    resolved.inspectoVsix = options.inspectoVsix
  }

  if (options.compact) {
    resolved.compact = options.compact
  }

  if (options.preview) {
    resolved.preview = options.preview
  }

  if (options.json) {
    resolved.json = options.json
  }

  return resolved
}

function isIntegrationScope(
  value: string,
): value is NonNullable<InstallIntegrationOptions['scope']> {
  return (integrationScopes as readonly string[]).includes(value)
}

function isIntegrationMode(value: string): value is NonNullable<InstallIntegrationOptions['mode']> {
  return (integrationModes as readonly string[]).includes(value)
}

export async function runCli(argv: readonly string[] = process.argv): Promise<void> {
  const cli = createCli(argv)
  const parsedArgv = [...argv]

  try {
    await cli.parse(parsedArgv)
  } catch (error) {
    exitWithError(error, { json: argv.includes('--json') })
  }
}

const entryPath = process.argv[1]
if (entryPath && fileURLToPath(import.meta.url) === entryPath) {
  void runCli()
}
