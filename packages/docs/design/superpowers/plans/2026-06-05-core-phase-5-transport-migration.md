# Core Phase 5 Transport Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move core browser HTTP/EventSource transport into `packages/core/src/transport/` while preserving the current function API and behavior.

**Architecture:** This implements Phase 5 from `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`. The first transport step is only a move from `http.ts` to `transport/http-client.ts`; it does not introduce a new transport interface. Root `http.ts` remains as a compatibility re-export while runtime code imports the new transport path directly.

**Tech Stack:** TypeScript, browser `fetch`, browser `EventSource`, Vitest, tsup, pnpm workspace.

---

## File Structure

Create:

```text
packages/core/src/transport/
```

Move:

```text
packages/core/src/http.ts -> packages/core/src/transport/http-client.ts
```

Keep:

```text
packages/core/src/http.ts
```

as:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './transport/http-client.js'
```

Do not move `css-context.ts` or `runtime-context*.ts` in Phase 5.

---

### Task 1: Establish Phase 5 Baseline

- [ ] **Step 1: Confirm only unrelated working tree changes exist**

Run:

```bash
git status --short
```

Expected: it may show only:

```text
 M playground/astro-vite/.astro/settings.json
```

- [ ] **Step 2: Run current core tests and typecheck**

Run:

```bash
pnpm --filter @inspecto-dev/core test
pnpm --filter @inspecto-dev/core typecheck
```

Expected: both PASS.

---

### Task 2: Move HTTP Client

**Files:**

- Move: `packages/core/src/http.ts`
- Create: `packages/core/src/http.ts`
- Modify: `packages/core/src/runtime/annotate-ui.ts`
- Modify: `packages/core/src/runtime/lifecycle.ts`
- Modify: `packages/core/src/runtime/interactions.ts`
- Modify: `packages/core/tests/menu.test.ts`
- Modify: `packages/core/tests/annotate-mode.test.ts`

- [ ] **Step 1: Create transport directory and move the HTTP client**

Run:

```bash
mkdir -p packages/core/src/transport
git mv packages/core/src/http.ts packages/core/src/transport/http-client.ts
```

Expected: file is moved by git.

- [ ] **Step 2: Add root compatibility re-export**

Create `packages/core/src/http.ts`:

```ts
// Temporary compatibility re-export during the core feature-directory migration.
export * from './transport/http-client.js'
```

- [ ] **Step 3: Update runtime imports to transport path**

In `packages/core/src/runtime/annotate-ui.ts`, replace:

```ts
} from '../http.js'
```

with:

```ts
} from '../transport/http-client.js'
```

In `packages/core/src/runtime/lifecycle.ts`, replace imports from `../http.js` with:

```ts
import { fetchIdeInfo } from '../transport/http-client.js'
import { setBaseUrl } from '../transport/http-client.js'
```

In `packages/core/src/runtime/interactions.ts`, replace:

```ts
import { openFile } from '../http.js'
```

with:

```ts
import { openFile } from '../transport/http-client.js'
```

- [ ] **Step 4: Update focused tests to keep mocks working**

In `packages/core/tests/menu.test.ts`, keep the root import:

```ts
import * as http from '../src/http.js'
```

Keep the existing root mock:

```ts
vi.mock('../src/http.js', () => ({
```

Add this bridge mock immediately after the root `http` mock:

```ts
vi.mock('../src/transport/http-client.js', async () => {
  const httpModule = await import('../src/http.js')
  return httpModule
})
```

In `packages/core/tests/annotate-mode.test.ts`, keep the root import:

```ts
import { openFileWithDiagnostics, sendAnnotationsToAi, setBaseUrl } from '../src/http.js'
```

If this test mocks `../src/http.js`, add the same transport bridge mock after that mock. If it does not mock `../src/http.js`, do not add a bridge.

- [ ] **Step 5: Run focused transport-dependent tests**

Run:

```bash
pnpm --filter @inspecto-dev/core test -- menu.test.ts annotate-mode.test.ts inspect-runtime-context.test.ts
```

Expected: PASS.

---

### Task 3: Full Verification and Documentation

**Files:**

- Modify: `packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md`

- [ ] **Step 1: Add a Phase 5 completion note to the design doc**

Append this section after the existing Phase 4 implementation note:

```md
## Phase 5 Implementation Note

Phase 5 moved the browser HTTP/EventSource client into `transport/http-client.ts`.
The root `http.ts` compatibility re-export remains temporarily for tests and
older internal imports.
```

- [ ] **Step 2: Confirm root compatibility file is minimal**

Run:

```bash
sed -n '1,20p' packages/core/src/http.ts
```

Expected: file contains only the temporary compatibility comment and one `export * from ...` statement.

- [ ] **Step 3: Run full verification**

Run:

```bash
pnpm --filter @inspecto-dev/core test
pnpm --filter @inspecto-dev/core typecheck
pnpm --filter @inspecto-dev/core build
```

Expected: all PASS.

- [ ] **Step 4: Stage and commit Phase 5**

Run:

```bash
git add packages/core/src packages/core/tests packages/docs/design/superpowers/2026-06-05-core-architecture-refactor-design.md
git commit -m "Refactor core transport client"
```

Expected: commit succeeds and does not include `playground/astro-vite/.astro/settings.json`.
