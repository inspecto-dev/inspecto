import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

const TEMP_DIRS: string[] = []

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'inspecto-runner-test-'))
  TEMP_DIRS.push(dir)
  return dir
}

async function writeExecutable(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf8')
  await fs.chmod(filePath, 0o755)
}

function runRunner(scriptPath: string, cwd: string, pathEnv: string): string {
  const result = spawnSync(scriptPath, ['onboard', '--json'], {
    cwd,
    env: {
      ...process.env,
      PATH: pathEnv,
    },
    encoding: 'utf8',
  })

  expect(result.status).toBe(0)
  return (result.stdout + result.stderr).trim()
}

describe('skill runner scripts', () => {
  afterEach(async () => {
    await Promise.all(TEMP_DIRS.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })))
  })

  it.each([
    'skills/inspecto-onboarding-codex/scripts/run-inspecto.sh',
    'skills/inspecto-onboarding-claude-code/scripts/run-inspecto.sh',
    'skills/inspecto-onboarding-core/scripts/run-inspecto.sh',
  ])(
    'prefers an installed inspecto executable before package-manager download paths: %s',
    async scriptRelativePath => {
      const workspaceRoot = path.resolve(__dirname, '../../..')
      const scriptPath = path.join(workspaceRoot, scriptRelativePath)
      const tempDir = await makeTempDir()
      const fakeBin = path.join(tempDir, 'bin')

      await writeExecutable(
        path.join(fakeBin, 'inspecto'),
        `#!/usr/bin/env bash
echo "installed-inspecto:$*"
`,
      )

      await writeExecutable(
        path.join(fakeBin, 'pnpm'),
        `#!/usr/bin/env bash
echo "pnpm-should-not-run:$*" >&2
exit 99
`,
      )

      const output = runRunner(scriptPath, tempDir, `${fakeBin}:${process.env.PATH ?? ''}`)
      expect(output).toContain('installed-inspecto:onboard --json')
      expect(output).not.toContain('pnpm-should-not-run')
    },
  )
})
