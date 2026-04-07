import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildOnboardingContext } from '../src/onboarding/context.js'
import * as buildToolDetector from '../src/detect/build-tool.js'
import * as frameworkDetector from '../src/detect/framework.js'
import * as ideDetector from '../src/detect/ide.js'
import * as packageManagerDetector from '../src/detect/package-manager.js'
import * as providerDetector from '../src/detect/provider.js'

vi.mock('../src/detect/build-tool.js', () => ({
  detectBuildTools: vi.fn(),
}))

vi.mock('../src/detect/framework.js', () => ({
  detectFrameworks: vi.fn(),
}))

vi.mock('../src/detect/ide.js', () => ({
  detectIDE: vi.fn(),
}))

vi.mock('../src/detect/package-manager.js', () => ({
  detectPackageManager: vi.fn(),
}))

vi.mock('../src/detect/provider.js', () => ({
  detectProviders: vi.fn(),
}))

describe('buildOnboardingContext', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('normalizes detector output into a shared onboarding context', async () => {
    vi.mocked(packageManagerDetector.detectPackageManager).mockResolvedValue('pnpm')
    vi.mocked(buildToolDetector.detectBuildTools).mockResolvedValue({
      supported: [
        {
          tool: 'vite',
          configPath: 'vite.config.ts',
          label: 'Vite (vite.config.ts)',
        },
      ],
      unsupported: ['Next.js'],
    })
    vi.mocked(frameworkDetector.detectFrameworks).mockResolvedValue({
      supported: ['react'],
      unsupported: [{ name: 'Svelte', dep: 'svelte' }],
    })
    vi.mocked(ideDetector.detectIDE).mockResolvedValue({
      detected: [{ ide: 'vscode', supported: true }],
    })
    vi.mocked(providerDetector.detectProviders).mockResolvedValue({
      detected: [
        {
          id: 'codex',
          label: 'Codex CLI',
          supported: true,
          providerModes: ['cli'],
          preferredMode: 'cli',
        },
      ],
    })

    const result = await buildOnboardingContext('/repo')

    expect(result).toEqual({
      root: '/repo',
      packageManager: 'pnpm',
      buildTools: {
        supported: [
          {
            tool: 'vite',
            configPath: 'vite.config.ts',
            label: 'Vite (vite.config.ts)',
          },
        ],
        unsupported: ['Next.js'],
      },
      frameworks: {
        supported: ['react'],
        unsupported: ['Svelte'],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    })

    expect(packageManagerDetector.detectPackageManager).toHaveBeenCalledWith('/repo')
    expect(buildToolDetector.detectBuildTools).toHaveBeenCalledWith('/repo')
    expect(frameworkDetector.detectFrameworks).toHaveBeenCalledWith('/repo')
    expect(ideDetector.detectIDE).toHaveBeenCalledWith('/repo')
    expect(providerDetector.detectProviders).toHaveBeenCalledWith('/repo')
  })
})
