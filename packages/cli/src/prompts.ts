import prompts from 'prompts'
import { log } from './utils/logger.js'
import type { ProviderDetection } from './detect/provider.js'
import type { BuildToolDetection } from './types.js'

/**
 * Interactive prompt for IDE choice.
 */
export async function promptIDEChoice(
  detections: { ide: string; supported: boolean }[],
): Promise<{ ide: string; supported: boolean } | null> {
  if (!process.stdin.isTTY) {
    log.warn('Multiple IDEs detected but stdin is not interactive')
    log.hint(`Using: ${detections[0]!.ide} (first match)`)
    return detections[0]!
  }

  const { choice } = await prompts({
    type: 'select',
    name: 'choice',
    message: 'Detected multiple IDEs, please choose one:',
    choices: detections.map((d, i) => ({
      title: `${d.ide} ${d.supported ? '(supported)' : '(unsupported/limited)'}`,
      value: i,
    })),
  })

  if (choice === undefined) return null
  return detections[choice]!
}

/**
 * Interactive prompt for AI tool choice.
 */
export async function promptProviderChoice(
  detections: ProviderDetection[],
): Promise<ProviderDetection | null> {
  if (!process.stdin.isTTY) {
    log.warn('Multiple AI tools detected but stdin is not interactive')
    log.hint(`Using: ${detections[0]!.label} (first match)`)
    return detections[0]!
  }

  const { choice } = await prompts({
    type: 'select',
    name: 'choice',
    message: 'Detected multiple providers, please choose one:',
    choices: detections
      .map((d, i) => {
        const modeLabels = d.providerModes.map(mode =>
          mode === 'extension' ? 'VS Code Extension' : 'Terminal CLI',
        )
        const modeStr = modeLabels.join(' & ')
        return {
          title: `${d.label} ${d.supported ? `(supported ${modeStr})` : '(unsupported/limited)'}`,
          value: i,
        }
      })
      .concat({ title: 'Skip (configure later)', value: -1 }),
  })

  if (choice === undefined || choice === -1) return null
  return detections[choice]!
}

/**
 * Interactive prompt for Build Tool Config choice.
 */
export async function promptConfigChoice(
  detections: BuildToolDetection[],
): Promise<BuildToolDetection | null> {
  if (!process.stdin.isTTY) {
    log.warn('Multiple config files detected but stdin is not interactive')
    log.hint(`Using: ${detections[0]!.label} (first match)`)
    return detections[0]!
  }

  const choices = detections.map((d, i) => ({
    title: d.label,
    value: i,
  }))

  choices.push({
    title: "Skip (I'll configure manually)",
    value: -1,
  })

  const { choice } = await prompts({
    type: 'select',
    name: 'choice',
    message: 'Detected multiple build tool configs, please choose one to inject:',
    choices,
  })

  if (choice === undefined || choice === -1) return null
  return detections[choice]!
}

/**
 * Interactive prompt for choosing the target app when init is run from a monorepo root.
 */
export async function promptMonorepoPackageChoice(
  detections: BuildToolDetection[],
): Promise<string | null> {
  const uniquePackages = Array.from(
    new Map(
      detections
        .filter((d): d is BuildToolDetection & { packagePath: string } => !!d.packagePath)
        .map(d => [d.packagePath, d]),
    ).values(),
  )

  if (uniquePackages.length === 0) {
    return null
  }

  if (!process.stdin.isTTY) {
    log.error('Monorepo root detected, but stdin is not interactive.')
    log.hint(
      'Re-run `inspecto init` inside a specific app directory, or pass --packages <app-path>.',
    )
    return null
  }

  const { choice } = await prompts({
    type: 'select',
    name: 'choice',
    message: 'Monorepo root detected. Choose the app to initialize:',
    choices: uniquePackages.map((d, i) => ({
      title: `${d.packagePath} (${d.tool})`,
      description: d.configPath,
      value: i,
    })),
  })

  if (choice === undefined) return null
  return uniquePackages[choice]!.packagePath
}

/**
 * Interactive prompt for continuing with unsupported frameworks.
 */
export async function promptUnsupportedFrameworkContinue(): Promise<boolean> {
  if (!process.stdin.isTTY) {
    log.error('Unsupported framework detected in non-interactive environment.')
    log.hint('Use --force to skip this check and continue anyway.')
    return false
  }

  const { confirm } = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: 'Inspecto may not work properly. Do you want to continue anyway?',
    initial: false,
  })

  return !!confirm
}
