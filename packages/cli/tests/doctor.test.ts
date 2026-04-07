import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/utils/fs.js', () => ({
  exists: vi.fn(),
  readJSON: vi.fn(),
  readFile: vi.fn(),
}))

vi.mock('../src/detect/package-manager.js', () => ({
  detectPackageManager: vi.fn(),
  getInstallCommand: vi.fn(),
}))

vi.mock('../src/detect/build-tool.js', () => ({
  detectBuildTools: vi.fn(),
}))

vi.mock('../src/detect/framework.js', () => ({
  detectFrameworks: vi.fn(),
}))

vi.mock('../src/detect/ide.js', () => ({
  detectIDE: vi.fn(),
}))

vi.mock('../src/detect/provider.js', () => ({
  detectProviders: vi.fn(),
}))

vi.mock('../src/inject/extension.js', () => ({
  isExtensionInstalled: vi.fn(),
}))

import { collectDoctorResult, doctor } from '../src/commands/doctor.js'
import * as buildTool from '../src/detect/build-tool.js'
import * as framework from '../src/detect/framework.js'
import * as ide from '../src/detect/ide.js'
import * as packageManager from '../src/detect/package-manager.js'
import * as provider from '../src/detect/provider.js'
import * as extension from '../src/inject/extension.js'
import * as fsUtils from '../src/utils/fs.js'
import { log } from '../src/utils/logger.js'

function mockFailingInstall(): void {
  vi.mocked(fsUtils.exists).mockImplementation(async (filePath: string) => {
    const existingPaths = new Set([
      '/repo/package.json',
      '/repo/vite.config.ts',
      '/repo/node_modules/@inspecto-dev/plugin',
      '/repo/.inspecto/settings.json',
      '/repo/.gitignore',
    ])
    return existingPaths.has(filePath)
  })
  vi.mocked(fsUtils.readJSON).mockImplementation(async (filePath: string) => {
    if (filePath === '/repo/node_modules/@inspecto-dev/plugin/package.json') {
      return { version: '1.2.3' }
    }
    if (filePath === '/repo/.inspecto/settings.json') {
      return null
    }
    return null
  })
  vi.mocked(fsUtils.readFile).mockImplementation(async (filePath: string) => {
    if (filePath === '/repo/vite.config.ts') {
      return 'export default {}'
    }
    if (filePath === '/repo/.gitignore') {
      return 'node_modules/\n'
    }
    return null
  })
  vi.mocked(packageManager.detectPackageManager).mockResolvedValue('pnpm')
  vi.mocked(packageManager.getInstallCommand).mockReturnValue('pnpm add -D @inspecto-dev/plugin')
  vi.mocked(ide.detectIDE).mockResolvedValue({
    detected: [{ ide: 'vscode', supported: true }],
  })
  vi.mocked(framework.detectFrameworks).mockResolvedValue({
    supported: ['react'],
    unsupported: [],
  })
  vi.mocked(provider.detectProviders).mockResolvedValue({
    detected: [],
  })
  vi.mocked(buildTool.detectBuildTools).mockResolvedValue({
    supported: [{ tool: 'vite', configPath: 'vite.config.ts', label: 'Vite (vite.config.ts)' }],
    unsupported: [],
  })
  vi.mocked(extension.isExtensionInstalled).mockResolvedValue(false)
}

describe('doctor command', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.spyOn(process, 'cwd').mockReturnValue('/repo')
  })

  it('returns an early blocked result when package.json is missing', async () => {
    vi.mocked(fsUtils.exists).mockResolvedValue(false)
    const detectIdeSpy = vi.mocked(ide.detectIDE)

    const result = await collectDoctorResult('/repo')

    expect(result).toEqual({
      status: 'blocked',
      summary: { errors: 1, warnings: 0 },
      project: { root: '/repo' },
      errors: [
        {
          code: 'missing-package-json',
          status: 'error',
          message: 'No package.json found',
          hints: ['Run this command from your project root'],
        },
      ],
      warnings: [],
      checks: [
        {
          code: 'missing-package-json',
          status: 'error',
          message: 'No package.json found',
          hints: ['Run this command from your project root'],
        },
      ],
    })
    expect(detectIdeSpy).not.toHaveBeenCalled()
  })

  it('returns structured diagnostics in json mode for a failing installation', async () => {
    mockFailingInstall()

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const headerSpy = vi.spyOn(log, 'header')

    const result = await doctor({ json: true })

    expect(result.status).toBe('blocked')
    expect(result.summary).toEqual({
      errors: 3,
      warnings: 2,
    })
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'plugin-not-configured',
        message: 'Plugin not configured in any build config',
      }),
      expect.objectContaining({
        code: 'extension-missing',
        message: 'VS Code extension not found',
        hints: [
          'Fix: code --install-extension inspecto.inspecto',
          'Or: https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto',
        ],
      }),
      expect.objectContaining({
        code: 'settings-invalid-json',
        message: '.inspecto/settings.json has invalid JSON',
      }),
    ])
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'provider-missing',
        message: 'Provider: none detected',
      }),
      expect.objectContaining({
        code: 'gitignore-missing-install-lock',
        message: '.inspecto/install.lock not in .gitignore',
      }),
    ])
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'plugin-installed', status: 'ok' }),
        expect.objectContaining({ code: 'plugin-not-configured', status: 'error' }),
        expect.objectContaining({ code: 'provider-missing', status: 'warning' }),
      ]),
    )
    expect(headerSpy).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(result, null, 2))
  })

  it('does not report a VS Code extension error for supported non-VS Code IDEs', async () => {
    mockFailingInstall()
    vi.mocked(ide.detectIDE).mockResolvedValue({
      detected: [{ ide: 'cursor', supported: true }],
    })

    const result = await collectDoctorResult('/repo')

    expect(result.errors).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ code: 'extension-missing' })]),
    )
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'extension-not-applicable',
          message: 'VS Code extension not applicable (non-VS Code IDE)',
        }),
      ]),
    )
  })

  it('preserves the human-readable doctor output in text mode', async () => {
    mockFailingInstall()

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    const result = await doctor()
    const output = consoleSpy.mock.calls.map(call => call.join(' ')).join('\n')

    expect(result.status).toBe('blocked')
    expect(output).toContain('Inspecto Doctor')
    expect(output).toContain('Provider: none detected')
    expect(output).toContain('Inspecto works best with Claude Code, Trae CLI, or GitHub Copilot')
    expect(output).toContain('Plugin not configured in any build config')
    expect(output).toContain('Fix: npx @inspecto-dev/cli init')
    expect(output).toContain('VS Code extension not found')
    expect(output).toContain('Fix: code --install-extension inspecto.inspecto')
    expect(output).toContain('.inspecto/settings.json has invalid JSON')
    expect(output).toContain('3 error(s), 2 warning(s). Fix the errors above to get started.')
    expect(output).not.toContain('"status"')
    expect(output).not.toContain('"summary"')
  })
})
