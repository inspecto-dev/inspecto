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
  const result = spawnSync('bash', [scriptPath, 'onboard', '--json'], {
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

function runRunnerWithEnv(
  scriptPath: string,
  cwd: string,
  pathEnv: string,
  extraEnv: Record<string, string>,
): string {
  const result = spawnSync('bash', [scriptPath, 'onboard', '--json'], {
    cwd,
    env: {
      ...process.env,
      PATH: pathEnv,
      ...extraEnv,
    },
    encoding: 'utf8',
  })

  expect(result.status).toBe(0)
  return (result.stdout + result.stderr).trim()
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

async function writeNodeEntrypoint(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(
    filePath,
    `#!/usr/bin/env node\nconsole.log(${JSON.stringify(content)} + process.argv.slice(2).join(' '))\n`,
    'utf8',
  )
  await fs.chmod(filePath, 0o755)
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

  it.each([
    'skills/inspecto-onboarding-codex/scripts/run-inspecto.sh',
    'skills/inspecto-onboarding-claude-code/scripts/run-inspecto.sh',
    'skills/inspecto-onboarding-trae/scripts/run-inspecto.sh',
    'skills/inspecto-onboarding-core/scripts/run-inspecto.sh',
  ])('prefers .inspecto/dev.json cliBin before global fallback: %s', async scriptRelativePath => {
    const workspaceRoot = path.resolve(__dirname, '../../..')
    const scriptPath = path.join(workspaceRoot, scriptRelativePath)
    const tempDir = await makeTempDir()
    const fakeBin = path.join(tempDir, 'bin')
    const fakeCli = path.join(tempDir, 'inspecto-dev-bin.js')

    await writeNodeEntrypoint(fakeCli, 'dev-config-cli:')
    await writeJson(path.join(tempDir, '.inspecto/dev.json'), {
      cliBin: fakeCli,
    })
    await writeExecutable(
      path.join(fakeBin, 'inspecto'),
      `#!/usr/bin/env bash
echo "installed-inspecto:$*"
`,
    )

    const output = runRunner(scriptPath, tempDir, `${fakeBin}:${process.env.PATH ?? ''}`)
    expect(output).toContain('dev-config-cli:onboard --json')
    expect(output).not.toContain('installed-inspecto:onboard --json')
  })

  it.each([
    'skills/inspecto-onboarding-codex/scripts/run-inspecto.sh',
    'skills/inspecto-onboarding-claude-code/scripts/run-inspecto.sh',
    'skills/inspecto-onboarding-trae/scripts/run-inspecto.sh',
    'skills/inspecto-onboarding-core/scripts/run-inspecto.sh',
  ])('prefers .inspecto/dev.json devRepo before global fallback: %s', async scriptRelativePath => {
    const workspaceRoot = path.resolve(__dirname, '../../..')
    const scriptPath = path.join(workspaceRoot, scriptRelativePath)
    const tempDir = await makeTempDir()
    const fakeBin = path.join(tempDir, 'bin')
    const fakeRepoDist = path.join(tempDir, 'repo/packages/cli/dist')

    await writeNodeEntrypoint(path.join(fakeRepoDist, 'bin.js'), 'dev-config-repo:')
    await writeJson(path.join(tempDir, '.inspecto/dev.json'), {
      devRepo: path.join(tempDir, 'repo'),
    })
    await writeExecutable(
      path.join(fakeBin, 'inspecto'),
      `#!/usr/bin/env bash
echo "installed-inspecto:$*"
`,
    )

    const output = runRunner(scriptPath, tempDir, `${fakeBin}:${process.env.PATH ?? ''}`)
    expect(output).toContain('dev-config-repo:onboard --json')
    expect(output).not.toContain('installed-inspecto:onboard --json')
  })

  it.each([
    'skills/inspecto-onboarding-codex/scripts/run-inspecto.sh',
    'skills/inspecto-onboarding-claude-code/scripts/run-inspecto.sh',
    'skills/inspecto-onboarding-trae/scripts/run-inspecto.sh',
    'skills/inspecto-onboarding-core/scripts/run-inspecto.sh',
  ])('prefers env vars over .inspecto/dev.json: %s', async scriptRelativePath => {
    const workspaceRoot = path.resolve(__dirname, '../../..')
    const scriptPath = path.join(workspaceRoot, scriptRelativePath)
    const tempDir = await makeTempDir()
    const fakeBin = path.join(tempDir, 'bin')
    const envCli = path.join(tempDir, 'env-bin.js')
    const configCli = path.join(tempDir, 'config-bin.js')

    await writeNodeEntrypoint(envCli, 'env-cli:')
    await writeNodeEntrypoint(configCli, 'config-cli:')
    await writeJson(path.join(tempDir, '.inspecto/dev.json'), {
      cliBin: configCli,
    })
    await fs.mkdir(fakeBin, { recursive: true })

    const output = runRunnerWithEnv(scriptPath, tempDir, `${fakeBin}:${process.env.PATH ?? ''}`, {
      INSPECTO_CLI_BIN: envCli,
    })

    expect(output).toContain('env-cli:onboard --json')
    expect(output).not.toContain('config-cli:onboard --json')
  })
})
