import { buildOnboardingContext } from './context.js'
import type {
  CommandMessage,
  CommandStatus,
  DetectionResult,
  OnboardingContext,
  PlanResult,
} from '../types.js'

function message(code: string, message: string): CommandMessage {
  return { code, message }
}

function uniqueMessages(messages: CommandMessage[]): CommandMessage[] {
  const seen = new Set<string>()
  return messages.filter(item => {
    const key = `${item.code}:${item.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function detectionStatus(warnings: CommandMessage[], blockers: CommandMessage[]): CommandStatus {
  if (blockers.length > 0) return 'blocked'
  if (warnings.length > 0) return 'warning'
  return 'ok'
}

function planStatus(warnings: CommandMessage[], blockers: CommandMessage[]): CommandStatus {
  if (blockers.length > 0) return 'blocked'
  if (warnings.length > 0) return 'warning'
  return 'ok'
}

function supportedIde(context: OnboardingContext): string | undefined {
  return context.ides.find(ide => ide.supported)?.ide
}

function supportedProvider(context: OnboardingContext): string | undefined {
  return context.providers.find(provider => provider.supported)?.id
}

function buildToolBlockers(context: OnboardingContext): CommandMessage[] {
  if (context.buildTools.unsupported.length > 0) {
    return [
      message(
        'unsupported-build-tool',
        `Detected unsupported build tool(s): ${context.buildTools.unsupported.join(', ')}`,
      ),
    ]
  }

  if (context.buildTools.supported.length > 0) {
    if (context.buildTools.supported.length === 1) {
      return []
    }

    const targets = context.buildTools.supported
      .map(target => target.packagePath ?? target.configPath)
      .join(', ')

    return [
      message(
        'multiple-supported-build-targets',
        `Multiple supported build targets detected: ${targets}. Run inspecto apply from a single app/package root until explicit target selection is available.`,
      ),
    ]
  }

  return [message('missing-build-tool', 'No supported build tool detected')]
}

function buildToolWarnings(context: OnboardingContext): CommandMessage[] {
  const warnings: CommandMessage[] = []

  if (context.buildTools.supported.length === 1) {
    const buildTool = context.buildTools.supported[0]!
    if (buildTool.tool === 'rspack' && buildTool.isLegacyRspack) {
      warnings.push(
        message(
          'legacy-rspack-requires-manual-config',
          `Legacy Rspack detected at ${buildTool.configPath}. Inspecto must use the legacy Rspack plugin entry and manual config steps.`,
        ),
      )
    } else if (buildTool.tool === 'webpack' && buildTool.isLegacyWebpack) {
      warnings.push(
        message(
          'legacy-webpack4-requires-manual-config',
          `Webpack 4 detected at ${buildTool.configPath}. Inspecto must use the legacy Webpack 4 plugin entry and manual config steps.`,
        ),
      )
    }
  }

  return warnings
}

function frameworkBlockers(context: OnboardingContext): CommandMessage[] {
  if (context.frameworks.supported.length > 0) {
    return []
  }

  if (context.frameworks.unsupported.length > 0) {
    return [
      message(
        'unsupported-framework',
        `Detected unsupported framework(s): ${context.frameworks.unsupported.join(', ')}`,
      ),
    ]
  }

  return [message('missing-framework', 'No supported frontend framework detected')]
}

function unsupportedEnvironmentWarnings(context: OnboardingContext): CommandMessage[] {
  const warnings: CommandMessage[] = []

  if (context.frameworks.unsupported.length > 0 && context.frameworks.supported.length > 0) {
    warnings.push(
      message(
        'unsupported-framework-present',
        `Unsupported framework(s) also detected: ${context.frameworks.unsupported.join(', ')}`,
      ),
    )
  }

  const unsupportedIdes = context.ides.filter(ide => !ide.supported).map(ide => ide.ide)
  if (unsupportedIdes.length > 0) {
    warnings.push(
      message('unsupported-ide', `Unsupported IDE(s) detected: ${unsupportedIdes.join(', ')}`),
    )
  }

  const unsupportedProviders = context.providers
    .filter(provider => !provider.supported)
    .map(provider => provider.label)
  if (unsupportedProviders.length > 0) {
    warnings.push(
      message(
        'unsupported-provider',
        `Unsupported provider(s) detected: ${unsupportedProviders.join(', ')}`,
      ),
    )
  }

  return warnings
}

function manualBuildToolActions(context: OnboardingContext): PlanResult['actions'] {
  if (context.buildTools.unsupported.length > 0) {
    return [
      {
        type: 'manual_step',
        target: context.buildTools.unsupported.join(', '),
        description:
          'Inspecto cannot auto-configure this build stack yet. Follow the manual setup guide for the detected framework or build tool.',
      },
    ]
  }

  if (context.buildTools.supported.length > 1) {
    const targets = context.buildTools.supported
      .map(target => target.packagePath ?? target.configPath)
      .join(', ')

    return [
      {
        type: 'manual_step',
        target: targets,
        description:
          'Run inspecto apply from the target app/package root. Root-level apply is blocked when multiple supported targets are detected.',
      },
    ]
  }

  const buildTool = context.buildTools.supported[0]
  if (buildTool?.tool === 'rspack' && buildTool.isLegacyRspack) {
    return [
      {
        type: 'install_dependency',
        target: '@inspecto-dev/plugin @inspecto-dev/core',
        description: `Install the Inspecto runtime packages with ${context.packageManager}.`,
      },
      {
        type: 'manual_step',
        target: buildTool.configPath,
        description: `Update ${buildTool.configPath} to import \`rspackPlugin\` from \`@inspecto-dev/plugin/legacy/rspack\` and add it to the Rspack plugins array.`,
      },
    ]
  }
  if (buildTool?.tool === 'webpack' && buildTool.isLegacyWebpack) {
    return [
      {
        type: 'install_dependency',
        target: '@inspecto-dev/plugin @inspecto-dev/core',
        description: `Install the Inspecto runtime packages with ${context.packageManager}.`,
      },
      {
        type: 'manual_step',
        target: buildTool.configPath,
        description: `Update ${buildTool.configPath} to import \`webpackPlugin\` from \`@inspecto-dev/plugin/legacy/webpack4\` and add it to the Webpack plugins array.`,
      },
    ]
  }

  return [
    {
      type: 'manual_step',
      target: context.root,
      description:
        'No supported build tool was detected. Add a supported build config before trying Inspecto again.',
    },
  ]
}

function manualFrameworkActions(context: OnboardingContext): PlanResult['actions'] {
  if (context.frameworks.unsupported.length > 0) {
    return [
      {
        type: 'manual_step',
        target: context.frameworks.unsupported.join(', '),
        description:
          'Inspecto cannot auto-configure this framework yet. Follow the manual setup guide for the detected framework.',
      },
    ]
  }

  return [
    {
      type: 'manual_step',
      target: context.root,
      description:
        'No supported frontend framework was detected. Add a supported React or Vue app before trying Inspecto again.',
    },
  ]
}

export async function createDetectionResult(root: string): Promise<DetectionResult> {
  const context = await buildOnboardingContext(root)
  const warnings = uniqueMessages([
    ...unsupportedEnvironmentWarnings(context),
    ...buildToolWarnings(context),
  ])

  const buildToolResult = buildToolBlockers(context)
  const frameworkResult = frameworkBlockers(context)
  const blockers = uniqueMessages([...buildToolResult, ...frameworkResult])

  return {
    status: detectionStatus(warnings, blockers),
    warnings,
    blockers,
    project: {
      root: context.root,
      packageManager: context.packageManager,
    },
    environment: {
      frameworks: context.frameworks.supported,
      unsupportedFrameworks: context.frameworks.unsupported,
      buildTools: context.buildTools.supported,
      unsupportedBuildTools: context.buildTools.unsupported,
      ides: context.ides,
      providers: context.providers,
    },
  }
}

export function createPlanResult(context: OnboardingContext): PlanResult {
  const warnings = uniqueMessages([
    ...unsupportedEnvironmentWarnings(context),
    ...buildToolWarnings(context),
  ])
  const blockers = uniqueMessages([...buildToolBlockers(context), ...frameworkBlockers(context)])
  const actions: PlanResult['actions'] = []

  let strategy: PlanResult['strategy'] = 'supported'

  const hasLegacyRspackManualPlan =
    context.buildTools.supported.length === 1 &&
    context.buildTools.supported[0]?.tool === 'rspack' &&
    context.buildTools.supported[0]?.isLegacyRspack
  const hasLegacyWebpackManualPlan =
    context.buildTools.supported.length === 1 &&
    context.buildTools.supported[0]?.tool === 'webpack' &&
    context.buildTools.supported[0]?.isLegacyWebpack

  if (blockers.length > 0 || hasLegacyRspackManualPlan || hasLegacyWebpackManualPlan) {
    strategy = 'manual'
    if (
      context.buildTools.unsupported.length > 0 ||
      context.buildTools.supported.length === 0 ||
      context.buildTools.supported.length > 1 ||
      context.buildTools.supported.some(
        buildTool => buildTool.tool === 'rspack' && buildTool.isLegacyRspack,
      ) ||
      context.buildTools.supported.some(
        buildTool => buildTool.tool === 'webpack' && buildTool.isLegacyWebpack,
      )
    ) {
      actions.push(...manualBuildToolActions(context))
    }
    if (frameworkBlockers(context).length > 0) {
      actions.push(...manualFrameworkActions(context))
    }
  } else {
    actions.push({
      type: 'install_dependency',
      target: '@inspecto-dev/plugin @inspecto-dev/core',
      description: `Install the Inspecto runtime packages with ${context.packageManager}.`,
    })

    for (const buildTool of context.buildTools.supported) {
      actions.push({
        type: 'modify_file',
        target: buildTool.configPath,
        description: `Inject the Inspecto plugin into ${buildTool.label}.`,
      })
    }

    const ide = supportedIde(context)
    if (ide === 'vscode') {
      actions.push({
        type: 'install_extension',
        target: 'vscode',
        description: 'Install the Inspecto VS Code extension.',
      })
    }
  }

  const defaults: PlanResult['defaults'] = {
    shared: false,
    extension: supportedIde(context) === 'vscode',
  }

  const provider = supportedProvider(context)
  if (provider) {
    defaults.provider = provider
  }

  const ide = supportedIde(context)
  if (ide) {
    defaults.ide = ide
  }

  return {
    status: planStatus(warnings, blockers),
    warnings,
    blockers,
    strategy,
    actions,
    defaults,
  }
}

export function planManualFollowUp(result: PlanResult): string[] {
  return result.actions
    .filter(action => action.type === 'manual_step')
    .map(action => action.description)
}
