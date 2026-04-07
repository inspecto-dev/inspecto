import { detectBuildTools } from '../detect/build-tool.js'
import { detectFrameworks } from '../detect/framework.js'
import { detectIDE } from '../detect/ide.js'
import { detectPackageManager } from '../detect/package-manager.js'
import { detectProviders } from '../detect/provider.js'
import type { OnboardingContext } from '../types.js'

export async function buildOnboardingContext(root: string): Promise<OnboardingContext> {
  const [packageManager, buildTools, frameworks, ides, providers] = await Promise.all([
    detectPackageManager(root),
    detectBuildTools(root),
    detectFrameworks(root),
    detectIDE(root),
    detectProviders(root),
  ])

  return {
    root,
    packageManager,
    buildTools: {
      supported: buildTools.supported,
      unsupported: buildTools.unsupported,
    },
    frameworks: {
      supported: frameworks.supported,
      unsupported: frameworks.unsupported.map(item => item.name),
    },
    ides: ides.detected.map(({ ide, supported }) => ({ ide, supported })),
    providers: providers.detected.map(({ id, label, supported, preferredMode }) => ({
      id,
      label,
      supported,
      preferredMode,
    })),
  }
}
