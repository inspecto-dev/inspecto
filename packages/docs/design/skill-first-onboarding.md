# Skill-First Onboarding Design

## Summary

Inspecto onboarding is now designed as **assistant-first UX + CLI-as-engine**:

- Assistants and skills provide the user-facing entrypoint.
- CLI performs all detection, install, file mutation, and diagnostics.
- The machine contract is single-entry: `inspecto onboard --json`.

`inspecto init` remains the terminal fallback for users outside assistant workflows.

## Goals

- Keep onboarding easy to trigger: one install command + one assistant prompt.
- Keep execution deterministic: all writes happen in CLI code, not in skills.
- Keep automation robust: structured statuses drive retries and branching.
- Keep recovery explicit: diagnostics only when onboarding reports failure.

## Non-Goals

- Reimplement install logic inside assistant integrations.
- Keep multi-step detect/plan/apply orchestration as the primary protocol.
- Cover post-onboarding daily usage flows in this phase.

## Contract

Preferred assistant/runtime flow:

1. Run `inspecto onboard --json`
2. If `status = needs_target_selection`, rerun with `--target <candidateId>` using one of the returned target candidates
3. If `status = needs_confirmation`, show summary and rerun with `--yes`
4. If `status = error`, run `inspecto doctor --json`

The contract also returns:

- `ideExtension`: required extension-install follow-up metadata
- `verification`: guidance for restarting/validating dev server
- `summary`/`result`: user-facing plan + mutation outcome

Legacy `detect --json` / `plan --json` / `apply --json` remain low-level debug paths, not the recommended assistant protocol.

## Required Post-Apply Sequence

After onboarding reports success, integrations must follow this order:

1. Complete IDE extension installation (required)
2. If auto-install fails, guide with official install command/links
3. Only then restart dev server automatically (when command is clear) or prompt user to run it
4. Validate the browser flow through the launcher, `Inspect` / `Annotate`, and quick jump

This prevents false-positive “setup success” when extension setup is missing.

## Responsibility Split

### Assistant Integration

- Trigger `onboard --json` and route status-based retries.
- Confirm planned changes before rerunning with `--yes`.
- Enforce IDE extension completion before verification.
- Start/restart dev server only when command inference is reliable.

### CLI

- Detect package manager, framework, build tool, and candidate providers.
- Apply dependency/config/file changes.
- Return stable JSON status + diagnostics payloads.
- Provide extension and verification guidance in response payload.

## Success Criteria

- Users can complete onboarding from assistant context without command discovery.
- Average setup time drops by removing extra round-trips and manual guesswork.
- Documentation exposes one clear entrypoint and one clear fallback.
- Failures can be recovered via machine-readable diagnostics.
