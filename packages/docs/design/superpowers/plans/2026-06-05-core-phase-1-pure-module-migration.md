# Core Phase 1 Pure Module Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the lowest-risk pure `@inspecto-dev/core` modules into the new feature-first directory structure while preserving behavior and public API compatibility.

**Architecture:** This implements Phase 1 from `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`. The migration creates feature directories for annotate session logic, inspect prompt/menu logic, and runtime evidence logic, then leaves root-level compatibility re-export files so DOM-heavy modules and current tests can be migrated later.

**Tech Stack:** TypeScript, native browser DOM runtime, Vitest, tsup, pnpm workspace.

---

## File Structure

Create these directories:

```text
packages/core/src/features/annotate/session/
packages/core/src/features/evidence/runtime-context/
packages/core/src/features/inspect/menu/
packages/core/src/features/inspect/prompts/
```

Move these implementation files:

```text
packages/core/src/annotate-session.ts
  -> packages/core/src/features/annotate/session/index.ts

packages/core/src/annotate-session-timeline.ts
  -> packages/core/src/features/annotate/session/timeline.ts

packages/core/src/menu-position.ts
  -> packages/core/src/features/inspect/menu/position.ts

packages/core/src/intents.ts
  -> packages/core/src/features/inspect/prompts/intents.ts

packages/core/src/fix-bug-prompt.ts
  -> packages/core/src/features/inspect/prompts/fix-bug-prompt.ts

packages/core/src/runtime-context-shared.ts
  -> packages/core/src/features/evidence/runtime-context/shared.ts

packages/core/src/runtime-context-selection.ts
  -> packages/core/src/features/evidence/runtime-context/selection.ts
```

Keep these root compatibility files:

```text
packages/core/src/annotate-session.ts
packages/core/src/annotate-session-timeline.ts
packages/core/src/menu-position.ts
packages/core/src/intents.ts
packages/core/src/fix-bug-prompt.ts
packages/core/src/runtime-context-shared.ts
packages/core/src/runtime-context-selection.ts
```

Each root compatibility file should contain only a short migration comment and a re-export from the new feature path.

Do not move DOM-heavy modules in this phase:

```text
packages/core/src/menu.ts
packages/core/src/menu-actions.ts
packages/core/src/menu-send.ts
packages/core/src/annotate-sidebar.ts
packages/core/src/annotate-sidebar-dom.ts
packages/core/src/annotate-sidebar-renderers.ts
packages/core/src/annotate-session-timeline-dom.ts
packages/core/src/annotate-overlay.ts
packages/core/src/component.ts
packages/core/src/component-*.ts
```

---

### Task 1: Establish Baseline

**Files:**

- Read: `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`
- Read: `packages/core/src/runtime-context.ts`
- Read: `packages/core/src/fix-bug-prompt.ts`
- Read: `packages/core/src/runtime-context-selection.ts`

- [ ] **Step 1: Confirm only unrelated working tree changes exist**

Run:

```bash
git status --short
```

Expected: it may show the pre-existing unrelated file:

```text
 M playground/astro-vite/.astro/settings.json
```

It must not show staged changes before implementation starts. If additional unrelated files appear, leave them untouched.

- [ ] **Step 2: Run current core tests**

Run:

```bash
pnpm --filter @inspecto-dev/core test
```

Expected: PASS. If this fails before any code move, stop and record the failure; do not debug the migration against a broken baseline.

- [ ] **Step 3: Run current core typecheck**

Run:

```bash
pnpm --filter @inspecto-dev/core typecheck
```

Expected: PASS.

---

### Task 2: Move Annotate Pure Session Modules

**Files:**

- Move: `packages/core/src/annotate-session.ts`
- Move: `packages/core/src/annotate-session-timeline.ts`
- Create: `packages/core/src/annotate-session.ts`
- Create: `packages/core/src/annotate-session-timeline.ts`
- Modify: `packages/core/tests/annotate-session.test.ts`
- Modify: `packages/core/tests/annotate-session-timeline.test.ts`

- [ ] **Step 1: Create annotate session directory**

Run:

```bash
mkdir -p packages/core/src/features/annotate/session
```

Expected: command succeeds with no output.

- [ ] **Step 2: Move the implementation files**

Run:

```bash
git mv packages/core/src/annotate-session.ts packages/core/src/features/annotate/session/index.ts
git mv packages/core/src/annotate-session-timeline.ts packages/core/src/features/annotate/session/timeline.ts
```

Expected: both files are moved by git.

- [ ] **Step 3: Add compatibility re-export for `annotate-session.ts`**

Create `packages/core/src/annotate-session.ts` with:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/annotate/session/index.js'
```

- [ ] **Step 4: Add compatibility re-export for `annotate-session-timeline.ts`**

Create `packages/core/src/annotate-session-timeline.ts` with:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/annotate/session/timeline.js'
```

- [ ] **Step 5: Update focused annotate tests to the new pure module paths**

In `packages/core/tests/annotate-session.test.ts`, replace the import from:

```ts
} from '../src/annotate-session.js'
```

with:

```ts
} from '../src/features/annotate/session/index.js'
```

In `packages/core/tests/annotate-session-timeline.test.ts`, replace the timeline import from:

```ts
} from '../src/annotate-session-timeline.js'
```

with:

```ts
} from '../src/features/annotate/session/timeline.js'
```

Leave this DOM renderer import unchanged in `packages/core/tests/annotate-session-timeline.test.ts`:

```ts
import { renderSessionTimeline } from '../src/annotate-session-timeline-dom.js'
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
pnpm --filter @inspecto-dev/core test -- annotate-session.test.ts annotate-session-timeline.test.ts
```

Expected: PASS.

---

### Task 3: Move Inspect Prompt and Menu Position Pure Modules

**Files:**

- Move: `packages/core/src/intents.ts`
- Move: `packages/core/src/fix-bug-prompt.ts`
- Move: `packages/core/src/menu-position.ts`
- Create: `packages/core/src/intents.ts`
- Create: `packages/core/src/fix-bug-prompt.ts`
- Create: `packages/core/src/menu-position.ts`
- Modify: `packages/core/src/features/inspect/prompts/fix-bug-prompt.ts`
- Modify: `packages/core/tests/fix-bug-prompt.test.ts`
- Modify: `packages/core/tests/menu-position.test.ts`

- [ ] **Step 1: Create inspect feature directories**

Run:

```bash
mkdir -p packages/core/src/features/inspect/prompts packages/core/src/features/inspect/menu
```

Expected: command succeeds with no output.

- [ ] **Step 2: Move the implementation files**

Run:

```bash
git mv packages/core/src/intents.ts packages/core/src/features/inspect/prompts/intents.ts
git mv packages/core/src/fix-bug-prompt.ts packages/core/src/features/inspect/prompts/fix-bug-prompt.ts
git mv packages/core/src/menu-position.ts packages/core/src/features/inspect/menu/position.ts
```

Expected: all files are moved by git.

- [ ] **Step 3: Fix the moved prompt module relative import**

In `packages/core/src/features/inspect/prompts/fix-bug-prompt.ts`, keep the local import as:

```ts
import { buildPrompt } from './intents.js'
```

Expected: no change is required if the moved file already has this import. Verify it did not become a root-relative import.

- [ ] **Step 4: Add compatibility re-export for `intents.ts`**

Create `packages/core/src/intents.ts` with:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/inspect/prompts/intents.js'
```

- [ ] **Step 5: Add compatibility re-export for `fix-bug-prompt.ts`**

Create `packages/core/src/fix-bug-prompt.ts` with:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/inspect/prompts/fix-bug-prompt.js'
```

- [ ] **Step 6: Add compatibility re-export for `menu-position.ts`**

Create `packages/core/src/menu-position.ts` with:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/inspect/menu/position.js'
```

- [ ] **Step 7: Update focused inspect tests to the new pure module paths**

In `packages/core/tests/fix-bug-prompt.test.ts`, replace the import from:

```ts
} from '../src/fix-bug-prompt.js'
```

with:

```ts
} from '../src/features/inspect/prompts/fix-bug-prompt.js'
```

In `packages/core/tests/menu-position.test.ts`, replace:

```ts
import { resolveMenuPosition } from '../src/menu-position.js'
```

with:

```ts
import { resolveMenuPosition } from '../src/features/inspect/menu/position.js'
```

Do not update `packages/core/tests/menu.test.ts` in this task. That test intentionally continues exercising compatibility through the old `../src/fix-bug-prompt.js` path and existing mocks.

- [ ] **Step 8: Run focused tests**

Run:

```bash
pnpm --filter @inspecto-dev/core test -- fix-bug-prompt.test.ts menu-position.test.ts
```

Expected: PASS.

---

### Task 4: Move Runtime Evidence Pure Modules

**Files:**

- Move: `packages/core/src/runtime-context-shared.ts`
- Move: `packages/core/src/runtime-context-selection.ts`
- Create: `packages/core/src/runtime-context-shared.ts`
- Create: `packages/core/src/runtime-context-selection.ts`
- Modify: `packages/core/src/features/evidence/runtime-context/selection.ts`
- Modify: `packages/core/src/runtime-context.ts`
- Modify: `packages/core/tests/runtime-context.test.ts`

- [ ] **Step 1: Create runtime evidence directory**

Run:

```bash
mkdir -p packages/core/src/features/evidence/runtime-context
```

Expected: command succeeds with no output.

- [ ] **Step 2: Move the implementation files**

Run:

```bash
git mv packages/core/src/runtime-context-shared.ts packages/core/src/features/evidence/runtime-context/shared.ts
git mv packages/core/src/runtime-context-selection.ts packages/core/src/features/evidence/runtime-context/selection.ts
```

Expected: both files are moved by git.

- [ ] **Step 3: Fix the moved selection module relative import**

In `packages/core/src/features/evidence/runtime-context/selection.ts`, replace:

```ts
} from './runtime-context-shared.js'
```

with:

```ts
} from './shared.js'
```

- [ ] **Step 4: Add compatibility re-export for `runtime-context-shared.ts`**

Create `packages/core/src/runtime-context-shared.ts` with:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/evidence/runtime-context/shared.js'
```

- [ ] **Step 5: Add compatibility re-export for `runtime-context-selection.ts`**

Create `packages/core/src/runtime-context-selection.ts` with:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/evidence/runtime-context/selection.js'
```

- [ ] **Step 6: Update the root runtime-context aggregator**

In `packages/core/src/runtime-context.ts`, replace the selection export block:

```ts
export {
  createRuntimeContextEnvelope,
  rankRuntimeEvidence,
  selectRuntimeEvidence,
  summarizeRuntimeContext,
} from './runtime-context-selection.js'
```

with:

```ts
export {
  createRuntimeContextEnvelope,
  rankRuntimeEvidence,
  selectRuntimeEvidence,
  summarizeRuntimeContext,
} from './features/evidence/runtime-context/selection.js'
```

Leave the capture export unchanged in Phase 1:

```ts
export {
  attachRuntimeContextCapture,
  createRuntimeContextCollector,
} from './runtime-context-capture.js'
```

- [ ] **Step 7: Update focused runtime-context test import**

In `packages/core/tests/runtime-context.test.ts`, replace the import from:

```ts
} from '../src/runtime-context.js'
```

with:

```ts
} from '../src/runtime-context.js'
```

Expected: no text change is required. This test should keep exercising the public internal aggregator because `runtime-context-capture.ts` has not moved in Phase 1.

- [ ] **Step 8: Run focused runtime tests**

Run:

```bash
pnpm --filter @inspecto-dev/core test -- runtime-context.test.ts inspect-runtime-context.test.ts
```

Expected: PASS.

---

### Task 5: Verify Compatibility Imports and Full Core Package

**Files:**

- Read: `packages/core/src/*.ts`
- Read: `packages/core/src/features/**/*.ts`
- Read: `packages/core/tests/*.ts`

- [ ] **Step 1: Confirm root compatibility files are minimal**

Run:

```bash
sed -n '1,20p' packages/core/src/annotate-session.ts
sed -n '1,20p' packages/core/src/annotate-session-timeline.ts
sed -n '1,20p' packages/core/src/menu-position.ts
sed -n '1,20p' packages/core/src/intents.ts
sed -n '1,20p' packages/core/src/fix-bug-prompt.ts
sed -n '1,20p' packages/core/src/runtime-context-shared.ts
sed -n '1,20p' packages/core/src/runtime-context-selection.ts
```

Expected: each file contains only the temporary compatibility comment and one `export * from ...` statement.

- [ ] **Step 2: Search for direct references to moved implementation paths**

Run:

```bash
rg "runtime-context-selection|runtime-context-shared|fix-bug-prompt|intents|annotate-session|annotate-session-timeline|menu-position" packages/core/src packages/core/tests -n
```

Expected:

- Focused pure tests import the new feature paths.
- DOM-heavy runtime modules may still import root compatibility paths.
- `packages/core/tests/menu.test.ts` may still mock `../src/fix-bug-prompt.js`.
- No import should reference a deleted file path without a compatibility re-export.

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

Expected: PASS and `packages/core/dist` updates or is regenerated locally.

---

### Task 6: Document and Commit Phase 1

**Files:**

- Modify: `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`
- Commit: moved source files, compatibility re-export files, focused test import updates, and design doc note.

- [ ] **Step 1: Add a Phase 1 completion note to the design doc**

Append this text below the `Recommended First Implementation Slice` section in `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`:

```md
## Phase 1 Implementation Note

Phase 1 moved pure annotate session, inspect prompt/menu positioning, and runtime evidence selection modules into feature directories. Root-level compatibility re-export files remain temporarily so DOM-heavy modules can migrate in later phases without a broad behavior change.
```

- [ ] **Step 2: Check the final diff**

Run:

```bash
git diff -- packages/core packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md
```

Expected:

- Pure modules moved into `packages/core/src/features/...`.
- Root compatibility files contain only one re-export each.
- Focused pure tests import the new feature paths.
- No DOM-heavy modules were moved.
- The design doc has the Phase 1 implementation note.

- [ ] **Step 3: Stage only Phase 1 files**

Run:

```bash
git add packages/core/src packages/core/tests packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md
```

Expected: staged changes do not include `playground/astro-vite/.astro/settings.json`.

- [ ] **Step 4: Confirm staged files**

Run:

```bash
git diff --cached --name-only
```

Expected: staged files are limited to:

```text
packages/core/src/...
packages/core/tests/...
packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md
```

- [ ] **Step 5: Commit Phase 1**

Run:

```bash
git commit -m "Refactor core pure modules into feature directories"
```

Expected: commit succeeds. Pre-commit may run formatting and relevant checks.

- [ ] **Step 6: Confirm working tree keeps only unrelated local changes**

Run:

```bash
git status --short
```

Expected: only the pre-existing unrelated file may remain:

```text
 M playground/astro-vite/.astro/settings.json
```
