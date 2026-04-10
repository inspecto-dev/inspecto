import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as onboardingContext from '../src/onboarding/context.js'
import * as planner from '../src/onboarding/planner.js'
import { detect } from '../src/commands/detect.js'
import { plan } from '../src/commands/plan.js'
import type { OnboardingContext } from '../src/types.js'

vi.mock('../src/onboarding/context.js', () => ({
  buildOnboardingContext: vi.fn(),
}))

describe('planner orchestration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('blocks unsupported build stacks and returns a manual action', () => {
    const context: OnboardingContext = {
      root: '/repo',
      packageManager: 'pnpm',
      buildTools: {
        supported: [],
        unsupported: ['Next.js'],
      },
      frameworks: {
        supported: ['react'],
        unsupported: [],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    }

    const result = planner.createPlanResult(context)

    expect(result.status).toBe('blocked')
    expect(result.strategy).toBe('manual')
    expect(result.blockers).toEqual([
      {
        code: 'unsupported-build-tool',
        message: 'Detected unsupported build tool(s): Next.js',
      },
    ])
    expect(result.actions).toEqual([
      {
        type: 'manual_step',
        target: 'Next.js',
        description:
          'Inspecto cannot auto-configure this build stack yet. Follow the manual setup guide for the detected framework or build tool.',
      },
    ])
    expect(result.defaults).toEqual({
      provider: 'codex',
      ide: 'vscode',
      shared: false,
      extension: true,
    })
  })

  it('blocks mixed supported and unsupported build tools instead of taking the supported auto path', () => {
    const context: OnboardingContext = {
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
        unsupported: [],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    }

    const result = planner.createPlanResult(context)

    expect(result.status).toBe('blocked')
    expect(result.strategy).toBe('manual')
    expect(result.blockers).toEqual([
      {
        code: 'unsupported-build-tool',
        message: 'Detected unsupported build tool(s): Next.js',
      },
    ])
    expect(result.actions).toEqual([
      {
        type: 'manual_step',
        target: 'Next.js',
        description:
          'Inspecto cannot auto-configure this build stack yet. Follow the manual setup guide for the detected framework or build tool.',
      },
    ])
  })

  it('blocks when no supported build tool is detected', () => {
    const context: OnboardingContext = {
      root: '/repo',
      packageManager: 'pnpm',
      buildTools: {
        supported: [],
        unsupported: [],
      },
      frameworks: {
        supported: ['react'],
        unsupported: [],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    }

    const result = planner.createPlanResult(context)

    expect(result.status).toBe('blocked')
    expect(result.strategy).toBe('manual')
    expect(result.blockers).toEqual([
      {
        code: 'missing-build-tool',
        message: 'No supported build tool detected',
      },
    ])
    expect(result.actions).toEqual([
      {
        type: 'manual_step',
        target: '/repo',
        description:
          'No supported build tool was detected. Add a supported build config before trying Inspecto again.',
      },
    ])
  })

  it('blocks on an unsupported framework and uses framework-specific manual guidance', () => {
    const context: OnboardingContext = {
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
        unsupported: [],
      },
      frameworks: {
        supported: [],
        unsupported: ['Svelte'],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    }

    const result = planner.createPlanResult(context)

    expect(result.status).toBe('blocked')
    expect(result.strategy).toBe('manual')
    expect(result.blockers).toEqual([
      {
        code: 'unsupported-framework',
        message: 'Detected unsupported framework(s): Svelte',
      },
    ])
    expect(result.actions).toEqual([
      {
        type: 'manual_step',
        target: 'Svelte',
        description:
          'Inspecto cannot auto-configure this framework yet. Follow the manual setup guide for the detected framework.',
      },
    ])
  })

  it('keeps framework findings as warnings when a supported framework and unsupported build tool are both present', () => {
    const context: OnboardingContext = {
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
    }

    const result = planner.createPlanResult(context)

    expect(result.status).toBe('blocked')
    expect(result.strategy).toBe('manual')
    expect(result.blockers).toEqual([
      {
        code: 'unsupported-build-tool',
        message: 'Detected unsupported build tool(s): Next.js',
      },
    ])
    expect(result.warnings).toEqual([
      {
        code: 'unsupported-framework-present',
        message: 'Unsupported framework(s) also detected: Svelte',
      },
    ])
    expect(result.actions).toEqual([
      {
        type: 'manual_step',
        target: 'Next.js',
        description:
          'Inspecto cannot auto-configure this build stack yet. Follow the manual setup guide for the detected framework or build tool.',
      },
    ])
  })

  it('returns supported setup actions when the stack is supported', () => {
    const context: OnboardingContext = {
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
        unsupported: [],
      },
      frameworks: {
        supported: ['react'],
        unsupported: [],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    }

    const result = planner.createPlanResult(context)

    expect(result.status).toBe('ok')
    expect(result.strategy).toBe('supported')
    expect(result.actions).toEqual([
      {
        type: 'install_dependency',
        target: '@inspecto-dev/plugin @inspecto-dev/core',
        description: 'Install the Inspecto runtime packages with pnpm.',
      },
      {
        type: 'modify_file',
        target: 'vite.config.ts',
        description: 'Inject the Inspecto plugin into Vite (vite.config.ts).',
      },
      {
        type: 'install_extension',
        target: 'vscode',
        description: 'Install the Inspecto VS Code extension.',
      },
    ])
  })

  it('returns a legacy rspack partial-manual strategy when the selected build target is legacy rspack', () => {
    const context: OnboardingContext = {
      root: '/repo/finder',
      packageManager: 'pnpm',
      buildTools: {
        supported: [
          {
            tool: 'rspack',
            configPath: 'finder/rspack-config/rspack.config.dev.ts',
            label: 'Rspack (finder/rspack-config/rspack.config.dev.ts) [Legacy]',
            packagePath: 'finder',
            isLegacyRspack: true,
          },
        ],
        unsupported: [],
      },
      frameworks: {
        supported: ['react'],
        unsupported: [],
      },
      ides: [{ ide: 'trae', supported: true }],
      providers: [{ id: 'coco', label: 'Coco CLI', supported: true, preferredMode: 'cli' }],
    }

    const result = planner.createPlanResult(context)

    expect(result.status).toBe('warning')
    expect(result.strategy).toBe('manual')
    expect(result.blockers).toEqual([])
    expect(result.warnings).toEqual([
      {
        code: 'legacy-rspack-requires-manual-config',
        message:
          'Legacy Rspack detected at finder/rspack-config/rspack.config.dev.ts. Inspecto must use the legacy Rspack plugin entry and manual config steps.',
      },
    ])
    expect(result.actions).toEqual([
      {
        type: 'install_dependency',
        target: '@inspecto-dev/plugin @inspecto-dev/core',
        description: 'Install the Inspecto runtime packages with pnpm.',
      },
      {
        type: 'manual_step',
        target: 'finder/rspack-config/rspack.config.dev.ts',
        description:
          'Update finder/rspack-config/rspack.config.dev.ts to import `rspackPlugin` from `@inspecto-dev/plugin/legacy/rspack` and add it to the Rspack plugins array.',
      },
    ])
  })

  it('returns a webpack 4 partial-manual strategy when the selected build target is legacy webpack', () => {
    const context: OnboardingContext = {
      root: '/repo/app',
      packageManager: 'pnpm',
      buildTools: {
        supported: [
          {
            tool: 'webpack',
            configPath: 'app/webpack.config.js',
            label: 'Webpack (app/webpack.config.js) [Webpack 4]',
            packagePath: 'app',
            isLegacyWebpack: true,
          },
        ],
        unsupported: [],
      },
      frameworks: {
        supported: ['react'],
        unsupported: [],
      },
      ides: [{ ide: 'cursor', supported: true }],
      providers: [{ id: 'copilot', label: 'Copilot', supported: true, preferredMode: 'extension' }],
    }

    const result = planner.createPlanResult(context)

    expect(result.status).toBe('warning')
    expect(result.strategy).toBe('manual')
    expect(result.blockers).toEqual([])
    expect(result.warnings).toEqual([
      {
        code: 'legacy-webpack4-requires-manual-config',
        message:
          'Webpack 4 detected at app/webpack.config.js. Inspecto must use the legacy Webpack 4 plugin entry and manual config steps.',
      },
    ])
    expect(result.actions).toEqual([
      {
        type: 'install_dependency',
        target: '@inspecto-dev/plugin @inspecto-dev/core',
        description: 'Install the Inspecto runtime packages with pnpm.',
      },
      {
        type: 'manual_step',
        target: 'app/webpack.config.js',
        description:
          'Update app/webpack.config.js to import `webpackPlugin` from `@inspecto-dev/plugin/legacy/webpack4` and add it to the Webpack plugins array.',
      },
    ])
  })

  it('blocks root-level apply planning when multiple supported build targets are detected', () => {
    const context: OnboardingContext = {
      root: '/repo',
      packageManager: 'pnpm',
      buildTools: {
        supported: [
          {
            tool: 'vite',
            configPath: 'apps/web/vite.config.ts',
            label: 'Vite (apps/web/vite.config.ts)',
            packagePath: 'apps/web',
          },
          {
            tool: 'webpack',
            configPath: 'apps/admin/webpack.config.js',
            label: 'Webpack (apps/admin/webpack.config.js)',
            packagePath: 'apps/admin',
          },
        ],
        unsupported: [],
      },
      frameworks: {
        supported: ['react'],
        unsupported: [],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    }

    const result = planner.createPlanResult(context)

    expect(result.status).toBe('blocked')
    expect(result.strategy).toBe('manual')
    expect(result.blockers).toEqual([
      {
        code: 'multiple-supported-build-targets',
        message:
          'Multiple supported build targets detected: apps/web, apps/admin. Run inspecto apply from a single app/package root until explicit target selection is available.',
      },
    ])
    expect(result.actions).toEqual([
      {
        type: 'manual_step',
        target: 'apps/web, apps/admin',
        description:
          'Run inspecto apply from the target app/package root. Root-level apply is blocked when multiple supported targets are detected.',
      },
    ])
  })

  it('creates a detection result from the shared onboarding context', async () => {
    vi.mocked(onboardingContext.buildOnboardingContext).mockResolvedValue({
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

    const result = await planner.createDetectionResult('/repo')

    expect(result.status).toBe('blocked')
    expect(result.project).toEqual({
      root: '/repo',
      packageManager: 'pnpm',
    })
    expect(result.environment).toEqual({
      frameworks: ['react'],
      unsupportedFrameworks: ['Svelte'],
      buildTools: [
        {
          tool: 'vite',
          configPath: 'vite.config.ts',
          label: 'Vite (vite.config.ts)',
        },
      ],
      unsupportedBuildTools: ['Next.js'],
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    })
    expect(result.blockers).toEqual([
      {
        code: 'unsupported-build-tool',
        message: 'Detected unsupported build tool(s): Next.js',
      },
    ])
    expect(result.warnings).toEqual([
      {
        code: 'unsupported-framework-present',
        message: 'Unsupported framework(s) also detected: Svelte',
      },
    ])
  })

  it('detects through the detect command in JSON mode', async () => {
    const detectionResult = {
      status: 'blocked',
      warnings: [{ code: 'w1', message: 'warn' }],
      blockers: [{ code: 'b1', message: 'block' }],
      project: { root: '/repo', packageManager: 'pnpm' },
      environment: {
        frameworks: ['react'],
        unsupportedFrameworks: ['Svelte'],
        buildTools: [],
        unsupportedBuildTools: ['Next.js'],
        ides: [{ ide: 'vscode', supported: true }],
        providers: [{ id: 'codex', label: 'Codex CLI', supported: true }],
      },
    }

    const detectSpy = vi
      .spyOn(planner, 'createDetectionResult')
      .mockResolvedValue(detectionResult as never)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/repo')

    const result = await detect(true)

    expect(detectSpy).toHaveBeenCalledWith('/repo')
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(detectionResult, null, 2))
    expect(result).toEqual(detectionResult)

    cwdSpy.mockRestore()
    logSpy.mockRestore()
    detectSpy.mockRestore()
  })

  it('prints unsupported environment findings only once in plain-text detect mode', async () => {
    const detectionResult = {
      status: 'blocked',
      warnings: [
        {
          code: 'unsupported-framework-present',
          message: 'Unsupported framework(s) also detected: Svelte',
        },
      ],
      blockers: [
        {
          code: 'unsupported-build-tool',
          message: 'Detected unsupported build tool(s): Next.js',
        },
        {
          code: 'unsupported-framework',
          message: 'Detected unsupported framework(s): Svelte',
        },
      ],
      project: { root: '/repo', packageManager: 'pnpm' },
      environment: {
        frameworks: ['react'],
        unsupportedFrameworks: ['Svelte'],
        buildTools: [],
        unsupportedBuildTools: ['Next.js'],
        ides: [{ ide: 'vscode', supported: true }],
        providers: [{ id: 'codex', label: 'Codex CLI', supported: true }],
      },
    }

    const detectSpy = vi
      .spyOn(planner, 'createDetectionResult')
      .mockResolvedValue(detectionResult as never)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/repo')

    await detect(false)

    const output = logSpy.mock.calls.map(call => call.join(' ')).join('\n')

    expect(detectSpy).toHaveBeenCalledWith('/repo')
    expect(output).toContain('Unsupported frameworks: Svelte')
    expect(output).toContain('Unsupported build tools: Next.js')
    expect(output).not.toContain('Detected unsupported framework(s): Svelte')
    expect(output).not.toContain('Detected unsupported build tool(s): Next.js')
    expect(output.match(/Unsupported frameworks: Svelte/g)).toHaveLength(1)
    expect(output.match(/Unsupported build tools: Next.js/g)).toHaveLength(1)
    expect(output.match(/Svelte/g)).toHaveLength(1)

    cwdSpy.mockRestore()
    logSpy.mockRestore()
    detectSpy.mockRestore()
  })

  it('plans through the plan command in JSON mode', async () => {
    const context: OnboardingContext = {
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
        unsupported: [],
      },
      frameworks: {
        supported: ['react'],
        unsupported: [],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    }

    const planResult = {
      status: 'ok',
      warnings: [],
      blockers: [],
      strategy: 'supported',
      actions: [
        {
          type: 'install_dependency',
          target: '@inspecto-dev/plugin @inspecto-dev/core',
          description: 'Install the Inspecto runtime packages with pnpm.',
        },
      ],
      defaults: {
        provider: 'codex',
        ide: 'vscode',
        shared: false,
        extension: true,
      },
    }

    const buildContextSpy = vi
      .spyOn(onboardingContext, 'buildOnboardingContext')
      .mockResolvedValue(context)
    const planSpy = vi.spyOn(planner, 'createPlanResult').mockReturnValue(planResult as never)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/repo')

    const result = await plan(true)

    expect(buildContextSpy).toHaveBeenCalledWith('/repo')
    expect(planSpy).toHaveBeenCalledWith(context)
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(planResult, null, 2))
    expect(result).toEqual(planResult)

    cwdSpy.mockRestore()
    logSpy.mockRestore()
    planSpy.mockRestore()
    buildContextSpy.mockRestore()
  })

  it('prints a representative supported plan in plain text without duplicating status or action details', async () => {
    const context: OnboardingContext = {
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
        unsupported: [],
      },
      frameworks: {
        supported: ['react'],
        unsupported: [],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    }

    const planResult = {
      status: 'ok',
      warnings: [],
      blockers: [],
      strategy: 'supported',
      actions: [
        {
          type: 'install_dependency',
          target: '@inspecto-dev/plugin @inspecto-dev/core',
          description: 'Install the Inspecto runtime packages with pnpm.',
        },
        {
          type: 'modify_file',
          target: 'vite.config.ts',
          description: 'Inject the Inspecto plugin into Vite (vite.config.ts).',
        },
        {
          type: 'install_extension',
          target: 'vscode',
          description: 'Install the Inspecto VS Code extension.',
        },
      ],
      defaults: {
        provider: 'codex',
        ide: 'vscode',
        shared: false,
        extension: true,
      },
    }

    const buildContextSpy = vi
      .spyOn(onboardingContext, 'buildOnboardingContext')
      .mockResolvedValue(context)
    const planSpy = vi.spyOn(planner, 'createPlanResult').mockReturnValue(planResult as never)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/repo')

    await plan(false)

    const output = logSpy.mock.calls.map(call => call.join(' ')).join('\n')

    expect(buildContextSpy).toHaveBeenCalledWith('/repo')
    expect(planSpy).toHaveBeenCalledWith(context)
    expect(output).toContain('Status: ok')
    expect(output).toContain('Strategy: supported')
    expect(output).toContain('Default provider: codex')
    expect(output).toContain('Default IDE: vscode')
    expect(output).toContain('Shared mode: disabled')
    expect(output).toContain('Extension mode: enabled')
    expect(output).toContain('Actions:')
    expect(output).toContain('install_dependency: @inspecto-dev/plugin @inspecto-dev/core')
    expect(output).toContain('modify_file: vite.config.ts')
    expect(output).toContain('install_extension: vscode')
    expect(output).toContain('Install the Inspecto runtime packages with pnpm.')
    expect(output).toContain('Inject the Inspecto plugin into Vite (vite.config.ts).')
    expect(output).toContain('Install the Inspecto VS Code extension.')
    expect(output).not.toContain('Detected unsupported')
    expect(output.match(/Status: ok/g)).toHaveLength(1)
    expect(output.match(/Strategy: supported/g)).toHaveLength(1)

    cwdSpy.mockRestore()
    logSpy.mockRestore()
    planSpy.mockRestore()
    buildContextSpy.mockRestore()
  })
})

describe('cli entrypoint wiring', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('registers and dispatches detect, plan, and apply commands', async () => {
    const doctorCommand = vi.fn().mockResolvedValue(undefined)
    const detectCommand = vi.fn().mockResolvedValue(undefined)
    const planCommand = vi.fn().mockResolvedValue(undefined)
    const applyCommand = vi.fn().mockResolvedValue(undefined)

    vi.doMock('../src/commands/init.js', () => ({ init: vi.fn() }))
    vi.doMock('../src/commands/doctor.js', () => ({ doctor: doctorCommand }))
    vi.doMock('../src/commands/teardown.js', () => ({ teardown: vi.fn() }))
    vi.doMock('../src/commands/detect.js', () => ({ detect: detectCommand }))
    vi.doMock('../src/commands/plan.js', () => ({ plan: planCommand }))
    vi.doMock('../src/commands/apply.js', () => ({ apply: applyCommand }))

    const { createCli, runCli } = await import('../src/bin.js')
    const cli = createCli()
    const commandNames = (cli as { commands: Array<{ rawName: string }> }).commands.map(command =>
      command.rawName.replace(/\s.*$/, ''),
    )

    expect(commandNames).toEqual(
      expect.arrayContaining(['init', 'doctor', 'teardown', 'detect', 'plan', 'apply']),
    )

    await runCli(['node', 'inspecto', 'doctor', '--json'])
    await runCli(['node', 'inspecto', 'detect', '--json'])
    await runCli(['node', 'inspecto', 'plan', '--json'])
    await runCli(['node', 'inspecto', 'apply', '--json'])

    expect(doctorCommand).toHaveBeenCalledWith({ json: true })
    expect(detectCommand).toHaveBeenCalledWith(true)
    expect(planCommand).toHaveBeenCalledWith(true)
    expect(applyCommand).toHaveBeenCalledWith({ json: true })
  })

  it('forwards parsed apply flags without relying on raw argv checks', async () => {
    const applyCommand = vi.fn().mockResolvedValue(undefined)

    vi.doMock('../src/commands/init.js', () => ({ init: vi.fn() }))
    vi.doMock('../src/commands/doctor.js', () => ({ doctor: vi.fn() }))
    vi.doMock('../src/commands/teardown.js', () => ({ teardown: vi.fn() }))
    vi.doMock('../src/commands/detect.js', () => ({ detect: vi.fn() }))
    vi.doMock('../src/commands/plan.js', () => ({ plan: vi.fn() }))
    vi.doMock('../src/commands/apply.js', () => ({ apply: applyCommand }))

    const { runCli } = await import('../src/bin.js')

    await runCli([
      'node',
      'inspecto',
      'apply',
      '--shared',
      '--skip-install',
      '--dry-run',
      '--no-extension',
    ])

    expect(applyCommand).toHaveBeenCalledWith({
      json: false,
      shared: true,
      skipInstall: true,
      dryRun: true,
      noExtension: true,
    })
  })

  it('emits JSON-safe errors for json commands on failure', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as (code?: string | number | null | undefined) => never)

    vi.doMock('../src/commands/init.js', () => ({ init: vi.fn() }))
    vi.doMock('../src/commands/doctor.js', () => ({ doctor: vi.fn() }))
    vi.doMock('../src/commands/teardown.js', () => ({ teardown: vi.fn() }))
    vi.doMock('../src/commands/detect.js', () => ({ detect: vi.fn() }))
    vi.doMock('../src/commands/plan.js', () => ({ plan: vi.fn() }))
    vi.doMock('../src/commands/apply.js', () => ({ apply: vi.fn() }))

    const { runCli } = await import('../src/bin.js')

    await runCli(['node', 'inspecto', 'apply', '--json', '--wat'])

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(consoleErrorSpy.mock.calls[0]?.[0]))).toMatchObject({
      status: 'error',
      error: {
        message: expect.stringContaining('--wat'),
      },
    })
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })
})
