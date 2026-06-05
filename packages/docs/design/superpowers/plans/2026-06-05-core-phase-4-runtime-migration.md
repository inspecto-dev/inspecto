# Core Phase 4 Runtime Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Inspecto custom element runtime and component coordination modules into `packages/core/src/runtime/` while preserving public API and runtime behavior.

**Architecture:** This implements Phase 4 from `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`. The runtime layer owns custom element lifecycle, launcher, interactions, mode UI, annotate coordination, and evidence coordination. Root compatibility re-exports remain temporarily so tests and any remaining internal imports keep working during later cleanup.

**Tech Stack:** TypeScript, native browser DOM runtime, Web Component + Shadow DOM, Vitest, tsup, pnpm workspace.

---

## File Structure

Create:

```text
packages/core/src/runtime/
```

Move:

```text
packages/core/src/component.ts -> packages/core/src/runtime/inspecto-element.ts
packages/core/src/component-lifecycle.ts -> packages/core/src/runtime/lifecycle.ts
packages/core/src/component-launcher.ts -> packages/core/src/runtime/launcher.ts
packages/core/src/component-interactions.ts -> packages/core/src/runtime/interactions.ts
packages/core/src/component-mode-ui.ts -> packages/core/src/runtime/mode-ui.ts
packages/core/src/component-annotate.ts -> packages/core/src/runtime/annotate.ts
packages/core/src/component-annotate-ui.ts -> packages/core/src/runtime/annotate-ui.ts
packages/core/src/component-annotate-shared.ts -> packages/core/src/runtime/annotate-shared.ts
packages/core/src/component-evidence.ts -> packages/core/src/runtime/evidence.ts
```

Keep root compatibility files at every old path. Each compatibility file should contain only:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './runtime/<new-file>.js'
```

Do not move in Phase 4:

```text
packages/core/src/index.ts
packages/core/src/http.ts
packages/core/src/css-context.ts
packages/core/src/runtime-context*.ts
packages/core/src/features/**
packages/core/src/shared/**
```

---

### Task 1: Establish Phase 4 Baseline

**Files:**

- Read: `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`
- Read: `packages/docs/design/superpowers/plans/2026-06-05-core-phase-4-runtime-migration.md`

- [ ] **Step 1: Confirm only unrelated working tree changes exist**

Run:

```bash
git status --short
```

Expected: it may show only the pre-existing unrelated file:

```text
 M playground/astro-vite/.astro/settings.json
```

- [ ] **Step 2: Run current core tests**

Run:

```bash
pnpm --filter @inspecto-dev/core test
```

Expected: PASS with all tests passing.

- [ ] **Step 3: Run current core typecheck**

Run:

```bash
pnpm --filter @inspecto-dev/core typecheck
```

Expected: PASS.

---

### Task 2: Move Runtime Files

**Files:**

- Move: listed runtime files.
- Create: root compatibility files at old paths.
- Modify: moved runtime files.
- Modify: `packages/core/src/index.ts`.
- Modify: focused tests importing root component coordination modules where useful.

- [ ] **Step 1: Create runtime directory**

Run:

```bash
mkdir -p packages/core/src/runtime
```

Expected: command succeeds with no output.

- [ ] **Step 2: Move runtime files**

Run:

```bash
git mv packages/core/src/component.ts packages/core/src/runtime/inspecto-element.ts
git mv packages/core/src/component-lifecycle.ts packages/core/src/runtime/lifecycle.ts
git mv packages/core/src/component-launcher.ts packages/core/src/runtime/launcher.ts
git mv packages/core/src/component-interactions.ts packages/core/src/runtime/interactions.ts
git mv packages/core/src/component-mode-ui.ts packages/core/src/runtime/mode-ui.ts
git mv packages/core/src/component-annotate.ts packages/core/src/runtime/annotate.ts
git mv packages/core/src/component-annotate-ui.ts packages/core/src/runtime/annotate-ui.ts
git mv packages/core/src/component-annotate-shared.ts packages/core/src/runtime/annotate-shared.ts
git mv packages/core/src/component-evidence.ts packages/core/src/runtime/evidence.ts
```

Expected: all files are moved by git.

- [ ] **Step 3: Add root compatibility re-exports**

Create these files:

```ts
// packages/core/src/component.ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './runtime/inspecto-element.js'

// packages/core/src/component-lifecycle.ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './runtime/lifecycle.js'

// packages/core/src/component-launcher.ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './runtime/launcher.js'

// packages/core/src/component-interactions.ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './runtime/interactions.js'

// packages/core/src/component-mode-ui.ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './runtime/mode-ui.js'

// packages/core/src/component-annotate.ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './runtime/annotate.js'

// packages/core/src/component-annotate-ui.ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './runtime/annotate-ui.js'

// packages/core/src/component-annotate-shared.ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './runtime/annotate-shared.js'

// packages/core/src/component-evidence.ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './runtime/evidence.js'
```

- [ ] **Step 4: Update `src/index.ts` runtime imports**

In `packages/core/src/index.ts`, replace:

```ts
import type { InspectorMode } from './component.js'
```

with:

```ts
import type { InspectorMode } from './runtime/inspecto-element.js'
```

Replace the lazy import:

```ts
const { InspectoElement: _InspectoElement } = await import('./component.js')
```

with:

```ts
const { InspectoElement: _InspectoElement } = await import('./runtime/inspecto-element.js')
```

- [ ] **Step 5: Update imports in `runtime/inspecto-element.ts`**

Replace root-relative imports with direct feature/shared/runtime paths:

```ts
import { createOverlay } from '../features/inspect/overlay/index.js'
import { createEmptySession } from '../features/annotate/session/index.js'
import { createAnnotateSidebar } from '../features/annotate/sidebar/index.js'
import type {
  AnnotateSidebarOptions,
  AnnotateWorkflowNotice,
} from '../features/annotate/sidebar/index.js'
import type { AnnotateSendScope } from '../features/annotate/sidebar/helpers.js'
import { createAnnotateOverlay } from '../features/annotate/overlay/index.js'
```

Replace imports from moved runtime files:

```ts
} from './annotate.js'
} from './launcher.js'
} from './interactions.js'
} from './mode-ui.js'
} from './lifecycle.js'
} from './evidence.js'
```

Replace runtime-context import with:

```ts
import { createRuntimeContextCollector, createRuntimeContextEnvelope } from '../runtime-context.js'
```

- [ ] **Step 6: Update imports in moved runtime helper files**

Use these target paths:

```text
runtime/lifecycle.ts:
  ../features/inspect/overlay/index.js
  ../http.js
  ../shared/styles/index.js
  ../shared/i18n.js

runtime/launcher.ts:
  ../shared/styles/index.js
  ../shared/component-utils.js
  ../shared/i18n.js
  ../shared/icons.js

runtime/interactions.ts:
  ../features/inspect/menu/index.js
  ../http.js
  ../shared/component-utils.js
  ../runtime-context.js

runtime/mode-ui.ts:
  ../features/annotate/sidebar/index.js
  ../shared/component-utils.js

runtime/annotate.ts:
  ../features/annotate/targets/index.js
  ./annotate-ui.js

runtime/annotate-ui.ts:
  ../features/annotate/session/index.js
  ../features/annotate/prompts/full-prompt.js
  ../features/annotate/sidebar/index.js
  ../features/annotate/sidebar/helpers.js
  ../features/annotate/overlay/index.js
  ./annotate-shared.js
  ../shared/i18n.js

runtime/annotate-shared.ts:
  ../features/annotate/sidebar/index.js
  ../features/annotate/sidebar/helpers.js
  ../features/annotate/overlay/index.js

runtime/evidence.ts:
  ../runtime-context.js
  ../css-context.js
```

Do not change function bodies unless TypeScript requires a purely import-related type fix.

- [ ] **Step 7: Update direct tests to runtime paths**

In `packages/core/tests/custom-elements.test.ts`, replace imports of `../src/component.js` with `../src/runtime/inspecto-element.js`.

In `packages/core/tests/annotate-mode.test.ts`, replace:

```ts
import { toAnnotateErrorMessage } from '../src/component-annotate-ui.js'
```

with:

```ts
import { toAnnotateErrorMessage } from '../src/runtime/annotate-ui.js'
```

- [ ] **Step 8: Run focused runtime tests**

Run:

```bash
pnpm --filter @inspecto-dev/core test -- custom-elements.test.ts menu.test.ts annotate-mode.test.ts inspect-runtime-context.test.ts
```

Expected: PASS.

---

### Task 3: Full Verification and Documentation

**Files:**

- Modify: `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`
- Read: `packages/core/src/**/*.ts`
- Read: `packages/core/tests/*.ts`

- [ ] **Step 1: Add a Phase 4 completion note to the design doc**

Append this section after the existing Phase 3 implementation note:

```md
## Phase 4 Implementation Note

Phase 4 moved the custom element runtime and component coordination modules into
`runtime/`. Root-level compatibility re-export files remain temporarily while
transport and final cleanup phases complete.
```

- [ ] **Step 2: Confirm root compatibility files are minimal**

Run:

```bash
sed -n '1,20p' packages/core/src/component.ts
sed -n '1,20p' packages/core/src/component-lifecycle.ts
sed -n '1,20p' packages/core/src/component-launcher.ts
sed -n '1,20p' packages/core/src/component-interactions.ts
sed -n '1,20p' packages/core/src/component-mode-ui.ts
sed -n '1,20p' packages/core/src/component-annotate.ts
sed -n '1,20p' packages/core/src/component-annotate-ui.ts
sed -n '1,20p' packages/core/src/component-annotate-shared.ts
sed -n '1,20p' packages/core/src/component-evidence.ts
```

Expected: each file contains only the temporary compatibility comment and one `export * from ...` statement.

- [ ] **Step 3: Run all core tests**

Run:

```bash
pnpm --filter @inspecto-dev/core test
```

Expected: PASS.

- [ ] **Step 4: Run core typecheck**

Run:

```bash
pnpm --filter @inspecto-dev/core typecheck
```

Expected: PASS.

- [ ] **Step 5: Run core build**

Run:

```bash
pnpm --filter @inspecto-dev/core build
```

Expected: PASS.

- [ ] **Step 6: Stage and commit Phase 4**

Run:

```bash
git add packages/core/src packages/core/tests packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md
git commit -m "Refactor core runtime layer"
```

Expected: commit succeeds and does not include `playground/astro-vite/.astro/settings.json`.
