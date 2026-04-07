// ============================================================
// src/commands/doctor.ts — Installation diagnostics (v1)
// ============================================================
import path from 'node:path'
import { log } from '../utils/logger.js'
import { exists, readJSON, readFile } from '../utils/fs.js'
import { detectPackageManager, getInstallCommand } from '../detect/package-manager.js'
import { detectBuildTools } from '../detect/build-tool.js'
import { detectFrameworks } from '../detect/framework.js'
import { detectIDE } from '../detect/ide.js'
import { detectProviders } from '../detect/provider.js'
import { isExtensionInstalled } from '../inject/extension.js'
import { writeCommandOutput } from '../utils/output.js'
import type { CommandStatus, DoctorDiagnostic, DoctorResult } from '../types.js'

export interface DoctorCommandOptions {
  json?: boolean
}

function createDiagnostic(
  code: string,
  status: DoctorDiagnostic['status'],
  message: string,
  hints: string[] = [],
  details?: Record<string, unknown>,
): DoctorDiagnostic {
  return {
    code,
    status,
    message,
    hints,
    ...(details ? { details } : {}),
  }
}

function doctorStatus(errors: number, warnings: number): CommandStatus {
  if (errors > 0) return 'blocked'
  if (warnings > 0) return 'warning'
  return 'ok'
}

function printDoctorResult(result: DoctorResult): void {
  log.header('Inspecto Doctor')

  for (const check of result.checks) {
    if (check.status === 'ok') {
      log.success(check.message)
    } else if (check.status === 'warning') {
      log.warn(check.message)
    } else {
      log.error(check.message)
    }

    for (const hint of check.hints) {
      log.hint(hint)
    }
  }

  log.blank()
  if (result.summary.errors === 0 && result.summary.warnings === 0) {
    log.success('All checks passed. Hold Alt + Click to start!')
  } else {
    const parts: string[] = []
    if (result.summary.errors > 0) parts.push(`${result.summary.errors} error(s)`)
    if (result.summary.warnings > 0) parts.push(`${result.summary.warnings} warning(s)`)
    console.log(
      `  ${parts.join(', ')}. ${result.summary.errors > 0 ? 'Fix the errors above to get started.' : ''}`,
    )
  }
  log.blank()
}

export async function collectDoctorResult(root = process.cwd()): Promise<DoctorResult> {
  const checks: DoctorDiagnostic[] = []

  // Check 1: package.json exists
  if (!(await exists(path.join(root, 'package.json')))) {
    const diagnostic = createDiagnostic('missing-package-json', 'error', 'No package.json found', [
      'Run this command from your project root',
    ])
    checks.push(diagnostic)
    return {
      status: 'blocked',
      summary: { errors: 1, warnings: 0 },
      project: { root },
      errors: [diagnostic],
      warnings: [],
      checks,
    }
  }

  // Run detections concurrently
  const [ideProbe, frameworkResult, providerProbe, pm, buildResult, extInstalled] =
    await Promise.all([
      detectIDE(root),
      detectFrameworks(root),
      detectProviders(root),
      detectPackageManager(root),
      detectBuildTools(root),
      isExtensionInstalled(),
    ])

  // Check 2: IDE
  if (ideProbe.detected.length === 0) {
    checks.push(createDiagnostic('ide-not-detected', 'warning', 'IDE: not detected'))
  } else {
    // If we have at least one supported IDE, it's a pass
    const hasSupported = ideProbe.detected.some(d => d.supported)
    if (hasSupported) {
      checks.push(
        createDiagnostic(
          'ide-supported',
          'ok',
          `IDE: ${ideProbe.detected
            .filter(d => d.supported)
            .map(d => d.ide)
            .join(', ')}`,
          [],
          {
            detected: ideProbe.detected,
          },
        ),
      )
    } else {
      const names = ideProbe.detected.map(d => d.ide).join(', ')
      checks.push(
        createDiagnostic(
          'ide-unsupported',
          'warning',
          `IDE: ${names} (not supported in v1, VS Code, Cursor, Trae only)`,
          [],
          {
            detected: ideProbe.detected,
          },
        ),
      )
    }
  }

  // Check 3: Supported framework
  if (frameworkResult.supported.length > 0) {
    checks.push(
      createDiagnostic(
        'framework-supported',
        'ok',
        `Framework: ${frameworkResult.supported.join(', ')}`,
      ),
    )
  } else if (frameworkResult.unsupported.length > 0) {
    const names = frameworkResult.unsupported.map(f => f.name).join(', ')
    checks.push(
      createDiagnostic(
        'framework-unsupported',
        'warning',
        `Framework: ${names} (not supported in v1, React/Vue only)`,
      ),
    )
  } else {
    checks.push(
      createDiagnostic(
        'framework-not-detected',
        'warning',
        'Framework: not detected (React / Vue expected)',
      ),
    )
  }

  // Check 3.5: Providers
  if (providerProbe.detected.length === 0) {
    checks.push(
      createDiagnostic('provider-missing', 'warning', 'Provider: none detected', [
        'Inspecto works best with Claude Code, Trae CLI, or GitHub Copilot',
      ]),
    )
  } else {
    const aiNames = providerProbe.detected
      .map(d => {
        const modeLabels = d.providerModes.map(mode =>
          mode === 'extension' ? 'VS Code Extension' : 'Terminal CLI',
        )
        return `${d.label} (${modeLabels.join(' & ')})`
      })
      .join(', ')
    checks.push(createDiagnostic('provider-detected', 'ok', `Provider: ${aiNames}`))
  }

  // Check 4: @inspecto-dev/plugin installed
  const pluginPath = path.join(root, 'node_modules', '@inspecto-dev', 'plugin')
  if (await exists(pluginPath)) {
    const pkgJson = await readJSON<{ version?: string }>(path.join(pluginPath, 'package.json'))
    const version = pkgJson?.version ?? 'unknown'
    checks.push(
      createDiagnostic('plugin-installed', 'ok', `@inspecto-dev/plugin@${version} installed`, [], {
        version,
      }),
    )
  } else {
    checks.push(
      createDiagnostic('plugin-missing', 'error', '@inspecto-dev/plugin not installed', [
        `Fix: ${getInstallCommand(pm, '@inspecto-dev/plugin')}`,
      ]),
    )
  }

  // Check 5: Plugin injected in build config
  if (buildResult.supported.length > 0) {
    let injected = false
    for (const bt of buildResult.supported) {
      const content = await readFile(path.join(root, bt.configPath))
      if (content && content.includes('@inspecto-dev/plugin')) {
        checks.push(
          createDiagnostic('plugin-configured', 'ok', `Plugin configured in ${bt.configPath}`, [], {
            configPath: bt.configPath,
            buildTool: bt.tool,
          }),
        )
        injected = true
        break
      }
    }
    if (!injected) {
      checks.push(
        createDiagnostic(
          'plugin-not-configured',
          'error',
          'Plugin not configured in any build config',
          ['Fix: npx @inspecto-dev/cli init'],
        ),
      )
    }
  } else if (buildResult.unsupported.length > 0) {
    const names = buildResult.unsupported.join(', ')
    checks.push(
      createDiagnostic(
        `build-tool-unsupported`,
        'warning',
        `Build tool: ${names} (not supported in v1)`,
        ['current version supports: Vite, Webpack, Rspack, esbuild, Rollup'],
      ),
    )
  } else {
    checks.push(
      createDiagnostic('build-tool-missing', 'warning', 'No recognized build config found'),
    )
  }

  // Check 6: VS Code extension
  if (extInstalled) {
    checks.push(createDiagnostic('extension-installed', 'ok', 'VS Code extension detected'))
  } else {
    const hasVSCode = ideProbe.detected.some(d => d.supported && d.ide === 'vscode')
    const hasSupportedNonVSCode = ideProbe.detected.some(d => d.supported && d.ide !== 'vscode')

    if (hasSupportedNonVSCode && !hasVSCode) {
      checks.push(
        createDiagnostic(
          'extension-not-applicable',
          'warning',
          'VS Code extension not applicable (non-VS Code IDE)',
        ),
      )
    } else {
      checks.push(
        createDiagnostic('extension-missing', 'error', 'VS Code extension not found', [
          'Fix: code --install-extension inspecto.inspecto',
          'Or: https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto',
        ]),
      )
    }
  }

  // Check 7: settings
  const settingsJsonPath = path.join(root, '.inspecto', 'settings.json')
  const settingsLocalPath = path.join(root, '.inspecto', 'settings.local.json')

  const hasSettingsJson = await exists(settingsJsonPath)
  const hasSettingsLocal = await exists(settingsLocalPath)

  if (hasSettingsJson || hasSettingsLocal) {
    const targetPath = hasSettingsLocal ? settingsLocalPath : settingsJsonPath
    const fileName = hasSettingsLocal ? 'settings.local.json' : 'settings.json'
    const settings = await readJSON(targetPath)
    if (settings) {
      checks.push(createDiagnostic('settings-valid', 'ok', `.inspecto/${fileName} valid`))
    } else {
      checks.push(
        createDiagnostic(
          'settings-invalid-json',
          'error',
          `.inspecto/${fileName} has invalid JSON`,
          [
            'Fix: Manually correct the syntax errors, or delete the file and re-run npx @inspecto-dev/cli init',
          ],
          {
            fileName,
          },
        ),
      )
    }
  } else {
    checks.push(
      createDiagnostic(
        'settings-missing',
        'warning',
        'No .inspecto/settings.json or settings.local.json found (using defaults)',
        ['Optional: npx @inspecto-dev/cli init'],
      ),
    )
  }

  // Check 8: .gitignore status
  const gitignoreContent = await readFile(path.join(root, '.gitignore'))
  if (gitignoreContent) {
    const hasLockIgnore =
      gitignoreContent.includes('.inspecto/install.lock') || gitignoreContent.includes('.inspecto/')
    if (!hasLockIgnore) {
      checks.push(
        createDiagnostic(
          'gitignore-missing-install-lock',
          'warning',
          '.inspecto/install.lock not in .gitignore',
          ['install.lock contains local machine state and should not be committed'],
        ),
      )
    }
  }

  const errors = checks.filter(check => check.status === 'error')
  const warnings = checks.filter(check => check.status === 'warning')

  return {
    status: doctorStatus(errors.length, warnings.length),
    summary: {
      errors: errors.length,
      warnings: warnings.length,
    },
    project: {
      root,
      packageManager: pm,
    },
    errors,
    warnings,
    checks,
  }
}

export async function doctor(options: DoctorCommandOptions | boolean = {}): Promise<DoctorResult> {
  const json = typeof options === 'boolean' ? options : (options.json ?? false)
  const result = await collectDoctorResult(process.cwd())
  return writeCommandOutput(result, json, printDoctorResult)
}
