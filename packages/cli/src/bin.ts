// ============================================================
// src/bin.ts — CLI entry point
//
// v1 scope: VS Code | React + Vue | Vite + Webpack + Rspack + esbuild + Rollup
// ============================================================
import { parseArgs } from 'node:util'
import { init } from './commands/init.js'
import { doctor } from './commands/doctor.js'
import { teardown } from './commands/teardown.js'
import { log } from './utils/logger.js'

const HELP = `
  ✦ Inspecto CLI (v1)

  Supported: VS Code | React + Vue | Vite + Webpack + Rspack + esbuild + Rollup

  Usage:
    inspecto init       Set up Inspecto in your project
    inspecto doctor     Diagnose your Inspecto installation
    inspecto teardown   Remove Inspecto from your project

  Init Options:
    --shared            Share .inspecto/settings.json with your team via Git
    --skip-install      Skip npm dependency installation
    --dry-run           Preview changes without modifying files
    --prefer <tool>     Set default AI tool (e.g. github-copilot, claude-code)
    --no-extension      Skip VS Code extension installation
    --packages <names>  (Monorepo) Comma-separated list of packages to inject

  Examples:
    npx inspecto init
    npx inspecto init --shared --prefer github-copilot
    npx inspecto init --dry-run
    npx inspecto doctor
    npx inspecto teardown
`

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP)
    process.exit(0)
  }

  try {
    switch (command) {
      case 'init': {
        const { values } = parseArgs({
          args: args.slice(1),
          options: {
            shared: { type: 'boolean', default: false },
            'skip-install': { type: 'boolean', default: false },
            'dry-run': { type: 'boolean', default: false },
            prefer: { type: 'string' },
            'no-extension': { type: 'boolean', default: false },
            packages: { type: 'string' },
          },
          strict: true,
        })
        await init({
          shared: values.shared ?? false,
          skipInstall: values['skip-install'] ?? false,
          dryRun: values['dry-run'] ?? false,
          ...(values.prefer && { prefer: values.prefer }),
          noExtension: values['no-extension'] ?? false,
          ...(values.packages && { packages: values.packages.split(',').map(s => s.trim()) }),
        })
        break
      }
      case 'doctor':
        await doctor()
        break
      case 'teardown':
        await teardown()
        break
      default:
        log.error(`Unknown command: ${command}`)
        console.log(HELP)
        process.exit(1)
    }
  } catch (err) {
    log.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

main()
