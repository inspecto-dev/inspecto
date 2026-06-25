# Core Phase 3 Shared Assets Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move shared core utilities, i18n, icons, and style modules into `packages/core/src/shared/` while preserving behavior and root compatibility imports.

**Architecture:** This implements Phase 3 from `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`. The migration remains mechanical: implementation files move to `shared/`, imports in already-migrated feature modules point to shared paths, and root compatibility re-export files remain for runtime modules that will move later.

**Tech Stack:** TypeScript, native browser DOM runtime, Web Component + Shadow DOM, Vitest, tsup, pnpm workspace.

---

## File Structure

Create:

```text
packages/core/src/shared/
packages/core/src/shared/styles/
```

Move:

```text
packages/core/src/component-utils.ts
  -> packages/core/src/shared/component-utils.ts

packages/core/src/i18n.ts
  -> packages/core/src/shared/i18n.ts

packages/core/src/icons.ts
  -> packages/core/src/shared/icons.ts

packages/core/src/styles.ts
  -> packages/core/src/shared/styles/index.ts

packages/core/src/styles-annotate.ts
  -> packages/core/src/shared/styles/annotate.ts

packages/core/src/styles-classes.ts
  -> packages/core/src/shared/styles/classes.ts

packages/core/src/styles-launcher.ts
  -> packages/core/src/shared/styles/launcher.ts

packages/core/src/styles-overlay-menu.ts
  -> packages/core/src/shared/styles/overlay-menu.ts

packages/core/src/styles-theme.ts
  -> packages/core/src/shared/styles/theme.ts
```

Keep root compatibility files at old paths:

```text
packages/core/src/component-utils.ts
packages/core/src/i18n.ts
packages/core/src/icons.ts
packages/core/src/styles.ts
packages/core/src/styles-annotate.ts
packages/core/src/styles-classes.ts
packages/core/src/styles-launcher.ts
packages/core/src/styles-overlay-menu.ts
packages/core/src/styles-theme.ts
```

Each compatibility file should contain only the temporary migration comment and a single re-export from the new shared path.

Do not move runtime composition files, feature files, transport, evidence capture, or CSS context in Phase 3.

---

### Task 1: Establish Phase 3 Baseline

**Files:**

- Read: `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`
- Read: `packages/docs/design/superpowers/plans/2026-06-05-core-phase-3-shared-assets-migration.md`

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

Expected: PASS with 209 tests passing.

- [ ] **Step 3: Run current core typecheck**

Run:

```bash
pnpm --filter @inspecto-dev/core typecheck
```

Expected: PASS.

---

### Task 2: Move Shared Utilities, i18n, and Icons

**Files:**

- Move: `packages/core/src/component-utils.ts`
- Move: `packages/core/src/i18n.ts`
- Move: `packages/core/src/icons.ts`
- Create: root compatibility files at the old three paths.
- Modify: feature imports that currently point to root `../../../component-utils.js`, `../../../i18n.js`, or `../../../icons.js`.
- Modify: focused tests importing `../src/component-utils.js` or `../src/i18n.js`.

- [ ] **Step 1: Create shared directory**

Run:

```bash
mkdir -p packages/core/src/shared
```

Expected: command succeeds with no output.

- [ ] **Step 2: Move utility/i18n/icon files**

Run:

```bash
git mv packages/core/src/component-utils.ts packages/core/src/shared/component-utils.ts
git mv packages/core/src/i18n.ts packages/core/src/shared/i18n.ts
git mv packages/core/src/icons.ts packages/core/src/shared/icons.ts
```

Expected: all three files are moved by git.

- [ ] **Step 3: Add root compatibility re-exports**

Create `packages/core/src/component-utils.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './shared/component-utils.js'
```

Create `packages/core/src/i18n.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './shared/i18n.js'
```

Create `packages/core/src/icons.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './shared/icons.js'
```

- [ ] **Step 4: Update feature imports to shared utility paths**

Replace feature imports from root utility/i18n/icon paths:

```ts
from '../../../component-utils.js'
from '../../../i18n.js'
from '../../../icons.js'
```

with:

```ts
from '../../../shared/component-utils.js'
from '../../../shared/i18n.js'
from '../../../shared/icons.js'
```

Apply this replacement only under:

```text
packages/core/src/features/
```

Do not update runtime root modules in this task; they should continue through compatibility files until Phase 4.

- [ ] **Step 5: Update focused tests to shared utility paths**

In `packages/core/tests/component-utils.test.ts`, replace:

```ts
import { findInspectable, getInspectableLocation } from '../src/component-utils.js'
```

with:

```ts
import { findInspectable, getInspectableLocation } from '../src/shared/component-utils.js'
```

In `packages/core/tests/annotate-session-timeline.test.ts`, replace:

```ts
import { configureI18n } from '../src/i18n.js'
```

with:

```ts
import { configureI18n } from '../src/shared/i18n.js'
```

- [ ] **Step 6: Run focused utility tests**

Run:

```bash
pnpm --filter @inspecto-dev/core test -- component-utils.test.ts annotate-session-timeline.test.ts overlay.test.ts menu.test.ts annotate-sidebar.test.ts
```

Expected: PASS.

---

### Task 3: Move Shared Styles

**Files:**

- Move: `packages/core/src/styles.ts`
- Move: `packages/core/src/styles-annotate.ts`
- Move: `packages/core/src/styles-classes.ts`
- Move: `packages/core/src/styles-launcher.ts`
- Move: `packages/core/src/styles-overlay-menu.ts`
- Move: `packages/core/src/styles-theme.ts`
- Create: root compatibility files at the old six paths.
- Modify: imports inside moved style files.
- Modify: feature imports that currently point to root `../../../styles.js`.
- Modify: focused tests importing `../src/styles.js`.

- [ ] **Step 1: Create shared styles directory**

Run:

```bash
mkdir -p packages/core/src/shared/styles
```

Expected: command succeeds with no output.

- [ ] **Step 2: Move style files**

Run:

```bash
git mv packages/core/src/styles.ts packages/core/src/shared/styles/index.ts
git mv packages/core/src/styles-annotate.ts packages/core/src/shared/styles/annotate.ts
git mv packages/core/src/styles-classes.ts packages/core/src/shared/styles/classes.ts
git mv packages/core/src/styles-launcher.ts packages/core/src/shared/styles/launcher.ts
git mv packages/core/src/styles-overlay-menu.ts packages/core/src/shared/styles/overlay-menu.ts
git mv packages/core/src/styles-theme.ts packages/core/src/shared/styles/theme.ts
```

Expected: all six files are moved by git.

- [ ] **Step 3: Update imports in `shared/styles/index.ts`**

In `packages/core/src/shared/styles/index.ts`, replace:

```ts
import { annotateStyles } from './styles-annotate.js'
import { launcherStyles } from './styles-launcher.js'
import { overlayMenuStyles } from './styles-overlay-menu.js'
import { themeStyles } from './styles-theme.js'
export * from './styles-classes.js'
```

with:

```ts
import { annotateStyles } from './annotate.js'
import { launcherStyles } from './launcher.js'
import { overlayMenuStyles } from './overlay-menu.js'
import { themeStyles } from './theme.js'
export * from './classes.js'
```

- [ ] **Step 4: Update imports inside moved style modules**

In `packages/core/src/shared/styles/annotate.ts`, replace:

```ts
} from './styles-classes.js'
```

with:

```ts
} from './classes.js'
```

In `packages/core/src/shared/styles/launcher.ts`, replace:

```ts
import { badgeClass } from './styles-classes.js'
```

with:

```ts
import { badgeClass } from './classes.js'
```

In `packages/core/src/shared/styles/overlay-menu.ts`, replace:

```ts
} from './styles-classes.js'
```

with:

```ts
} from './classes.js'
```

- [ ] **Step 5: Add root style compatibility re-exports**

Create `packages/core/src/styles.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './shared/styles/index.js'
```

Create `packages/core/src/styles-annotate.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './shared/styles/annotate.js'
```

Create `packages/core/src/styles-classes.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './shared/styles/classes.js'
```

Create `packages/core/src/styles-launcher.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './shared/styles/launcher.js'
```

Create `packages/core/src/styles-overlay-menu.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './shared/styles/overlay-menu.js'
```

Create `packages/core/src/styles-theme.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './shared/styles/theme.js'
```

- [ ] **Step 6: Update feature imports to shared styles path**

Replace feature imports from:

```ts
from '../../../styles.js'
```

with:

```ts
from '../../../shared/styles/index.js'
```

Apply this replacement only under:

```text
packages/core/src/features/
```

Do not update runtime root modules in this task; they should continue through compatibility files until Phase 4.

- [ ] **Step 7: Update focused tests to shared styles path**

In `packages/core/tests/menu.test.ts`, `packages/core/tests/overlay.test.ts`, and `packages/core/tests/annotate-sidebar.test.ts`, replace:

```ts
from '../src/styles.js'
```

with:

```ts
from '../src/shared/styles/index.js'
```

- [ ] **Step 8: Run focused style-dependent tests**

Run:

```bash
pnpm --filter @inspecto-dev/core test -- menu.test.ts overlay.test.ts annotate-sidebar.test.ts annotate-mode.test.ts
```

Expected: PASS.

---

### Task 4: Full Verification and Documentation

**Files:**

- Modify: `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`
- Read: `packages/core/src/**/*.ts`
- Read: `packages/core/tests/*.ts`

- [ ] **Step 1: Add a Phase 3 completion note to the design doc**

Append this section after the existing Phase 2 implementation note:

```md
## Phase 3 Implementation Note

Phase 3 moved shared component utilities, i18n, icons, and style modules into
`shared/`. Root-level compatibility re-export files remain temporarily so the
runtime composition and transport phases can migrate without broad behavior
changes.
```

- [ ] **Step 2: Confirm root compatibility files are minimal**

Run:

```bash
sed -n '1,20p' packages/core/src/component-utils.ts
sed -n '1,20p' packages/core/src/i18n.ts
sed -n '1,20p' packages/core/src/icons.ts
sed -n '1,20p' packages/core/src/styles.ts
sed -n '1,20p' packages/core/src/styles-annotate.ts
sed -n '1,20p' packages/core/src/styles-classes.ts
sed -n '1,20p' packages/core/src/styles-launcher.ts
sed -n '1,20p' packages/core/src/styles-overlay-menu.ts
sed -n '1,20p' packages/core/src/styles-theme.ts
```

Expected: each file contains only the temporary compatibility comment and one `export * from ...` statement.

- [ ] **Step 3: Search moved shared references**

Run:

```bash
rg "from '../../../(styles|icons|i18n|component-utils)|from '../src/(styles|icons|i18n|component-utils)|from './(styles|styles-[^']+|icons|i18n|component-utils)" packages/core/src packages/core/tests -n
```

Expected:

- Feature modules import shared paths directly.
- Runtime root modules may still import root compatibility files.
- No import points to a deleted implementation file without a compatibility re-export.

- [ ] **Step 4: Run all core tests**

Run:

```bash
pnpm --filter @inspecto-dev/core test
```

Expected: PASS with all tests passing.

- [ ] **Step 5: Run core typecheck**

Run:

```bash
pnpm --filter @inspecto-dev/core typecheck
```

Expected: PASS.

- [ ] **Step 6: Run core build**

Run:

```bash
pnpm --filter @inspecto-dev/core build
```

Expected: PASS.

- [ ] **Step 7: Stage only Phase 3 files**

Run:

```bash
git add packages/core/src packages/core/tests packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md
```

Expected: staged changes do not include `playground/astro-vite/.astro/settings.json`.

- [ ] **Step 8: Commit Phase 3**

Run:

```bash
git commit -m "Refactor core shared assets"
```

Expected: commit succeeds. Pre-commit may run formatting and relevant checks.
