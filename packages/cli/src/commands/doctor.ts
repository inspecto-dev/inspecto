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
import { detectAITools } from '../detect/ai-tool.js'
import { isExtensionInstalled } from '../inject/extension.js'

interface DiagResult {
  errors: number
  warnings: number
}

export async function doctor(): Promise<void> {
  const root = process.cwd()
  const result: DiagResult = { errors: 0, warnings: 0 }

  log.header('Inspecto Doctor')

  // Check 1: package.json exists
  if (!(await exists(path.join(root, 'package.json')))) {
    log.error('No package.json found')
    log.hint('Run this command from your project root')
    return
  }

  // Check 2: IDE
  const ideProbe = await detectIDE(root)
  if (ideProbe.detected.length === 0) {
    log.warn('IDE: not detected')
    result.warnings++
  } else {
    // If we have at least one supported IDE, it's a pass
    const hasSupported = ideProbe.detected.some(d => d.supported)
    if (hasSupported) {
      log.success(
        `IDE: ${ideProbe.detected
          .filter(d => d.supported)
          .map(d => d.ide)
          .join(', ')}`,
      )
    } else {
      const names = ideProbe.detected.map(d => d.ide).join(', ')
      log.warn(`IDE: ${names} (not supported in v1, VS Code only)`)
      result.warnings++
    }
  }

  // Check 3: Supported framework
  const frameworkResult = await detectFrameworks(root)
  if (frameworkResult.supported.length > 0) {
    log.success(`Framework: ${frameworkResult.supported.join(', ')}`)
  } else if (frameworkResult.unsupported.length > 0) {
    const names = frameworkResult.unsupported.map(f => f.name).join(', ')
    log.warn(`Framework: ${names} (not supported in v1, React/Vue only)`)
    result.warnings++
  } else {
    log.warn('Framework: not detected (React / Vue expected)')
    result.warnings++
  }

  // Check 3.5: AI Tools
  const aiProbe = await detectAITools(root)
  if (aiProbe.detected.length === 0) {
    log.warn('AI Tool: none detected')
    log.hint('Inspecto works best with Claude Code, Trae CLI, or GitHub Copilot')
    result.warnings++
  } else {
    const aiNames = aiProbe.detected
      .map(d => {
        const modeLabels = d.toolModes.map(mode =>
          mode === 'plugin' ? 'VS Code Extension' : 'Terminal CLI',
        )
        return `${d.label} (${modeLabels.join(' & ')})`
      })
      .join(', ')
    log.success(`AI Tool: ${aiNames}`)
  }

  // Check 4: @inspecto/plugin installed
  const pluginPath = path.join(root, 'node_modules', '@inspecto', 'plugin')
  if (await exists(pluginPath)) {
    const pkgJson = await readJSON<{ version?: string }>(path.join(pluginPath, 'package.json'))
    const version = pkgJson?.version ?? 'unknown'
    log.success(`@inspecto/plugin@${version} installed`)
  } else {
    log.error('@inspecto/plugin not installed')
    const pm = await detectPackageManager(root)
    log.hint(`Fix: ${getInstallCommand(pm, '@inspecto/plugin')}`)
    result.errors++
  }

  // Check 5: Plugin injected in build config
  const buildResult = await detectBuildTools(root)
  if (buildResult.supported.length > 0) {
    let injected = false
    for (const bt of buildResult.supported) {
      const content = await readFile(path.join(root, bt.configPath))
      if (content && content.includes('@inspecto/plugin')) {
        log.success(`Plugin injected in ${bt.configPath}`)
        injected = true
        break
      }
    }
    if (!injected) {
      log.error('Plugin not injected in any build config')
      log.hint('Fix: npx inspecto init')
      result.errors++
    }
  } else if (buildResult.unsupported.length > 0) {
    const names = buildResult.unsupported.join(', ')
    log.warn(`Build tool: ${names} (not supported in v1)`)
    log.hint('v1 supports: Vite, Webpack, Rspack, esbuild, Rollup')
    result.warnings++
  } else {
    log.warn('No recognized build config found')
    result.warnings++
  }

  // Check 6: VS Code extension
  const extInstalled = await isExtensionInstalled()
  if (extInstalled) {
    log.success('VS Code extension detected')
  } else {
    const hasSupported = ideProbe.detected.some(d => d.supported)
    if (ideProbe.detected.length > 0 && !hasSupported) {
      log.warn('VS Code extension not applicable (non-VS Code IDE)')
    } else {
      log.error('VS Code extension not found')
      log.hint('Fix: code --install-extension inspecto.inspecto')
      log.hint('Or: https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto')
      result.errors++
    }
  }

  // Check 7: settings.json
  const settingsPath = path.join(root, '.inspecto', 'settings.json')
  if (await exists(settingsPath)) {
    const settings = await readJSON(settingsPath)
    if (settings) {
      log.success('.inspecto/settings.json valid')
    } else {
      log.error('.inspecto/settings.json has invalid JSON')
      log.hint(
        'Fix: Manually correct the syntax errors, or delete the file and re-run npx inspecto init',
      )
      result.errors++
    }
  } else {
    log.warn('.inspecto/settings.json not found (using defaults)')
    log.hint('Optional: npx inspecto init')
    result.warnings++
  }

  // Check 8: .gitignore status
  const gitignoreContent = await readFile(path.join(root, '.gitignore'))
  if (gitignoreContent) {
    const hasLockIgnore =
      gitignoreContent.includes('.inspecto/install.lock') || gitignoreContent.includes('.inspecto/')
    if (!hasLockIgnore) {
      log.warn('.inspecto/install.lock not in .gitignore')
      log.hint('install.lock contains local machine state and should not be committed')
      result.warnings++
    }
  }

  // Summary
  log.blank()
  if (result.errors === 0 && result.warnings === 0) {
    log.success('All checks passed. Hold Alt + Click to start!')
  } else {
    const parts: string[] = []
    if (result.errors > 0) parts.push(`${result.errors} error(s)`)
    if (result.warnings > 0) parts.push(`${result.warnings} warning(s)`)
    console.log(
      `  ${parts.join(', ')}. ${result.errors > 0 ? 'Fix the errors above to get started.' : ''}`,
    )
  }
  log.blank()
}
