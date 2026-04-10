import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

describe('assistant integration bootstrap wrapper', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(tempDirs.map(dir => fs.rm(dir, { recursive: true, force: true })))
    tempDirs.length = 0
  })

  it('falls back to raw asset download and still honors --force', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'inspecto-wrapper-'))
    tempDirs.push(tempRoot)

    const fakeBin = path.join(tempRoot, 'bin')
    await fs.mkdir(fakeBin, { recursive: true })
    await fs.mkdir(path.join(tempRoot, '.github/skills/inspecto-onboarding'), { recursive: true })
    await fs.writeFile(
      path.join(tempRoot, '.github/skills/inspecto-onboarding/SKILL.md'),
      'old content\n',
      'utf8',
    )

    await fs.writeFile(path.join(fakeBin, 'npx'), '#!/usr/bin/env bash\nexit 127\n', 'utf8')
    await fs.chmod(path.join(fakeBin, 'npx'), 0o755)

    await fs.writeFile(
      path.join(fakeBin, 'curl'),
      [
        '#!/usr/bin/env bash',
        'set -euo pipefail',
        'out=""',
        'while [[ $# -gt 0 ]]; do',
        '  case "$1" in',
        '    -o)',
        '      out="$2"',
        '      shift 2',
        '      ;;',
        '    *)',
        '      shift',
        '      ;;',
        '  esac',
        'done',
        'printf "downloaded from wrapper\n" > "$out"',
      ].join('\n'),
      'utf8',
    )
    await fs.chmod(path.join(fakeBin, 'curl'), 0o755)

    const scriptPath = path.resolve(__dirname, '../../../scripts/install.sh')

    await execFileAsync('bash', [scriptPath, 'copilot', '--force'], {
      cwd: tempRoot,
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
      },
    })

    const installed = await fs.readFile(
      path.join(tempRoot, '.github/skills/inspecto-onboarding/SKILL.md'),
      'utf8',
    )
    expect(installed).toBe('downloaded from wrapper\n')
  })

  it('passes --host-ide through to the CLI install command', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'inspecto-wrapper-'))
    tempDirs.push(tempRoot)

    const fakeBin = path.join(tempRoot, 'bin')
    await fs.mkdir(fakeBin, { recursive: true })

    const argsFile = path.join(tempRoot, 'npx-args.txt')
    await fs.writeFile(
      path.join(fakeBin, 'npx'),
      ['#!/usr/bin/env bash', 'set -euo pipefail', 'printf "%s\n" "$@" > "$NPX_ARGS_FILE"'].join(
        '\n',
      ),
      'utf8',
    )
    await fs.chmod(path.join(fakeBin, 'npx'), 0o755)

    const scriptPath = path.resolve(__dirname, '../../../scripts/install.sh')

    await execFileAsync('bash', [scriptPath, 'codex', 'project', '--host-ide', 'cursor'], {
      cwd: tempRoot,
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
        NPX_ARGS_FILE: argsFile,
      },
    })

    const forwardedArgs = await fs.readFile(argsFile, 'utf8')
    expect(forwardedArgs.trim().split('\n')).toEqual([
      '@inspecto-dev/cli',
      'integrations',
      'install',
      'codex',
      '--host-ide',
      'cursor',
      '--scope',
      'project',
    ])
  })

  it('installs coco raw assets into the trae skill directory', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'inspecto-wrapper-'))
    tempDirs.push(tempRoot)

    const fakeBin = path.join(tempRoot, 'bin')
    await fs.mkdir(fakeBin, { recursive: true })

    await fs.writeFile(path.join(fakeBin, 'npx'), '#!/usr/bin/env bash\nexit 127\n', 'utf8')
    await fs.chmod(path.join(fakeBin, 'npx'), 0o755)

    await fs.writeFile(
      path.join(fakeBin, 'curl'),
      [
        '#!/usr/bin/env bash',
        'set -euo pipefail',
        'out=""',
        'while [[ $# -gt 0 ]]; do',
        '  case "$1" in',
        '    -o)',
        '      out="$2"',
        '      shift 2',
        '      ;;',
        '    *)',
        '      shift',
        '      ;;',
        '  esac',
        'done',
        'printf "downloaded from wrapper\n" > "$out"',
      ].join('\n'),
      'utf8',
    )
    await fs.chmod(path.join(fakeBin, 'curl'), 0o755)

    const scriptPath = path.resolve(__dirname, '../../../scripts/install.sh')

    await execFileAsync('bash', [scriptPath, 'coco'], {
      cwd: tempRoot,
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
      },
    })

    const installed = await fs.readFile(
      path.join(tempRoot, '.trae/skills/inspecto-onboarding/SKILL.md'),
      'utf8',
    )
    expect(installed).toBe('downloaded from wrapper\n')

    const launcher = await fs.readFile(
      path.join(tempRoot, '.trae/skills/inspecto-onboarding/scripts/run-inspecto.sh'),
      'utf8',
    )
    expect(launcher).toBe('downloaded from wrapper\n')
  })
})
