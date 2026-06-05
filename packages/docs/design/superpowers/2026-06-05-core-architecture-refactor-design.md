# Core Architecture Refactor Design

Date: 2026-06-05

## Goal

Refactor `@inspecto-dev/core` for maintainability while preserving the public API and runtime behavior.

The current package is implemented as a flat `src/` directory. Several files mix runtime state, DOM rendering, event handling, prompt assembly, HTTP transport, and annotate-mode workflows. This makes the package harder to navigate and increases the cost of changing one feature without affecting another.

This refactor should make the internal architecture easier to understand, test, and extend without changing how consumers use `@inspecto-dev/core`.

## Non-Goals

- Do not change the public package exports.
- Do not change the `mountInspector()` or `unmountInspector()` API.
- Do not introduce a framework dependency for the browser runtime.
- Do not replace the Web Component or Shadow DOM model.
- Do not redesign the UI or alter user-visible workflows.
- Do not introduce a heavy dependency-injection or ports/adapters framework.
- Do not split `@inspecto-dev/core` into multiple packages.

## Resulting Shape

Important files after the refactor:

- `src/index.ts`: public mount/unmount entry and global fallback.
- `src/runtime/`: custom element coordination, lifecycle, launcher, interactions, annotate UI, evidence, and mode helpers.
- `src/features/inspect/`: inspect-mode menu, overlay, and prompt assembly.
- `src/features/annotate/`: annotation session state, sidebar, overlay, targets, timeline, and prompt assembly.
- `src/features/evidence/`: runtime and CSS evidence capture, ranking, and prompt formatting.
- `src/transport/http-client.ts`: browser client for local server endpoints and event streams.
- `src/shared/`: component-location helpers, i18n, icons, and style modules.

Preserved strong points:

- Pure modules already exist for session state, prompt assembly, menu positioning, and runtime-context selection.
- The public entry already lazy-loads DOM-dependent code for SSR safety.
- Tests cover a large amount of current behavior.

Original pain points addressed:

- The flat directory makes feature ownership unclear.
- `InspectoElement` imports most of the package and acts as a large coordination object.
- Inspect and annotate code are interleaved by filename rather than bounded by feature.
- DOM rendering, event wiring, state transitions, and transport calls are often close together.
- Tests import many internal files directly, which makes directory refactors noisy.
- `CLAUDE.md` describes an older core structure and should be updated after the refactor.

## Recommended Architecture

Use a feature-first internal structure with a thin runtime composition layer.

```text
packages/core/src/
  index.ts

  runtime/
    mount.ts
    inspecto-element.ts
    lifecycle.ts
    launcher.ts
    interactions.ts
    mode-ui.ts

  features/
    inspect/
      menu/
        index.ts
        actions.ts
        header.ts
        helpers.ts
        position.ts
        send.ts
      overlay/
        index.ts
      prompts/
        intents.ts
        fix-bug-prompt.ts

    annotate/
      session/
        index.ts
        timeline.ts
      targets/
        index.ts
      overlay/
        index.ts
        dom.ts
        helpers.ts
      sidebar/
        index.ts
        dom.ts
        helpers.ts
        renderers.ts
      prompts/
        full-prompt.ts

    evidence/
      runtime-context/
        index.ts
        capture.ts
        selection.ts
        shared.ts
      css-context/
        index.ts

  transport/
    http-client.ts

  shared/
    component-utils.ts
    i18n.ts
    icons.ts
    styles/
      index.ts
      annotate.ts
      classes.ts
      launcher.ts
      overlay-menu.ts
      theme.ts
```

## Module Boundaries

### Public Entry

`src/index.ts` remains the only public package entry. It should continue to:

- Export public types.
- Export `mountInspector()` and `unmountInspector()`.
- Avoid top-level DOM-dependent imports.
- Install `window.InspectoClient` when running in a browser.

The package `exports` field should remain unchanged in the first refactor.

### Runtime

`runtime/` owns custom element lifecycle and feature composition.

Responsibilities:

- Define and register `<inspecto-overlay>`.
- Own mutable runtime state that must live across feature calls.
- Connect browser events to feature-level operations.
- Mount and unmount Shadow DOM UI.
- Configure options, i18n, server URL, mode, and launcher state.

Allowed dependencies:

- `features/*`
- `transport/*`
- `shared/*`
- `@inspecto-dev/types`

Feature modules should not import from `runtime/`.

### Inspect Feature

`features/inspect/` owns single-target inspect mode.

Responsibilities:

- Inspect overlay rendering.
- Intent menu rendering.
- Inspect prompt assembly.
- Snippet, runtime evidence, and CSS evidence attachment for inspect actions.
- Open-in-editor action handling through transport.

The inspect feature may depend on `features/evidence`, `transport`, and `shared`. It should not depend on annotate internals.

### Annotate Feature

`features/annotate/` owns multi-target annotation mode.

Responsibilities:

- Annotation target creation and rebinding.
- Annotation session state.
- Sidebar rendering and interaction callbacks.
- Selected-target overlay rendering.
- Full annotation prompt assembly.
- Agent session timeline projection and rendering.

Pure state and timeline functions should stay free of DOM dependencies.

### Evidence Feature

`features/evidence/` owns runtime and CSS context capture.

Responsibilities:

- Runtime error and console capture.
- Runtime evidence selection and summarization.
- CSS context capture and prompt formatting.
- Shared evidence limits and conversion helpers.

Both inspect and annotate may depend on evidence.

### Transport

`transport/` owns communication with the local Inspecto server.

The first phase should only move and rename `http.ts` to `transport/http-client.ts`. It should preserve behavior and avoid a large interface abstraction. A later phase may introduce a small `InspectoTransport` type if tests or future features need it.

Responsibilities:

- Client config fetch.
- Open file request.
- Snippet request.
- AI dispatch request.
- Annotation batch dispatch.
- Annotation session fetch.
- Annotation session event stream.

### Shared

`shared/` owns code that is not tied to a product feature.

Allowed contents:

- DOM location utilities.
- Generic component utilities.
- i18n.
- icons.
- style modules.

Shared modules should not import from `runtime` or feature modules.

## Dependency Rules

Allowed dependency direction:

```text
index -> runtime -> features -> transport/shared
runtime -> transport/shared
features/inspect -> features/evidence
features/annotate -> features/evidence
features/* -> shared
transport -> shared only if needed
shared -> no runtime or feature imports
```

Rules:

- `runtime` may compose features; features must not import runtime.
- `inspect` and `annotate` should not import each other.
- Shared code must remain generic.
- Pure modules should not import DOM renderers.
- Barrel files are allowed inside a feature directory, but they should not hide cross-feature coupling.

## Migration Plan

### Phase 1: Directory Skeleton and Pure Module Moves

Move low-risk pure modules first:

- `annotate-session.ts` -> `features/annotate/session/index.ts`
- `annotate-session-timeline.ts` -> `features/annotate/session/timeline.ts`
- `menu-position.ts` -> `features/inspect/menu/position.ts`
- `runtime-context-selection.ts` -> `features/evidence/runtime-context/selection.ts`
- `runtime-context-shared.ts` -> `features/evidence/runtime-context/shared.ts`
- `fix-bug-prompt.ts` and `intents.ts` -> `features/inspect/prompts/`

Keep compatibility re-export files at the old paths during the migration if that reduces test churn.

### Phase 2: Move DOM Feature Modules

Move feature-specific DOM modules:

- `menu*.ts` -> `features/inspect/menu/`
- `overlay.ts` -> `features/inspect/overlay/index.ts`
- `annotate-overlay*.ts` -> `features/annotate/overlay/`
- `annotate-sidebar*.ts` -> `features/annotate/sidebar/`
- `annotate-full-prompt.ts` -> `features/annotate/prompts/full-prompt.ts`
- `component-annotate-targets.ts` -> `features/annotate/targets/index.ts`

This phase should update imports mechanically and keep behavior unchanged.

### Phase 3: Move Shared Assets

Move shared presentation and utility modules:

- `styles*.ts` -> `shared/styles/`
- `icons.ts` -> `shared/icons.ts`
- `i18n.ts` -> `shared/i18n.ts`
- `component-utils.ts` -> `shared/component-utils.ts`

After this phase, feature directories should no longer import presentation assets from root-level files.

### Phase 4: Runtime Layer

Move runtime composition files:

- `component.ts` -> `runtime/inspecto-element.ts`
- `component-lifecycle.ts` -> `runtime/lifecycle.ts`
- `component-launcher.ts` -> `runtime/launcher.ts`
- `component-interactions.ts` -> `runtime/interactions.ts`
- `component-mode-ui.ts` -> `runtime/mode-ui.ts`
- `index.ts` mount logic may remain in `index.ts` or move to `runtime/mount.ts` with a re-export.

Then reduce `InspectoElement` gradually by extracting feature-specific controller functions where the boundary is already clear.

### Phase 5: Transport Move

Move:

- `http.ts` -> `transport/http-client.ts`

Keep the current function names initially. Avoid introducing a new transport interface until the imports are stable.

### Phase 6: Test and Documentation Cleanup

Update tests to prefer feature paths for internal tests. Keep public behavior tests importing from `src/index.ts`.

Update documentation:

- `packages/core/README.md`
- `CLAUDE.md`
- Any design docs that mention the older `src/client` or `src/server` shape.

## Testing Strategy

Run after each phase:

- `pnpm --filter @inspecto-dev/core test`
- `pnpm --filter @inspecto-dev/core typecheck`
- `pnpm --filter @inspecto-dev/core build`

Test organization target:

- Pure module tests for session, timeline, prompt, positioning, and evidence selection.
- DOM tests for menu, overlay, sidebar, and custom element behavior.
- Integration-style tests for `mountInspector()` inspect and annotate workflows.

Existing large tests can remain during migration. They should be split only when the feature files they cover are moved or simplified.

## Compatibility

Public API compatibility:

- `@inspecto-dev/core` continues to expose the same package entry.
- `mountInspector()` and `unmountInspector()` keep the same behavior.
- Runtime options remain compatible with `@inspecto-dev/types`.
- SSR-safe lazy import behavior remains intact.

Internal path compatibility:

- Internal imports from `packages/core/src/*` are not a public contract.
- Tests may be updated to new internal paths.
- Temporary root re-export files may be used to reduce migration risk, but should be removed once tests and imports are stable.

## Risks and Mitigations

Risk: Import-path churn creates behavior regressions.

Mitigation: Move in small phases, run core tests and typecheck after each phase, and keep temporary re-export files where helpful.

Risk: Circular dependencies appear between runtime and features.

Mitigation: Enforce the dependency direction described above. If a feature needs runtime data, pass it as arguments or callbacks.

Risk: DOM behavior changes during file moves.

Mitigation: Treat Phase 1 through Phase 3 as mostly mechanical moves. Avoid UI rewrites until tests are green in the new structure.

Risk: Tests become too coupled to new internal paths.

Mitigation: Keep behavior tests at the public entry where possible. Use direct feature imports only for pure modules or focused DOM helpers.

Risk: Transport abstraction becomes over-engineered.

Mitigation: First move `http.ts` without changing its API. Introduce an interface only after a concrete testing or feature need appears.

## Acceptance Criteria

- The package public API remains unchanged.
- `packages/core/src` is organized by runtime, feature, transport, and shared boundaries.
- `InspectoElement` is smaller and primarily coordinates lifecycle and state.
- Inspect and annotate feature code can be understood independently.
- Pure state, prompt, positioning, and evidence logic remain independently testable.
- Core tests, typecheck, and build pass.
- Documentation no longer describes the outdated `src/client` and `src/server` core structure.

## Recommended First Implementation Slice

Start with Phase 1 only.

This gives immediate maintainability improvement with low behavioral risk. It also establishes the final import direction before moving DOM-heavy modules.

Phase 1 should be considered complete when:

- Pure modules are moved into the target feature directories.
- All imports compile.
- Existing tests pass without behavior changes.
- Any temporary root re-export files are clearly marked and limited.

## Phase 1 Implementation Note

Phase 1 moved pure annotate session, inspect prompt/menu positioning, and runtime
evidence selection modules into feature directories. Root-level compatibility
re-export files remain temporarily so DOM-heavy modules can migrate in later
phases without a broad behavior change.

## Phase 2 Implementation Note

Phase 2 moved inspect menu/overlay DOM modules, annotate overlay/sidebar DOM
modules, annotate full-prompt assembly, and annotate target helpers into feature
directories. Root-level compatibility re-export files remain temporarily so the
runtime composition layer can migrate in a later phase without a broad behavior
change.

## Phase 3 Implementation Note

Phase 3 moved shared component utilities, i18n, icons, and style modules into
`shared/`. Root-level compatibility re-export files remain temporarily so the
runtime composition and transport phases can migrate without broad behavior
changes.

## Phase 4 Implementation Note

Phase 4 moved the custom element runtime and component coordination modules into
`runtime/`. Root-level compatibility re-export files remain temporarily while
transport and final cleanup phases complete.

## Phase 5 Implementation Note

Phase 5 moved the browser HTTP/EventSource client into `transport/http-client.ts`.
The root `http.ts` compatibility re-export remains temporarily for tests and
older internal imports.

## Phase 6 Implementation Note

Phase 6 moved runtime and CSS evidence into `features/evidence/`, updated tests
to import feature/runtime/transport paths directly, removed the temporary root
compatibility re-export files, and refreshed core architecture documentation.
