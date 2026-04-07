# Onboard Single-Entry Design

## Summary

Replace the assistant-facing multi-step onboarding contract with a single structured CLI entrypoint: `inspecto onboard --json`.

The new entrypoint keeps the CLI as the only execution engine, but collapses assistant orchestration into one lifecycle that can detect the project, resolve a target app, decide whether confirmation is required, apply the setup, and attach recovery guidance when needed.

This design targets the current user-facing problem directly: skill-assisted onboarding takes noticeably longer than direct CLI onboarding because assistants still need to coordinate multiple structured commands and often re-explain or re-run steps. The first version should optimize for “one trigger, one lightweight decision, one clear result” rather than for a perfectly silent fully automatic install in every environment.

## Goals

- Make assistant onboarding feel close to `inspecto init` in end-user effort.
- Give assistants a single structured command to call for setup instead of a multi-command protocol.
- Support both single-project repositories and monorepos in the first version.
- Treat partially automated bundler flows as successful onboarding with follow-up steps, not as generic failure.
- Reuse existing CLI detection, planning, mutation, and diagnostics logic instead of rebuilding logic in skills or templates.
- Preserve `init` as the terminal-first interactive fallback for users who are not using an assistant-driven setup flow.

## Non-Goals

- Do not reimplement onboarding logic inside assistant skills, instruction templates, or compatibility templates.
- Do not remove `detect`, `plan`, `apply`, or `doctor` immediately from the CLI; they may remain for debugging and development workflows.
- Do not guarantee zero-confirmation onboarding for every repository shape in `v1`.
- Do not solve all post-install day-two workflows after Inspecto is already installed.
- Do not build a heavy scoring or ranking engine for monorepo target selection in the first iteration.

## Problem Statement

The current assistant-facing onboarding model still reflects a staged protocol:

1. detect the environment
2. plan the install
3. explain the plan
4. ask for approval
5. apply the changes
6. run diagnostics if needed

That model was a good first step toward structured onboarding, but it now creates the wrong default UX:

- assistants need to coordinate multiple CLI calls for one user intent
- user-facing explanation becomes its own time cost
- monorepos still fall out of the happy path too easily
- the protocol boundary does not match how users think about setup, which is one task, not four tasks
- partially supported build tools are too easy to interpret as failure instead of guided completion

At the same time, CLI installation of integrations is now stronger and more unified, including Codex. This reduces the importance of installation-asset friction and shifts the optimization target toward the onboarding execution path itself.

## Recommended Approach

Use `inspecto onboard --json` as the single assistant-facing onboarding contract.

Internally, `onboard` orchestrates five steps:

1. build onboarding context
2. resolve the target project or package
3. build a structured onboarding summary and confirmation gate
4. apply the onboarding plan when allowed
5. attach diagnostics and next steps when the outcome is partial or failed

This keeps the CLI as the source of truth while removing multi-command coordination from the assistant layer.

## Command Boundary

### `inspecto onboard --json`

This becomes the recommended assistant entrypoint.

It is responsible for:

- detecting frameworks, build tools, IDEs, and providers
- resolving a monorepo target when possible
- deciding whether a confirmation step is required
- applying setup steps when the flow is ready to continue
- returning a result model designed for assistants, not for humans reading terminal logs

### `inspecto init`

`init` remains the terminal-first guided experience.

It keeps prompt-oriented output and direct interactive choices, but should share the same underlying orchestration primitives as `onboard`.

### `inspecto detect|plan|apply|doctor`

These commands may remain available for debugging, testing, or low-level integration work, but they are no longer the recommended assistant protocol.

The product-facing docs and integration assets should guide assistants toward `onboard --json` first.

## Result Model

The new command should expose assistant-oriented status values instead of requiring skills to reinterpret low-level `ok`, `warning`, and `blocked` states.

### Top-Level Status Values

- `success`: onboarding completed and no manual follow-up remains.
- `partial_success`: Inspecto is set up enough to continue, but some manual follow-up remains.
- `needs_target_selection`: a target app or package must be chosen before setup can continue.
- `needs_confirmation`: the CLI has a safe summarized proposal but should pause for one lightweight user decision.
- `error`: onboarding could not proceed or could not recover enough to leave the project in a clearly usable state.

These values should be treated as the primary branch for assistant behavior.

## Response Shape

`inspecto onboard --json` should return six top-level sections:

### `status`

The assistant-facing outcome type.

### `target`

Structured target-resolution data:

- `status`: `resolved | needs_selection`
- `selected`: selected package or app path when available
- `candidates`: candidate targets with enough detail for assistant display
- `reason`: why a target was selected automatically or why user selection is required

### `summary`

A compact explanation payload designed for assistant messaging:

- `headline`
- `changes`
- `risks`
- `manualFollowUp`

This is not a full execution log. It is a concise summary for one short user-facing message.

### `confirmation`

- `required: boolean`
- `reason`
- `question`

This allows the CLI to tell the assistant when it should pause and what question it should ask.

### `result`

Present only after execution or partial execution. It should include:

- changed files
- installed dependencies
- selected provider default
- selected IDE
- mutation records

### `diagnostics`

Present for `partial_success` and `error`, and optionally for recoverable warnings. It should include:

- warnings
- errors
- next steps
- optional distilled recovery notes derived from `doctor`

## Monorepo Target Resolution

`onboard` must not treat “multiple supported targets” as an automatic blocker.

Instead it should classify target resolution into three cases:

### Single Target

If only one valid target exists, select it and continue automatically.

### Multiple Targets With High Confidence

If multiple candidates exist but one clearly looks like the intended target, preselect it and continue with either:

- no pause at all when risk is low, or
- one lightweight confirmation when the assistant should make the default visible

The response should still include alternate candidates.

### Multiple Targets With Low Confidence

Return `needs_target_selection` and provide structured candidates for the assistant to show in one message.

The user should not have to change directories manually and rerun onboarding from scratch.

### Candidate Data

Each candidate should include enough structured detail for a useful assistant summary:

- `packagePath`
- detected frameworks
- detected build tool
- config path
- whether automatic injection is supported

### Initial Heuristics

The first implementation should keep heuristics simple and explainable:

- prefer targets with supported framework plus supported build config
- prefer likely app packages over docs/examples/playground targets
- prefer targets with automatic injection support when multiple candidates are otherwise similar
- avoid opaque scoring that cannot be surfaced to the user

## Confirmation Strategy

The current “always show the full plan before changing files” model should be replaced with a summarized, risk-aware confirmation policy.

### Auto-Advance Cases

Proceed automatically when all of the following are true:

- target resolution is clear
- provider and IDE defaults are clear or safely optional
- automation path is well supported
- planned changes are routine and low risk

### Lightweight Confirmation Cases

Pause once when one of the following is true:

- a monorepo target was preselected but should be made visible
- multiple provider or IDE candidates remain relevant
- the flow will end in `partial_success`
- extension installation or another non-core step will be skipped intentionally
- the CLI detects risk that is real but not severe enough to fail

### Failure Cases

Return `error` directly when:

- no supported target exists
- no supported framework exists and no usable manual route is available
- the environment is too incomplete to produce a meaningful onboarding path
- execution fails in a way that leaves no clear actionable recovery path

## Partial Success Semantics

`partial_success` is a first-class result, not a thin wrapper around `warning`.

This status should be used when onboarding completed enough to leave the repository in a meaningfully improved state, but the user still needs to perform manual steps.

Typical first-version examples:

- dependencies installed and settings written, but bundler plugin registration still requires a manual config change
- IDE extension setup could not complete automatically, but the project is otherwise ready
- automatic mutation succeeded for some targets, while one remaining supported target still needs a guided manual step

The assistant should be able to tell the user: Inspecto is mostly set up, here is exactly what remains.

## Bundler Support Policy

The onboarding result should distinguish three categories of build tool handling:

### Fully Automated

The CLI can inject and configure the required Inspecto plugin automatically.

### Recognized With Manual Follow-Up

The CLI understands the build stack and can still complete meaningful setup steps, but plugin registration must be done manually.

These cases should end in `partial_success`, not generic failure.

### Unsupported Or Unrecognized

The CLI cannot produce a meaningful onboarding path. These cases remain `error` or `needs_confirmation`, depending on whether a fallback path exists.

## Internal Architecture

The design should be implemented by extracting reusable orchestration units from the current CLI commands rather than by building a second onboarding implementation.

### Shared Units

- `buildOnboardingContext(...)`
- target resolution helper extracted from current `init` monorepo handling
- planning summary builder
- `applyOnboardingPlan(...)`
- optional diagnostics adapter that can incorporate `doctor` results into `onboard`

### Internal Session Resolver

Introduce an internal orchestration helper, conceptually similar to `resolveOnboardingSession(...)`, that returns:

- resolved context
- target-resolution state
- assistant summary
- confirmation metadata
- executable apply input when ready

Both `init` and `onboard` can depend on this shared resolver while preserving different output styles.

## Migration Strategy

### Phase 1: Extract Shared Target Resolution

Move monorepo target selection and candidate construction into reusable onboarding helpers.

### Phase 2: Build Assistant Summary And Confirmation Layer

Teach planning code to emit concise assistant-oriented summaries and confirmation reasons instead of only blocker/action lists.

### Phase 3: Add `onboard --json`

Wire the new orchestration flow into one command that can stop early for selection/confirmation or continue through apply.

### Phase 4: Integrate Diagnostics

Attach distilled `doctor` guidance automatically for partial and failed outcomes.

### Phase 5: Update Docs And Integration Assets

Switch onboarding docs and assistant integrations to recommend `onboard --json` as the primary assistant contract.

## Testing Strategy

### CLI Command Tests

- single-project supported app returns `success`
- single-project manual-follow-up app returns `partial_success`
- monorepo with one obvious app preselects or resolves automatically
- monorepo with ambiguous candidates returns `needs_target_selection`
- low-risk supported app bypasses confirmation
- risky but valid app returns `needs_confirmation`

### Shared Resolver Tests

- candidate extraction matches current `init` behavior for monorepos
- summary generation remains concise and deterministic
- confirmation reasons map to the right scenarios
- apply input uses the resolved project root instead of re-deriving everything from repo root

### Diagnostics Tests

- partial success includes structured next steps
- recoverable apply failures attach recovery guidance
- hard failures preserve actionable error messages without pretending the install completed

### Regression Tests

- `init` still works for existing terminal users
- `apply` still works for low-level workflows that explicitly call it
- provider and IDE defaults remain consistent with current settings vocabulary

## Risks

### Dual Semantics During Transition

If `onboard` uses a new status model while older commands still expose `ok/warning/blocked`, internal adapters can become confusing. The implementation should keep translation logic explicit and local.

### Over-Automation In Monorepos

If auto-preselection is too aggressive, assistants may configure the wrong app. The first version should bias toward visible defaults and easy user override.

### Status Inflation

If too many edge cases become `partial_success`, the signal may become noisy. Use it only when the repository is materially closer to working than before the command started.

### Assistant Drift

If assistant templates summarize onboarding differently from CLI-produced summary fields, UX will diverge again. The CLI must remain the authoritative producer of summary and confirmation metadata.

## Success Criteria

- An assistant can onboard Inspecto through one primary CLI command.
- Single-project happy paths complete with less back-and-forth than the old staged protocol.
- Monorepo onboarding no longer depends on telling the user to rerun from a subdirectory.
- Recognized manual-follow-up bundlers return `partial_success` with concrete next steps.
- The same core execution logic continues to power both `init` and assistant onboarding.
- Product docs can describe assistant onboarding as one setup flow rather than as a protocol of separate CLI calls.

## Open Questions Deferred To Planning

- Exact CLI flag shape for supplying a user-selected monorepo target back into `onboard`
- Whether `onboard` should support a `--confirm=false` style non-interactive override for advanced automation
- How much of `doctor` output should be surfaced directly versus distilled into onboarding-specific recovery messages
