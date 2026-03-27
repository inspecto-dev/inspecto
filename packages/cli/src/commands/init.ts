// ============================================================
// src/commands/init.ts — Main init orchestrator (v1)
//
// v1 scope:
//   - IDE: VS Code only
//   - Framework: React / Vue
//   - Build tools: Vite / Webpack / Rspack / esbuild / Rollup
// ============================================================
import path from 'node:path'
import { log } from '../utils/logger.js'
import { exists, writeJSON, readJSON } from '../utils/fs.js'
import { shell } from '../utils/exec.js'
import { detectPackageManager, getInstallCommand } from '../detect/package-manager.js'
import { detectBuildTools, resolveInjectionTarget } from '../detect/build-tool.js'
import { detectFrameworks } from '../detect/framework.js'
import { detectIDE } from '../detect/ide.js'
import { detectAITools, type AIToolDetection } from '../detect/ai-tool.js'
import { injectPlugin } from '../inject/ast-injector.js'
import { updateGitignore } from '../inject/gitignore.js'
import { installExtension } from '../inject/extension.js'
import type { InitOptions, InstallLock, Mutation, BuildToolDetection } from '../types.js'

/**
 * Interactive prompt for IDE choice.
 */
async function promptIDEChoice(
  detections: { ide: string; supported: boolean }[],
): Promise<{ ide: string; supported: boolean } | null> {
  if (!process.stdin.isTTY) {
    log.warn('Multiple IDEs detected but stdin is not interactive')
    log.hint(`Using: ${detections[0]!.ide} (first match)`)
    return detections[0]!
  }

  console.log()
  console.log('  ? Detected multiple IDEs:')
  detections.forEach((d, i) => {
    const status = d.supported ? ' (supported)' : ' (unsupported/limited)'
    console.log(`      ${i + 1}. ${d.ide}${status}`)
  })
  console.log()

  return new Promise(resolve => {
    process.stdout.write('  > Your choice: ')

    // We must resume stdin in case it was paused by a previous prompt
    process.stdin.resume()
    process.stdin.setEncoding('utf-8')

    const onData = (data: Buffer) => {
      const choice = parseInt(String(data).trim(), 10)

      // Cleanup the listener to avoid memory leaks or multiple fires
      process.stdin.off('data', onData)
      process.stdin.pause() // Pause so the CLI can exit when done

      if (choice >= 1 && choice <= detections.length) {
        resolve(detections[choice - 1]!)
      } else {
        resolve(null)
      }
    }

    process.stdin.on('data', onData)
  })
}
/**
 * Interactive prompt for AI tool choice.
 */
async function promptAIToolChoice(detections: AIToolDetection[]): Promise<AIToolDetection | null> {
  if (!process.stdin.isTTY) {
    log.warn('Multiple AI tools detected but stdin is not interactive')
    log.hint(`Using: ${detections[0]!.label} (first match)`)
    return detections[0]!
  }

  console.log()
  console.log('  ? Detected multiple AI tools:')
  detections.forEach((d, i) => {
    // Map toolModes array to human-readable labels
    const modeLabels = d.toolModes.map(mode =>
      mode === 'plugin' ? 'VS Code Extension' : 'Terminal CLI',
    )
    const modeStr = modeLabels.join(' & ')

    const status = d.supported ? ` (supported ${modeStr})` : ` (unsupported/limited)`
    console.log(`      ${i + 1}. ${d.label}${status}`)
  })
  console.log()

  return new Promise(resolve => {
    process.stdout.write('  > Your choice: ')

    // We must resume stdin in case it was paused by a previous prompt
    process.stdin.resume()
    process.stdin.setEncoding('utf-8')

    const onData = (data: Buffer) => {
      const choice = parseInt(String(data).trim(), 10)

      // Cleanup the listener to avoid memory leaks or multiple fires
      process.stdin.off('data', onData)
      process.stdin.pause() // Pause so the CLI can exit when done

      if (choice >= 1 && choice <= detections.length) {
        resolve(detections[choice - 1]!)
      } else {
        resolve(null)
      }
    }

    process.stdin.on('data', onData)
  })
}

async function promptConfigChoice(
  detections: BuildToolDetection[],
): Promise<BuildToolDetection | null> {
  if (!process.stdin.isTTY) {
    log.warn('Multiple config files detected but stdin is not interactive')
    log.hint(`Using: ${detections[0]!.label} (first match)`)
    return detections[0]!
  }

  console.log()
  console.log('  ? Detected multiple build tool configs:')
  detections.forEach((d, i) => {
    // Determine recommendation based on whether it seems like the "main" one
    // We can infer Rsbuild > Rspack > Vite > Webpack as a priority if needed,
    // but without package.json scripts analysis, we just highlight them plainly.
    console.log(`      ${i + 1}. ${d.label}`)
  })
  console.log(`      ${detections.length + 1}. Skip (I'll configure manually)`)
  console.log()

  return new Promise(resolve => {
    process.stdout.write('  > Your choice: ')

    // We must resume stdin in case it was paused by a previous prompt
    process.stdin.resume()
    process.stdin.setEncoding('utf-8')

    const onData = (data: Buffer) => {
      const choice = parseInt(String(data).trim(), 10)

      // Cleanup the listener to avoid memory leaks or multiple fires
      process.stdin.off('data', onData)
      process.stdin.pause() // Pause so the CLI can exit when done

      if (choice >= 1 && choice <= detections.length) {
        resolve(detections[choice - 1]!)
      } else {
        resolve(null)
      }
    }

    process.stdin.on('data', onData)
  })
}

export async function init(options: InitOptions): Promise<void> {
  const root = process.cwd()
  const mutations: Mutation[] = []

  log.header('Inspecto Setup')

  // ---- Step 1: Validate project ----
  if (!(await exists(path.join(root, 'package.json')))) {
    log.error('No package.json found in current directory')
    log.hint('Run this command from your project root')
    return
  }

  // ---- Step 2: Detect environment ----

  // Package manager
  const pm = await detectPackageManager(root)
  log.success(`Detected package manager: ${pm}`)

  // Framework detection (supported + unsupported)
  const frameworkResult = await detectFrameworks(root)
  if (frameworkResult.supported.length > 0) {
    log.success(`Detected framework: ${frameworkResult.supported.join(', ')}`)
  }
  if (frameworkResult.unsupported.length > 0) {
    const names = frameworkResult.unsupported.map(f => f.name).join(', ')
    log.warn(`Detected ${names} — not supported in v1 (React / Vue only)`)
    log.hint('Inspecto may still work but is not tested for this framework')
  }
  if (frameworkResult.supported.length === 0 && frameworkResult.unsupported.length === 0) {
    log.warn('No frontend framework detected')
    log.hint('Inspecto v1 supports React and Vue projects')
  }

  // Build tool detection (supported + unsupported)
  const buildResult = await detectBuildTools(root)
  if (buildResult.supported.length > 0) {
    buildResult.supported.forEach(bt => log.success(`Detected: ${bt.label}`))
  }
  if (buildResult.unsupported.length > 0) {
    const names = buildResult.unsupported.join(', ')
    log.warn(`Detected ${names} — not supported in v1`)
    log.hint('v1 supports: Vite, Webpack, Rspack, esbuild, Rollup')
    log.hint('Meta-framework support (Next.js, Nuxt, etc.) is planned for v2')
  }
  if (buildResult.supported.length === 0 && buildResult.unsupported.length === 0) {
    log.warn('No recognized build tool detected')
    log.hint('v1 supports: Vite, Webpack, Rspack, esbuild, Rollup')
    log.hint('Dependency will be installed but plugin injection will be skipped')
  }

  // IDE detection
  const ideProbe = await detectIDE(root)
  let selectedIDE: { ide: string; supported: boolean } | null = null

  if (ideProbe.detected.length === 0) {
    log.error('No IDE detected in current project')
    log.hint('Please open this project in a supported IDE (like VS Code)')
    // We could potentially block here, but we will allow the rest of the CLI to run
    // for settings generation and build config injection.
  } else if (ideProbe.detected.length === 1) {
    selectedIDE = ideProbe.detected[0]!
  } else {
    // Has multiple
    selectedIDE = await promptIDEChoice(ideProbe.detected)
  }

  if (selectedIDE) {
    if (selectedIDE.supported) {
      log.success(`Selected IDE: ${selectedIDE.ide}`)
    } else {
      log.warn(`Selected IDE: ${selectedIDE.ide}`)
      log.hint(
        `Note: Inspecto currently requires VS Code (or compatible forks) to function properly.`,
      )
      log.hint(`Features may be severely limited or unavailable in ${selectedIDE.ide}.`)
    }
  }

  // AI Tool detection
  const aiToolProbe = await detectAITools(root)
  let selectedAITool: AIToolDetection | null = null

  // If user passed --prefer, we trust it over probing, but if they didn't:
  if (!options.prefer) {
    if (aiToolProbe.detected.length === 0) {
      log.warn('No supported AI tools detected')
      log.hint('Inspecto works best with Claude Code, Trae CLI, or GitHub Copilot')
    } else if (aiToolProbe.detected.length === 1) {
      selectedAITool = aiToolProbe.detected[0]!
      if (selectedAITool.supported) {
        log.success(`Detected AI tool: ${selectedAITool.label}`)
      }
    } else {
      // Has multiple AI Tools
      selectedAITool = await promptAIToolChoice(aiToolProbe.detected)
      if (selectedAITool) {
        log.success(`Selected AI tool: ${selectedAITool.label}`)
      }
    }
  }

  // ---- Step 3: Install dependency ----
  let installFailed = false
  if (options.skipInstall) {
    log.warn('Skipping dependency installation (--skip-install)')
  } else {
    const installCmd = getInstallCommand(pm, '@inspecto/plugin')
    if (options.dryRun) {
      log.dryRun(`Would run: ${installCmd}`)
    } else {
      try {
        const result = await shell(installCmd, root)
        if (result.stderr && result.stderr.toLowerCase().includes('error')) {
          throw new Error(result.stderr)
        }
        log.success('Installed @inspecto/plugin as devDependency')
        mutations.push({
          type: 'dependency_added',
          name: '@inspecto/plugin',
          dev: true,
        })
      } catch (err: any) {
        installFailed = true
        log.error(`Failed to install dependency: ${err?.message || 'Unknown error'}`)
        log.hint(`Run manually: ${installCmd}`)
        // We do not return here to allow the rest of the setup to continue,
        // but we will show a warning at the end instead of the success message.
      }
    }
  }

  // ---- Step 4: Inject plugin into build config ----
  let injectionFailed = false
  if (buildResult.supported.length > 0) {
    let target = resolveInjectionTarget(buildResult.supported)

    if (target === 'ambiguous') {
      target = await promptConfigChoice(buildResult.supported)
    }

    if (target) {
      const result = await injectPlugin(root, target, options.dryRun)
      if (result.success) {
        mutations.push(...result.mutations)
      } else {
        injectionFailed = true
      }
    } else {
      injectionFailed = true
      log.warn('Skipping plugin injection (manual configuration required)')
    }
  }

  // ---- Step 5: Generate default settings ----
  const settingsDir = path.join(root, '.inspecto')
  const settingsPath = path.join(settingsDir, 'settings.json')
  const promptsPath = path.join(settingsDir, 'prompts.json')

  if (await exists(settingsPath)) {
    // Attempt to read the existing settings file to see if it's valid JSON
    const existingSettings = await readJSON(settingsPath)
    if (existingSettings === null) {
      log.warn('.inspecto/settings.json exists but contains invalid JSON')
      log.hint('Please fix the syntax errors manually, or delete it and re-run init')
    } else {
      log.success('.inspecto/settings.json already exists (skipped)')
    }
  } else {
    // Only omit properties that can be auto-inferred
    // The schema allows empty objects or just specifying the IDE/prefer
    const defaultSettings: Record<string, unknown> = {}

    if (selectedIDE && selectedIDE.supported) {
      defaultSettings.ide = selectedIDE.ide === 'vscode' ? 'vscode' : selectedIDE.ide // Fallback string handling
    }

    if (options.prefer) {
      defaultSettings.prefer = options.prefer
    } else if (selectedAITool) {
      defaultSettings.prefer = selectedAITool.id

      // If the selected tool has a specific mode (like cli vs plugin), we can pre-configure the providers block
      // to ensure it uses the intended mode, providing an optimal out-of-the-box experience.
      if (selectedAITool.preferredMode) {
        defaultSettings.providers = {
          [selectedAITool.id]: {
            type: selectedAITool.preferredMode,
          },
        }
      }
    }

    if (options.dryRun) {
      log.dryRun('Would create .inspecto/settings.json')
    } else {
      await writeJSON(settingsPath, defaultSettings)
      log.success('Created .inspecto/settings.json')
      mutations.push({ type: 'file_created', path: '.inspecto/settings.json' })
    }
  }

  // Generate prompts.json to disable low-frequency intents by default
  if (await exists(promptsPath)) {
    log.success('.inspecto/prompts.json already exists (skipped)')
  } else {
    const defaultPrompts = [
      { id: 'code-review', enabled: false },
      { id: 'generate-test', enabled: false },
      { id: 'performance', enabled: false },
    ]

    if (options.dryRun) {
      log.dryRun('Would create .inspecto/prompts.json')
    } else {
      await writeJSON(promptsPath, defaultPrompts)
      log.success('Created .inspecto/prompts.json (disabling low-frequency intents)')
      mutations.push({ type: 'file_created', path: '.inspecto/prompts.json' })
    }
  }

  // ---- Step 6: Update .gitignore ----
  if (!options.dryRun) {
    await updateGitignore(root, options.shared, options.dryRun)
    mutations.push({
      type: 'file_modified',
      path: '.gitignore',
      description: 'Appended .inspecto/ ignore rules',
    })
  } else {
    log.dryRun('Would update .gitignore')
  }

  // ---- Step 7: Write install.lock ----
  if (!options.dryRun && mutations.length > 0) {
    const lock: InstallLock = {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      mutations,
    }
    await writeJSON(path.join(settingsDir, 'install.lock'), lock)
  }

  // ---- Step 8: Install VS Code extension ----
  // Only attempt if IDE is VS Code or not detected (might be VS Code)
  const shouldInstallExt =
    !options.noExtension && (!selectedIDE || (selectedIDE && selectedIDE.supported))

  let manualExtensionInstallNeeded = false

  if (options.noExtension) {
    log.warn('Skipping VS Code extension (--no-extension)')
  } else if (!shouldInstallExt) {
    // Unsupported IDE detected — skip extension, already warned above
  } else {
    const extMutation = await installExtension(options.dryRun)
    if (extMutation && !options.dryRun) {
      mutations.push(extMutation)

      if (extMutation.manual_action_required) {
        manualExtensionInstallNeeded = true
      }

      const lockPath = path.join(settingsDir, 'install.lock')
      const lock = await readJSON<InstallLock>(lockPath)
      if (lock) {
        lock.mutations = mutations
        await writeJSON(lockPath, lock)
      }
    } else if (extMutation === null && !options.dryRun) {
      manualExtensionInstallNeeded = true
    }
  }

  // ---- Done ----
  if (options.dryRun) {
    log.blank()
    log.warn('Dry run complete. No files were modified.')
  } else if (installFailed || injectionFailed || manualExtensionInstallNeeded) {
    log.blank()
    log.warn('Setup completed with some manual steps required.')
    log.hint('Please check the logs above and complete the manual steps.')
    log.blank()
  } else {
    log.ready('Ready! Hold Alt + Click any element to inspect.')
  }
}
