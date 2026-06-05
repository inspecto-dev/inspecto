# Core Phase 2 DOM Feature Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move DOM-heavy inspect and annotate feature modules into the feature-first directory structure while preserving public API, runtime behavior, and root compatibility imports.

**Architecture:** This implements Phase 2 from `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`. The migration remains mechanical: files move into `features/inspect` and `features/annotate`, relative imports are corrected, and root-level compatibility re-export files remain so runtime modules can migrate later.

**Tech Stack:** TypeScript, native browser DOM runtime, Web Component + Shadow DOM, Vitest, tsup, pnpm workspace.

---

## File Structure

Create or extend these directories:

```text
packages/core/src/features/inspect/menu/
packages/core/src/features/inspect/overlay/
packages/core/src/features/annotate/overlay/
packages/core/src/features/annotate/sidebar/
packages/core/src/features/annotate/prompts/
packages/core/src/features/annotate/targets/
```

Move these implementation files:

```text
packages/core/src/menu.ts
  -> packages/core/src/features/inspect/menu/index.ts

packages/core/src/menu-actions.ts
  -> packages/core/src/features/inspect/menu/actions.ts

packages/core/src/menu-send.ts
  -> packages/core/src/features/inspect/menu/send.ts

packages/core/src/menu-header.ts
  -> packages/core/src/features/inspect/menu/header.ts

packages/core/src/menu-helpers.ts
  -> packages/core/src/features/inspect/menu/helpers.ts

packages/core/src/overlay.ts
  -> packages/core/src/features/inspect/overlay/index.ts

packages/core/src/annotate-overlay.ts
  -> packages/core/src/features/annotate/overlay/index.ts

packages/core/src/annotate-overlay-dom.ts
  -> packages/core/src/features/annotate/overlay/dom.ts

packages/core/src/annotate-overlay-helpers.ts
  -> packages/core/src/features/annotate/overlay/helpers.ts

packages/core/src/annotate-sidebar.ts
  -> packages/core/src/features/annotate/sidebar/index.ts

packages/core/src/annotate-sidebar-dom.ts
  -> packages/core/src/features/annotate/sidebar/dom.ts

packages/core/src/annotate-sidebar-helpers.ts
  -> packages/core/src/features/annotate/sidebar/helpers.ts

packages/core/src/annotate-sidebar-renderers.ts
  -> packages/core/src/features/annotate/sidebar/renderers.ts

packages/core/src/annotate-session-timeline-dom.ts
  -> packages/core/src/features/annotate/sidebar/session-timeline-dom.ts

packages/core/src/annotate-full-prompt.ts
  -> packages/core/src/features/annotate/prompts/full-prompt.ts

packages/core/src/component-annotate-targets.ts
  -> packages/core/src/features/annotate/targets/index.ts
```

Keep root compatibility files at every old path. Each compatibility file should contain only:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from '<new feature path>.js'
```

Do not move these files in Phase 2:

```text
packages/core/src/component.ts
packages/core/src/component-*.ts except component-annotate-targets.ts
packages/core/src/styles*.ts
packages/core/src/icons.ts
packages/core/src/i18n.ts
packages/core/src/http.ts
packages/core/src/css-context.ts
packages/core/src/runtime-context*.ts
```

Shared root files like `styles.ts`, `icons.ts`, `i18n.ts`, `http.ts`, `css-context.ts`, and compatibility re-exports from Phase 1 stay where they are until later phases.

---

### Task 1: Establish Phase 2 Baseline

**Files:**

- Read: `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`
- Read: `packages/docs/design/superpowers/plans/2026-06-05-core-phase-2-dom-feature-migration.md`
- Read: `packages/core/src/features/`

- [ ] **Step 1: Confirm only unrelated working tree changes exist**

Run:

```bash
git status --short
```

Expected: it may show the pre-existing unrelated file:

```text
 M playground/astro-vite/.astro/settings.json
```

It must not show staged changes before implementation starts.

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

### Task 2: Move Inspect Menu and Overlay DOM Modules

**Files:**

- Move: `packages/core/src/menu.ts`
- Move: `packages/core/src/menu-actions.ts`
- Move: `packages/core/src/menu-send.ts`
- Move: `packages/core/src/menu-header.ts`
- Move: `packages/core/src/menu-helpers.ts`
- Move: `packages/core/src/overlay.ts`
- Create: root compatibility files at the old six paths.
- Modify: moved inspect menu files.
- Modify: `packages/core/tests/menu.test.ts`
- Modify: `packages/core/tests/overlay.test.ts`

- [ ] **Step 1: Create inspect DOM directories**

Run:

```bash
mkdir -p packages/core/src/features/inspect/menu packages/core/src/features/inspect/overlay
```

Expected: command succeeds with no output.

- [ ] **Step 2: Move inspect menu and overlay files**

Run:

```bash
git mv packages/core/src/menu.ts packages/core/src/features/inspect/menu/index.ts
git mv packages/core/src/menu-actions.ts packages/core/src/features/inspect/menu/actions.ts
git mv packages/core/src/menu-send.ts packages/core/src/features/inspect/menu/send.ts
git mv packages/core/src/menu-header.ts packages/core/src/features/inspect/menu/header.ts
git mv packages/core/src/menu-helpers.ts packages/core/src/features/inspect/menu/helpers.ts
git mv packages/core/src/overlay.ts packages/core/src/features/inspect/overlay/index.ts
```

Expected: all six files are moved by git.

- [ ] **Step 3: Update imports in `features/inspect/menu/index.ts`**

In `packages/core/src/features/inspect/menu/index.ts`, replace the top imports with this shape:

```ts
import { createIntentActionButtons } from './actions.js'
import { buildCustomInspectPrompt, openAndSendInspectPrompt } from './send.js'
import type {
  Provider,
  InspectorOptions,
  RuntimeContextEnvelope,
  SourceLocation,
  AiIntentConfig,
} from '@inspecto-dev/types'
import { openFileWithDiagnostics, fetchIdeInfo } from '../../../http.js'
import { applyIconToggleButtonState, createMenuHeaderDom } from './header.js'
import { resolveMenuPosition } from './position.js'
import {
  createAskInput,
  createMenuSection,
  createRuntimeContextUi,
  formatRuntimeContextSummary,
  formatRuntimeErrorCount,
  isFixIntent,
  isFixUiIntent,
  showError,
} from './helpers.js'
import { t } from '../../../i18n.js'
import { menuClass, loadingSpinnerClass } from '../../../styles.js'
import { isAiIntentConfig } from '@inspecto-dev/types'
```

Do not change the function bodies.

- [ ] **Step 4: Update imports in `features/inspect/menu/actions.ts`**

In `packages/core/src/features/inspect/menu/actions.ts`, replace local root imports with:

```ts
import { appendCssContextToPrompt } from '../../../css-context.js'
import { buildPromptForIntent } from '../prompts/fix-bug-prompt.js'
import { fetchSnippet } from '../../../http.js'
import { t } from '../../../i18n.js'
import { isFixUiIntent } from './helpers.js'
import { menuItemClass } from '../../../styles.js'
```

Leave external `@inspecto-dev/types` imports unchanged.

- [ ] **Step 5: Update imports in `features/inspect/menu/send.ts`**

In `packages/core/src/features/inspect/menu/send.ts`, replace local root imports with:

```ts
import { appendCssContextToPrompt } from '../../../css-context.js'
import { appendRuntimeContextToPrompt } from '../prompts/fix-bug-prompt.js'
import { buildPrompt, CUSTOM_PROMPT_TEMPLATE } from '../prompts/intents.js'
import { fetchSnippet, openFileWithDiagnostics, sendToAi } from '../../../http.js'
```

Leave external type imports unchanged.

- [ ] **Step 6: Update imports in `features/inspect/menu/header.ts`**

In `packages/core/src/features/inspect/menu/header.ts`, replace local root imports with:

```ts
import { bugIconSvg, cssIconSvg } from '../../../icons.js'
import { t } from '../../../i18n.js'
import { formatSourceAnchor } from './helpers.js'
```

- [ ] **Step 7: Update imports in `features/inspect/menu/helpers.ts`**

In `packages/core/src/features/inspect/menu/helpers.ts`, replace:

```ts
import { runtimeSummaryLabel, t } from './i18n.js'
```

with:

```ts
import { runtimeSummaryLabel, t } from '../../../i18n.js'
```

- [ ] **Step 8: Verify `features/inspect/overlay/index.ts` imports**

Open `packages/core/src/features/inspect/overlay/index.ts`.

Expected: it should not need root-relative import updates unless it imports from `./styles.js` or another moved file. If it imports root shared files, update those imports to use `../../../<file>.js`.

- [ ] **Step 9: Add inspect root compatibility re-exports**

Create `packages/core/src/menu.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/inspect/menu/index.js'
```

Create `packages/core/src/menu-actions.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/inspect/menu/actions.js'
```

Create `packages/core/src/menu-send.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/inspect/menu/send.js'
```

Create `packages/core/src/menu-header.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/inspect/menu/header.js'
```

Create `packages/core/src/menu-helpers.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/inspect/menu/helpers.js'
```

Create `packages/core/src/overlay.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/inspect/overlay/index.js'
```

- [ ] **Step 10: Update focused tests to new inspect paths**

In `packages/core/tests/menu.test.ts`, replace:

```ts
import { showIntentMenu } from '../src/menu.js'
```

with:

```ts
import { showIntentMenu } from '../src/features/inspect/menu/index.js'
```

Leave these imports and mocks unchanged because they intentionally exercise compatibility paths:

```ts
import * as http from '../src/http.js'
import * as promptModule from '../src/fix-bug-prompt.js'
vi.mock('../src/http.js', () => ({
vi.mock('../src/fix-bug-prompt.js', () => ({
```

In `packages/core/tests/overlay.test.ts`, replace:

```ts
import { createOverlay } from '../src/overlay.js'
```

with:

```ts
import { createOverlay } from '../src/features/inspect/overlay/index.js'
```

Do not update the annotate overlay import in this task.

- [ ] **Step 11: Run focused inspect DOM tests**

Run:

```bash
pnpm --filter @inspecto-dev/core test -- menu.test.ts overlay.test.ts
```

Expected: PASS.

---

### Task 3: Move Annotate Overlay DOM Modules

**Files:**

- Move: `packages/core/src/annotate-overlay.ts`
- Move: `packages/core/src/annotate-overlay-dom.ts`
- Move: `packages/core/src/annotate-overlay-helpers.ts`
- Create: root compatibility files at old three paths.
- Modify: moved annotate overlay files.
- Modify: `packages/core/tests/overlay.test.ts`

- [ ] **Step 1: Create annotate overlay directory**

Run:

```bash
mkdir -p packages/core/src/features/annotate/overlay
```

Expected: command succeeds with no output.

- [ ] **Step 2: Move annotate overlay files**

Run:

```bash
git mv packages/core/src/annotate-overlay.ts packages/core/src/features/annotate/overlay/index.ts
git mv packages/core/src/annotate-overlay-dom.ts packages/core/src/features/annotate/overlay/dom.ts
git mv packages/core/src/annotate-overlay-helpers.ts packages/core/src/features/annotate/overlay/helpers.ts
```

Expected: all three files are moved by git.

- [ ] **Step 3: Update imports in `features/annotate/overlay/index.ts`**

In `packages/core/src/features/annotate/overlay/index.ts`, replace local imports with:

```ts
import { createAnnotateOverlayDom } from './dom.js'
import { t } from '../../../i18n.js'
import {
  applyComposerRuntimeButtonState,
  applyOverlayState,
  clamp,
  createOverlayBox,
  formatOverlayNoteBadge,
  formatRuntimeErrorCount,
  getOverflowPenalty,
  getPlacementPreference,
  placePreview,
  type ComposerPlacement,
  type PlacementCandidate,
} from './helpers.js'
```

Do not change the `SelectedTargetOverlayEntry` type or function bodies.

- [ ] **Step 4: Update imports in `features/annotate/overlay/dom.ts`**

In `packages/core/src/features/annotate/overlay/dom.ts`, replace root shared imports with:

```ts
import { applyHeaderIconButtonStyles } from '../../../styles.js'
import { bugIconSvg, cssIconSvg } from '../../../icons.js'
import { t } from '../../../i18n.js'
```

- [ ] **Step 5: Update imports in `features/annotate/overlay/helpers.ts`**

In `packages/core/src/features/annotate/overlay/helpers.ts`, replace:

```ts
import type { SelectedTargetOverlayEntry } from './annotate-overlay.js'
```

with:

```ts
import type { SelectedTargetOverlayEntry } from './index.js'
```

- [ ] **Step 6: Add annotate overlay root compatibility re-exports**

Create `packages/core/src/annotate-overlay.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/annotate/overlay/index.js'
```

Create `packages/core/src/annotate-overlay-dom.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/annotate/overlay/dom.js'
```

Create `packages/core/src/annotate-overlay-helpers.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/annotate/overlay/helpers.js'
```

- [ ] **Step 7: Update focused overlay test annotate import**

In `packages/core/tests/overlay.test.ts`, replace:

```ts
import { createAnnotateOverlay } from '../src/annotate-overlay.js'
```

with:

```ts
import { createAnnotateOverlay } from '../src/features/annotate/overlay/index.js'
```

- [ ] **Step 8: Run focused overlay tests**

Run:

```bash
pnpm --filter @inspecto-dev/core test -- overlay.test.ts
```

Expected: PASS.

---

### Task 4: Move Annotate Sidebar DOM Modules

**Files:**

- Move: `packages/core/src/annotate-sidebar.ts`
- Move: `packages/core/src/annotate-sidebar-dom.ts`
- Move: `packages/core/src/annotate-sidebar-helpers.ts`
- Move: `packages/core/src/annotate-sidebar-renderers.ts`
- Move: `packages/core/src/annotate-session-timeline-dom.ts`
- Create: root compatibility files at old five paths.
- Modify: moved annotate sidebar files.
- Modify: `packages/core/tests/annotate-sidebar.test.ts`
- Modify: `packages/core/tests/annotate-session-timeline.test.ts`

- [ ] **Step 1: Create annotate sidebar directory**

Run:

```bash
mkdir -p packages/core/src/features/annotate/sidebar
```

Expected: command succeeds with no output.

- [ ] **Step 2: Move annotate sidebar files**

Run:

```bash
git mv packages/core/src/annotate-sidebar.ts packages/core/src/features/annotate/sidebar/index.ts
git mv packages/core/src/annotate-sidebar-dom.ts packages/core/src/features/annotate/sidebar/dom.ts
git mv packages/core/src/annotate-sidebar-helpers.ts packages/core/src/features/annotate/sidebar/helpers.ts
git mv packages/core/src/annotate-sidebar-renderers.ts packages/core/src/features/annotate/sidebar/renderers.ts
git mv packages/core/src/annotate-session-timeline-dom.ts packages/core/src/features/annotate/sidebar/session-timeline-dom.ts
```

Expected: all five files are moved by git.

- [ ] **Step 3: Update imports in `features/annotate/sidebar/index.ts`**

In `packages/core/src/features/annotate/sidebar/index.ts`, replace local imports with:

```ts
} from './helpers.js'
import { createAnnotateSidebarDom } from './dom.js'
import { createAnnotateSidebarRenderers } from './renderers.js'
import { createSidebarButton } from './helpers.js'
import { annotateSidebarButtonClass } from '../../../styles.js'
import { t } from '../../../i18n.js'
import { pauseIconSvg, playIconSvg } from '../../../icons.js'
import { buildSessionTimelineItems } from '../session/timeline.js'
import { renderSessionTimeline } from './session-timeline-dom.js'
```

Keep the existing `@inspecto-dev/types` imports and all function bodies.

- [ ] **Step 4: Update imports in `features/annotate/sidebar/dom.ts`**

In `packages/core/src/features/annotate/sidebar/dom.ts`, replace local root imports with:

```ts
import { bugIconSvg, cssIconSvg, pureMarkIconSvg, closeIconSvg } from '../../../icons.js'
import { createSidebarButton } from './helpers.js'
import { t } from '../../../i18n.js'
```

- [ ] **Step 5: Update imports in `features/annotate/sidebar/helpers.ts`**

In `packages/core/src/features/annotate/sidebar/helpers.ts`, replace:

```ts
import { t } from './i18n.js'
```

with:

```ts
import { t } from '../../../i18n.js'
```

- [ ] **Step 6: Update imports in `features/annotate/sidebar/renderers.ts`**

In `packages/core/src/features/annotate/sidebar/renderers.ts`, replace imports with:

```ts
import { closeIconSvg, inspectFilledIconSvg } from '../../../icons.js'
import type { PromptChipRecord } from './helpers.js'
import type { AnnotateSidebarOptions } from './index.js'
import { t } from '../../../i18n.js'
```

Leave external imports unchanged.

- [ ] **Step 7: Update imports in `features/annotate/sidebar/session-timeline-dom.ts`**

In `packages/core/src/features/annotate/sidebar/session-timeline-dom.ts`, replace imports with:

```ts
import type { SessionTimelineItem } from '../session/timeline.js'
import { formatTimelineTimestamp } from '../session/timeline.js'
import { t } from '../../../i18n.js'
```

- [ ] **Step 8: Add annotate sidebar root compatibility re-exports**

Create `packages/core/src/annotate-sidebar.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/annotate/sidebar/index.js'
```

Create `packages/core/src/annotate-sidebar-dom.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/annotate/sidebar/dom.js'
```

Create `packages/core/src/annotate-sidebar-helpers.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/annotate/sidebar/helpers.js'
```

Create `packages/core/src/annotate-sidebar-renderers.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/annotate/sidebar/renderers.js'
```

Create `packages/core/src/annotate-session-timeline-dom.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/annotate/sidebar/session-timeline-dom.js'
```

- [ ] **Step 9: Update focused sidebar tests**

In `packages/core/tests/annotate-sidebar.test.ts`, replace:

```ts
import { createAnnotateSidebar } from '../src/annotate-sidebar.js'
```

with:

```ts
import { createAnnotateSidebar } from '../src/features/annotate/sidebar/index.js'
```

Leave this import unchanged:

```ts
import { createEmptySession } from '../src/annotate-session.js'
```

In `packages/core/tests/annotate-session-timeline.test.ts`, replace:

```ts
import { renderSessionTimeline } from '../src/annotate-session-timeline-dom.js'
```

with:

```ts
import { renderSessionTimeline } from '../src/features/annotate/sidebar/session-timeline-dom.js'
```

- [ ] **Step 10: Run focused annotate sidebar tests**

Run:

```bash
pnpm --filter @inspecto-dev/core test -- annotate-sidebar.test.ts annotate-session-timeline.test.ts
```

Expected: PASS.

---

### Task 5: Move Annotate Prompt and Target Modules

**Files:**

- Move: `packages/core/src/annotate-full-prompt.ts`
- Move: `packages/core/src/component-annotate-targets.ts`
- Create: root compatibility files at old two paths.
- Modify: moved annotate prompt and target files.
- Modify: `packages/core/tests/annotate-mode.test.ts`
- Modify: `packages/core/tests/component-utils.test.ts`

- [ ] **Step 1: Create annotate prompt and target directories**

Run:

```bash
mkdir -p packages/core/src/features/annotate/prompts packages/core/src/features/annotate/targets
```

Expected: command succeeds with no output.

- [ ] **Step 2: Move annotate prompt and target files**

Run:

```bash
git mv packages/core/src/annotate-full-prompt.ts packages/core/src/features/annotate/prompts/full-prompt.ts
git mv packages/core/src/component-annotate-targets.ts packages/core/src/features/annotate/targets/index.ts
```

Expected: both files are moved by git.

- [ ] **Step 3: Update imports in `features/annotate/prompts/full-prompt.ts`**

In `packages/core/src/features/annotate/prompts/full-prompt.ts`, replace:

```ts
import { appendCssContextToPrompt } from './css-context.js'
```

with:

```ts
import { appendCssContextToPrompt } from '../../../css-context.js'
```

Leave external type imports unchanged.

- [ ] **Step 4: Update imports in `features/annotate/targets/index.ts`**

In `packages/core/src/features/annotate/targets/index.ts`, replace imports with:

```ts
import {
  createEmptySession,
  editRecord,
  saveCurrentRecord,
  setCurrentRecordTarget,
} from '../session/index.js'
import {
  ATTR_NAME,
  createElementSelector,
  getInspectableLocation,
} from '../../../component-utils.js'
import type { AnnotationTarget, FeedbackRecord, SourceLocation } from '@inspecto-dev/types'
import { asAnnotateContext } from '../../../component-annotate-shared.js'
```

Do not change the function bodies.

- [ ] **Step 5: Add annotate prompt and target root compatibility re-exports**

Create `packages/core/src/annotate-full-prompt.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/annotate/prompts/full-prompt.js'
```

Create `packages/core/src/component-annotate-targets.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './features/annotate/targets/index.js'
```

- [ ] **Step 6: Update focused annotate prompt and target tests**

In `packages/core/tests/annotate-mode.test.ts`, replace:

```ts
import { buildAnnotateFullPrompt } from '../src/annotate-full-prompt.js'
```

with:

```ts
import { buildAnnotateFullPrompt } from '../src/features/annotate/prompts/full-prompt.js'
```

In `packages/core/tests/component-utils.test.ts`, replace:

```ts
import { createSelector, findElementForLocation } from '../src/component-annotate-targets.js'
```

with:

```ts
import { createSelector, findElementForLocation } from '../src/features/annotate/targets/index.js'
```

- [ ] **Step 7: Run focused annotate mode and target tests**

Run:

```bash
pnpm --filter @inspecto-dev/core test -- annotate-mode.test.ts component-utils.test.ts
```

Expected: PASS.

---

### Task 6: Full Verification and Documentation

**Files:**

- Modify: `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`
- Read: `packages/core/src/**/*.ts`
- Read: `packages/core/tests/*.ts`

- [ ] **Step 1: Add a Phase 2 completion note to the design doc**

Append this section after the existing Phase 1 implementation note in `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`:

```md
## Phase 2 Implementation Note

Phase 2 moved inspect menu/overlay DOM modules, annotate overlay/sidebar DOM
modules, annotate full-prompt assembly, and annotate target helpers into feature
directories. Root-level compatibility re-export files remain temporarily so the
runtime composition layer can migrate in a later phase without a broad behavior
change.
```

- [ ] **Step 2: Confirm root compatibility files are minimal**

Run:

```bash
sed -n '1,20p' packages/core/src/menu.ts
sed -n '1,20p' packages/core/src/menu-actions.ts
sed -n '1,20p' packages/core/src/menu-send.ts
sed -n '1,20p' packages/core/src/menu-header.ts
sed -n '1,20p' packages/core/src/menu-helpers.ts
sed -n '1,20p' packages/core/src/overlay.ts
sed -n '1,20p' packages/core/src/annotate-overlay.ts
sed -n '1,20p' packages/core/src/annotate-overlay-dom.ts
sed -n '1,20p' packages/core/src/annotate-overlay-helpers.ts
sed -n '1,20p' packages/core/src/annotate-sidebar.ts
sed -n '1,20p' packages/core/src/annotate-sidebar-dom.ts
sed -n '1,20p' packages/core/src/annotate-sidebar-helpers.ts
sed -n '1,20p' packages/core/src/annotate-sidebar-renderers.ts
sed -n '1,20p' packages/core/src/annotate-session-timeline-dom.ts
sed -n '1,20p' packages/core/src/annotate-full-prompt.ts
sed -n '1,20p' packages/core/src/component-annotate-targets.ts
```

Expected: each file contains only the temporary compatibility comment and one `export * from ...` statement.

- [ ] **Step 3: Search moved module references**

Run:

```bash
rg "from '../src/(menu|overlay|annotate-overlay|annotate-sidebar|annotate-session-timeline-dom|annotate-full-prompt|component-annotate-targets)|from './(menu|overlay|annotate-overlay|annotate-sidebar|annotate-session-timeline-dom|annotate-full-prompt|component-annotate-targets)" packages/core/src packages/core/tests -n
```

Expected:

- Focused tests import new feature paths.
- Runtime and DOM-heavy modules that have not moved may still import root compatibility paths.
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

- [ ] **Step 7: Check final diff**

Run:

```bash
git diff -- packages/core packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md
```

Expected:

- DOM feature modules moved into `packages/core/src/features/...`.
- Root compatibility files contain only one re-export each.
- Focused tests import new feature paths.
- Runtime composition files remain in root.
- Shared files remain in root.

- [ ] **Step 8: Stage only Phase 2 files**

Run:

```bash
git add packages/core/src packages/core/tests packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md
```

Expected: staged changes do not include `playground/astro-vite/.astro/settings.json`.

- [ ] **Step 9: Confirm staged files**

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

- [ ] **Step 10: Commit Phase 2**

Run:

```bash
git commit -m "Refactor core DOM modules into feature directories"
```

Expected: commit succeeds. Pre-commit may run formatting and relevant checks.

- [ ] **Step 11: Confirm working tree keeps only unrelated local changes**

Run:

```bash
git status --short
```

Expected: only the pre-existing unrelated file may remain:

```text
 M playground/astro-vite/.astro/settings.json
```
