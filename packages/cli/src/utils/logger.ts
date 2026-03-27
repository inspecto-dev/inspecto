// ============================================================
// src/utils/logger.ts — Colored terminal output
// ============================================================
import pc from 'picocolors'

export const log = {
  /** Section header */
  header(text: string) {
    console.log()
    console.log(`  ${pc.bold(pc.cyan('✦'))} ${pc.bold(text)}`)
    console.log()
  },

  /** Info item (used for actionable but not fully successful states) */
  info(text: string) {
    console.log(`  ${pc.blue('ℹ')} ${text}`)
  },
  success(text: string) {
    console.log(`  ${pc.green('✔')} ${text}`)
  },

  /** Warning item */
  warn(text: string) {
    console.log(`  ${pc.yellow('⚠')} ${text}`)
  },

  /** Error item */
  error(text: string) {
    console.log(`  ${pc.red('✘')} ${text}`)
  },

  /** Indented hint line */
  hint(text: string) {
    console.log(`    ${pc.dim('→')} ${text}`)
  },

  /** Blank line */
  blank() {
    console.log()
  },

  /** Final ready message */
  ready(text: string) {
    console.log()
    console.log(`  ${pc.bold(pc.green('⚡'))} ${pc.bold(text)}`)
    console.log()
  },

  /** Code block for manual instructions */
  codeBlock(lines: string[]) {
    console.log()
    console.log(`  ${pc.dim('┌─────────────────────────────────────────────────┐')}`)
    for (const line of lines) {
      console.log(`  ${pc.dim('│')} ${line.padEnd(48)}${pc.dim('│')}`)
    }
    console.log(`  ${pc.dim('└─────────────────────────────────────────────────┘')}`)
    console.log()
  },

  /** Dry-run prefix */
  dryRun(text: string) {
    console.log(`  ${pc.blue('[dry-run]')} ${text}`)
  },
}
