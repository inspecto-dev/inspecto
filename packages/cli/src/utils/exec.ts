// ============================================================
// src/utils/exec.ts — Shell execution helpers
// ============================================================
import { execFile, exec as execCb } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const execAsync = promisify(execCb)

export interface ExecResult {
  stdout: string
  stderr: string
}

/** Run a command and return stdout/stderr. Throws on non-zero exit. */
export async function run(command: string, args: string[], cwd?: string): Promise<ExecResult> {
  const result = await execFileAsync(command, args, {
    cwd,
    timeout: 60_000,
    env: { ...process.env },
  })
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
}

/** Run a shell command string. Throws on non-zero exit. */
export async function shell(command: string, cwd?: string): Promise<ExecResult> {
  const result = await execAsync(command, {
    cwd,
    timeout: 60_000,
    env: { ...process.env },
  })
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
}

/** Check if a binary exists in PATH */
export async function which(bin: string): Promise<boolean> {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    await run(cmd, [bin])
    return true
  } catch {
    return false
  }
}
