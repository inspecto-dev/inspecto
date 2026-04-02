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
import { init } from './commands/init.js'
import { doctor } from './commands/doctor.js'
import { plan } from './commands/plan.js'
import { teardown } from './commands/teardown.js'
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

  cli.help()
  cli.version(version)

  return cli
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
