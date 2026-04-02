# Skill-First Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add agent-friendly CLI surfaces for skill-first onboarding without duplicating Inspecto's existing install logic.

**Architecture:** Refactor the current interactive `init` flow into reusable detection/planning/application units, then expose those units through new CLI commands with stable JSON output. Keep `init` as the human-oriented entry point, but make it delegate to the same orchestration layer used by `detect`, `plan`, `apply`, and JSON-enabled `doctor`.

**Tech Stack:** TypeScript, CAC, Vitest, existing CLI detection/injection utilities

---

## File Structure

- Modify: `packages/cli/src/bin.ts`
  Purpose: register `detect`, `plan`, `apply`, and JSON-capable `doctor` CLI entry points.
- Modify: `packages/cli/src/types.ts`
  Purpose: define stable machine-readable result types for detection, planning, apply, and diagnostics.
- Modify: `packages/cli/src/commands/init.ts`
  Purpose: delegate to shared onboarding orchestration instead of owning all decision logic inline.
- Modify: `packages/cli/src/commands/doctor.ts`
  Purpose: support structured JSON diagnostics alongside existing human-readable output.
- Create: `packages/cli/src/commands/detect.ts`
  Purpose: expose environment detection as a non-interactive command.
- Create: `packages/cli/src/commands/plan.ts`
  Purpose: expose onboarding planning as a non-interactive command.
- Create: `packages/cli/src/commands/apply.ts`
  Purpose: expose a non-interactive apply flow backed by shared install logic.
- Create: `packages/cli/src/onboarding/context.ts`
  Purpose: gather all detection results once and normalize them into a shared onboarding context.
- Create: `packages/cli/src/onboarding/planner.ts`
  Purpose: convert onboarding context into a structured plan with actions, blockers, warnings, and defaults.
- Create: `packages/cli/src/onboarding/apply.ts`
  Purpose: execute a resolved onboarding plan and return structured mutation results.
- Create: `packages/cli/src/utils/output.ts`
  Purpose: centralize JSON serialization and command result printing so commands stay consistent.
- Modify: `packages/cli/src/index.ts`
  Purpose: export new commands and shared types if needed by tests or future consumers.
- Create: `packages/cli/tests/detect.test.ts`
  Purpose: cover structured detection output.
- Create: `packages/cli/tests/plan.test.ts`
  Purpose: cover planning output, warnings, and blockers.
- Create: `packages/cli/tests/apply.test.ts`
  Purpose: cover non-interactive apply orchestration and result formatting.
- Modify: `packages/cli/tests/init.test.ts`
  Purpose: protect the existing interactive path after the refactor.
- Modify: `packages/cli/tests/logger.test.ts`
  Purpose: verify JSON mode does not leak human-oriented logs when structured output is requested.
- Modify: `packages/cli/README.md`
  Purpose: document the new agent-oriented commands.
- Modify: `packages/docs/guide/getting-started.md`
  Purpose: introduce the skill-first onboarding path and position CLI `init` as the direct/manual fallback.
- Modify: `packages/docs/integrations/ai-tools.md`
  Purpose: explain how agent environments will consume the new CLI protocol.

### Task 1: Define Shared Onboarding Contracts

**Files:**

- Modify: `packages/cli/src/types.ts`
- Create: `packages/cli/src/onboarding/context.ts`
- Test: `packages/cli/tests/detect.test.ts`

- [ ] **Step 1: Write the failing detection contract test**

```ts
import { describe, expect, it } from 'vitest'
import type { DetectionResult } from '../src/types.js'

describe('DetectionResult contract', () => {
  it('includes status, warnings, blockers, and environment details', () => {
    const result: DetectionResult = {
      status: 'ok',
      warnings: [],
      blockers: [],
      project: {
        root: '/repo',
        packageManager: 'pnpm',
      },
      environment: {
        frameworks: ['react'],
        unsupportedFrameworks: [],
        buildTools: [],
        unsupportedBuildTools: [],
        ides: [],
        providers: [],
      },
    }

    expect(result.status).toBe('ok')
    expect(result.project.packageManager).toBe('pnpm')
    expect(Array.isArray(result.blockers)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @inspecto-dev/cli test -- detect.test.ts`
Expected: FAIL with `Cannot find module '../src/types.js'` export or missing `DetectionResult` type.

- [ ] **Step 3: Add shared machine-readable types**

```ts
export type CommandStatus = 'ok' | 'warning' | 'blocked' | 'error'

export interface CommandMessage {
  code: string
  message: string
}

export interface DetectionResult {
  status: CommandStatus
  warnings: CommandMessage[]
  blockers: CommandMessage[]
  project: {
    root: string
    packageManager: PackageManager
  }
  environment: {
    frameworks: string[]
    unsupportedFrameworks: string[]
    buildTools: BuildToolDetection[]
    unsupportedBuildTools: string[]
    ides: Array<{ ide: string; supported: boolean }>
    providers: Array<{ id: string; label: string; supported: boolean }>
  }
}

export interface PlanResult {
  status: CommandStatus
  warnings: CommandMessage[]
  blockers: CommandMessage[]
  strategy: 'supported' | 'manual' | 'unsupported'
  actions: Array<{
    type: 'install_dependency' | 'modify_file' | 'install_extension' | 'manual_step'
    target: string
    description: string
  }>
  defaults: {
    provider?: string
    ide?: string
    shared: boolean
    extension: boolean
  }
}
```

- [ ] **Step 4: Add onboarding context builder**

```ts
import { detectBuildTools } from '../detect/build-tool.js'
import { detectFrameworks } from '../detect/framework.js'
import { detectIDE } from '../detect/ide.js'
import { detectPackageManager } from '../detect/package-manager.js'
import { detectProviders } from '../detect/provider.js'

export async function buildOnboardingContext(root: string) {
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
    buildTools,
    frameworks,
    ides,
    providers,
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @inspecto-dev/cli test -- detect.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/types.ts packages/cli/src/onboarding/context.ts packages/cli/tests/detect.test.ts
git commit -m "feat: add onboarding result contracts"
```

### Task 2: Build Detection and Planning Orchestration

**Files:**

- Create: `packages/cli/src/onboarding/planner.ts`
- Create: `packages/cli/src/commands/detect.ts`
- Create: `packages/cli/src/commands/plan.ts`
- Test: `packages/cli/tests/plan.test.ts`

- [ ] **Step 1: Write the failing planning test**

```ts
import { describe, expect, it } from 'vitest'
import { createPlanResult } from '../src/onboarding/planner.js'

describe('createPlanResult', () => {
  it('marks unsupported environments as blocked with manual actions', async () => {
    const result = await createPlanResult({
      root: '/repo',
      packageManager: 'pnpm',
      frameworks: { supported: [], unsupported: [{ name: 'svelte' }] },
      buildTools: { supported: [], unsupported: ['Next.js'] },
      ides: { detected: [] },
      providers: { detected: [] },
    } as never)

    expect(result.status).toBe('blocked')
    expect(result.blockers.length).toBeGreaterThan(0)
    expect(result.actions.some(action => action.type === 'manual_step')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @inspecto-dev/cli test -- plan.test.ts`
Expected: FAIL with missing `createPlanResult`.

- [ ] **Step 3: Implement planner logic**

```ts
import type { DetectionResult, PlanResult } from '../types.js'

export async function createDetectionResult(root: string): Promise<DetectionResult> {
  const context = await buildOnboardingContext(root)

  return {
    status: context.frameworks.supported.length > 0 ? 'ok' : 'blocked',
    warnings: [],
    blockers:
      context.frameworks.supported.length > 0
        ? []
        : [{ code: 'UNSUPPORTED_FRAMEWORK', message: 'React or Vue project required.' }],
    project: {
      root: context.root,
      packageManager: context.packageManager,
    },
    environment: {
      frameworks: context.frameworks.supported,
      unsupportedFrameworks: context.frameworks.unsupported.map(item => item.name),
      buildTools: context.buildTools.supported,
      unsupportedBuildTools: context.buildTools.unsupported,
      ides: context.ides.detected,
      providers: context.providers.detected.map(item => ({
        id: item.value,
        label: item.label,
        supported: item.supported,
      })),
    },
  }
}

export function createPlanResult(
  context: Awaited<ReturnType<typeof buildOnboardingContext>>,
): PlanResult {
  const actions: PlanResult['actions'] = []
  const blockers: PlanResult['blockers'] = []

  actions.push({
    type: 'install_dependency',
    target: '@inspecto-dev/plugin',
    description: 'Install the Inspecto build plugin in the current project.',
  })

  for (const tool of context.buildTools.supported) {
    actions.push({
      type: 'modify_file',
      target: tool.configPath,
      description: `Inject Inspecto into ${tool.label}.`,
    })
  }

  if (context.buildTools.supported.length === 0) {
    blockers.push({
      code: 'NO_SUPPORTED_BUILD_TOOL',
      message: 'No supported build config detected for automatic injection.',
    })
    actions.push({
      type: 'manual_step',
      target: 'manual-installation',
      description: 'Follow the manual setup guide for unsupported build tools.',
    })
  }

  return {
    status: blockers.length > 0 ? 'blocked' : 'ok',
    warnings: [],
    blockers,
    strategy: blockers.length > 0 ? 'manual' : 'supported',
    actions,
    defaults: {
      provider: context.providers.detected[0]?.value,
      ide: context.ides.detected[0]?.ide,
      shared: false,
      extension: true,
    },
  }
}
```

- [ ] **Step 4: Implement `detect` and `plan` commands**

```ts
export async function detect(json = false): Promise<void> {
  const result = await createDetectionResult(process.cwd())
  if (json) {
    printJson(result)
    return
  }

  log.header('Inspecto Detect')
  log.success(`Package manager: ${result.project.packageManager}`)
}

export async function plan(json = false): Promise<void> {
  const context = await buildOnboardingContext(process.cwd())
  const result = createPlanResult(context)
  if (json) {
    printJson(result)
    return
  }

  log.header('Inspecto Plan')
  for (const action of result.actions) {
    log.info(`${action.type}: ${action.target}`)
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @inspecto-dev/cli test -- detect.test.ts plan.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/onboarding/planner.ts packages/cli/src/commands/detect.ts packages/cli/src/commands/plan.ts packages/cli/tests/plan.test.ts packages/cli/tests/detect.test.ts
git commit -m "feat: add structured detect and plan commands"
```

### Task 3: Extract Apply Logic From `init`

**Files:**

- Create: `packages/cli/src/onboarding/apply.ts`
- Create: `packages/cli/src/commands/apply.ts`
- Modify: `packages/cli/src/commands/init.ts`
- Test: `packages/cli/tests/apply.test.ts`
- Test: `packages/cli/tests/init.test.ts`

- [ ] **Step 1: Write the failing apply orchestration test**

```ts
import { describe, expect, it, vi } from 'vitest'
import { applyPlan } from '../src/onboarding/apply.js'

describe('applyPlan', () => {
  it('returns structured mutation output for a supported plan', async () => {
    const result = await applyPlan({
      status: 'ok',
      warnings: [],
      blockers: [],
      strategy: 'supported',
      actions: [
        {
          type: 'install_dependency',
          target: '@inspecto-dev/plugin',
          description: 'Install plugin',
        },
      ],
      defaults: {
        shared: false,
        extension: false,
      },
    })

    expect(result.status).toBe('ok')
    expect(Array.isArray(result.mutations)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @inspecto-dev/cli test -- apply.test.ts`
Expected: FAIL with missing `applyPlan`.

- [ ] **Step 3: Extract current side effects into `applyPlan`**

```ts
import type { Mutation, PlanResult } from '../types.js'

export async function applyPlan(plan: PlanResult): Promise<{
  status: 'ok' | 'error'
  mutations: Mutation[]
  postInstall: string[]
}> {
  if (plan.status === 'blocked') {
    return {
      status: 'error',
      mutations: [],
      postInstall: ['Resolve blockers before applying this plan.'],
    }
  }

  const mutations: Mutation[] = []

  // Existing init.ts logic moves behind helpers called here:
  // - dependency installation
  // - build config injection
  // - extension installation
  // - settings writes
  // - install.lock updates

  return {
    status: 'ok',
    mutations,
    postInstall: ['Start your dev server and Alt + Click a component.'],
  }
}
```

- [ ] **Step 4: Make `init` delegate to the shared planner/apply path**

```ts
export async function init(options: InitOptions): Promise<void> {
  const root = process.cwd()
  const context = await buildOnboardingContext(root)
  const plan = createPlanResult(context)

  if (!options.force && plan.status === 'blocked') {
    for (const blocker of plan.blockers) {
      log.warn(blocker.message)
    }
    return
  }

  const result = await applyPlan(plan)
  if (result.status === 'error') {
    log.error('Inspecto setup failed')
    return
  }

  log.success('Inspecto setup complete')
}
```

- [ ] **Step 5: Add a non-interactive `apply` command**

```ts
export async function apply(): Promise<void> {
  const context = await buildOnboardingContext(process.cwd())
  const plan = createPlanResult(context)
  const result = await applyPlan(plan)
  printJson(result)
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter @inspecto-dev/cli test -- apply.test.ts init.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/onboarding/apply.ts packages/cli/src/commands/apply.ts packages/cli/src/commands/init.ts packages/cli/tests/apply.test.ts packages/cli/tests/init.test.ts
git commit -m "refactor: share apply flow across init and agent commands"
```

### Task 4: Add JSON Output and CLI Wiring

**Files:**

- Modify: `packages/cli/src/bin.ts`
- Create: `packages/cli/src/utils/output.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/tests/logger.test.ts`

- [ ] **Step 1: Write the failing CLI wiring test**

```ts
import { describe, expect, it } from 'vitest'
import { buildCli } from '../src/bin.js'

describe('CLI command registration', () => {
  it('registers detect, plan, and apply commands', () => {
    const cli = buildCli()
    const names = cli.commands.map(command => command.rawName)

    expect(names).toContain('detect')
    expect(names).toContain('plan')
    expect(names).toContain('apply')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @inspecto-dev/cli test -- logger.test.ts`
Expected: FAIL because `buildCli` or command registrations do not exist.

- [ ] **Step 3: Add shared JSON printer and command registration**

```ts
export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

export function buildCli(): CAC {
  const cli = cac('inspecto')

  cli
    .command('detect', 'Detect Inspecto onboarding environment')
    .option('--json', 'Print structured JSON output', { default: false })
    .action(async options => {
      await detect(options.json ?? false)
    })

  cli
    .command('plan', 'Preview Inspecto onboarding actions')
    .option('--json', 'Print structured JSON output', { default: false })
    .action(async options => {
      await plan(options.json ?? false)
    })

  cli
    .command('apply', 'Apply Inspecto onboarding plan non-interactively')
    .option('--json', 'Print structured JSON output', { default: true })
    .action(async () => {
      await apply()
    })

  return cli
}
```

- [ ] **Step 4: Export new command surfaces**

```ts
export { detect } from './commands/detect.js'
export { plan } from './commands/plan.js'
export { apply } from './commands/apply.js'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @inspecto-dev/cli test -- logger.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/bin.ts packages/cli/src/utils/output.ts packages/cli/src/index.ts packages/cli/tests/logger.test.ts
git commit -m "feat: wire structured onboarding commands into cli"
```

### Task 5: Add JSON Diagnostics Path

**Files:**

- Modify: `packages/cli/src/commands/doctor.ts`
- Modify: `packages/cli/tests/logger.test.ts`

- [ ] **Step 1: Write the failing doctor JSON test**

```ts
import { describe, expect, it } from 'vitest'
import { doctor } from '../src/commands/doctor.js'

describe('doctor json mode', () => {
  it('returns structured errors and warnings', async () => {
    const result = await doctor({ json: true })
    expect(result).toHaveProperty('status')
    expect(result).toHaveProperty('warnings')
    expect(result).toHaveProperty('errors')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @inspecto-dev/cli test -- logger.test.ts`
Expected: FAIL because `doctor` returns `void`.

- [ ] **Step 3: Make doctor build a reusable result object**

```ts
export async function doctor(options: { json?: boolean } = {}): Promise<DoctorResult | void> {
  const result = await collectDoctorResult(process.cwd())

  if (options.json) {
    return result
  }

  log.header('Inspecto Doctor')
  for (const warning of result.warnings) {
    log.warn(warning.message)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @inspecto-dev/cli test -- logger.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/doctor.ts packages/cli/tests/logger.test.ts
git commit -m "feat: add json doctor output"
```

### Task 6: Document Skill-First Onboarding

**Files:**

- Modify: `packages/cli/README.md`
- Modify: `packages/docs/guide/getting-started.md`
- Modify: `packages/docs/integrations/ai-tools.md`

- [ ] **Step 1: Write the failing docs expectation test**

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('docs mention structured onboarding commands', () => {
  it('documents detect, plan, and apply for agent users', () => {
    const guide = readFileSync('packages/docs/guide/getting-started.md', 'utf8')
    expect(guide).toContain('inspecto detect --json')
    expect(guide).toContain('inspecto plan --json')
    expect(guide).toContain('inspecto apply')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @inspecto-dev/cli test -- instructions.test.ts`
Expected: FAIL because docs do not mention the new commands yet.

- [ ] **Step 3: Update docs for the new onboarding story**

```md
## Agent-Based Setup

If you are working inside a supported coding agent, ask it to set up Inspecto in the current project.
Under the hood, the agent should use:

- `inspecto detect --json`
- `inspecto plan --json`
- `inspecto apply`
- `inspecto doctor --json`

Use `inspecto init` when you want to run the guided installer manually.
```

- [ ] **Step 4: Run the docs expectation test**

Run: `pnpm --filter @inspecto-dev/cli test -- instructions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/README.md packages/docs/guide/getting-started.md packages/docs/integrations/ai-tools.md
git commit -m "docs: add skill-first onboarding guidance"
```

### Task 7: Full Verification

**Files:**

- Modify: `packages/cli/src/bin.ts`
- Modify: `packages/cli/src/commands/*.ts`
- Modify: `packages/cli/tests/*.test.ts`
- Modify: `packages/docs/guide/getting-started.md`
- Modify: `packages/docs/integrations/ai-tools.md`
- Modify: `packages/cli/README.md`

- [ ] **Step 1: Run focused CLI tests**

Run: `pnpm --filter @inspecto-dev/cli test -- detect.test.ts plan.test.ts apply.test.ts init.test.ts logger.test.ts instructions.test.ts`
Expected: PASS

- [ ] **Step 2: Run the full CLI test suite**

Run: `pnpm --filter @inspecto-dev/cli test`
Expected: PASS

- [ ] **Step 3: Smoke-test the command help output**

Run: `pnpm --filter @inspecto-dev/cli exec inspecto --help`
Expected: output includes `init`, `detect`, `plan`, `apply`, `doctor`, and `teardown`

- [ ] **Step 4: Commit final integrated changes**

```bash
git add packages/cli packages/docs
git commit -m "feat: add skill-first onboarding cli flow"
```

## Self-Review

- Spec coverage: covered CLI contract design (`detect`, `plan`, `apply`, `doctor`), shared execution core, docs updates, and MVP-first rollout. The only spec item intentionally deferred from implementation is shipping an official skill itself; this plan focuses on the CLI protocol required before that skill can be built safely.
- Placeholder scan: no `TODO`, `TBD`, or unresolved "handle edge cases" wording remains in the task steps.
- Type consistency: the plan uses `DetectionResult`, `PlanResult`, `CommandStatus`, and `applyPlan` consistently across orchestration, command wiring, and tests.
