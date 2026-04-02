# Skill-First Onboarding For Inspecto

## Summary

Inspecto should support a skill-first onboarding path for agent-based developer workflows, while keeping the CLI as the single execution engine for project detection, installation, config injection, and diagnostics.

The goal is to reduce first-install friction for developers already working inside agent environments such as Codex or Claude Code. Instead of asking users to discover and run `npx @inspecto-dev/cli init`, the user should be able to say "set up inspecto in this project" and let the agent complete the onboarding flow through a stable CLI protocol.

This is not a proposal to replace the CLI. It is a proposal to move the primary user-facing entry point to assistant-native onboarding integrations, and make the CLI easier for skills or instruction templates to orchestrate.

Current implementation status:

- The CLI now exposes `detect --json`, `plan --json`, `apply --json`, and `doctor --json`.
- Onboarding defaults to local-only settings (`settings.local.json` / `prompts.local.json`) unless shared mode is explicitly requested.
- Native onboarding skills now exist for Codex and Claude Code.
- Copilot, Cursor, Gemini, Trae, and Coco now ship as platform-native instruction templates or compatibility templates rather than native skills.

## Problem

Inspecto already has a capable `init` flow, but its onboarding is still CLI-native:

- Users must know that Inspecto exists and which command to run.
- Users must trust an interactive installer before they understand what it will change.
- Interactive prompts make agent-driven onboarding brittle.
- Failure recovery is documented, but not structured for automated follow-up.

This creates friction for the exact users most likely to benefit from Inspecto: developers working in AI-assisted coding loops who want the tool installed inside an existing project with minimal ceremony.

## Goals

- Make skill-based onboarding the preferred entry point for agent users.
- Preserve the CLI as the single source of truth for detection, planning, application, and diagnostics.
- Let agents explain the planned changes before applying them.
- Support non-interactive, structured execution with machine-readable output.
- Keep existing `init` behavior available for users outside skill-capable environments.

## Non-Goals

- Reimplement onboarding logic inside skills.
- Replace the existing CLI with agent-only flows.
- Standardize every possible skill platform in the first iteration.
- Solve the entire "using Inspecto after installation" workflow in this phase.

## Recommended Approach

Use a `skill-first, CLI-as-engine` architecture.

The skill becomes the main onboarding surface for users in agent environments. It performs lightweight repository inspection, frames the decision for the user, and invokes CLI subcommands that return structured results. The CLI remains responsible for environment detection, dependency installation, file mutation, and validation.

This keeps product ergonomics and execution reliability aligned:

- Skills are good at discovery, explanation, and orchestration.
- The CLI is good at deterministic execution and testing.

## User Flow

1. The developer asks the agent to install Inspecto in the current project.
2. The skill inspects the repository at a shallow level to confirm this is a supported front-end project and to gather context for user-facing messaging.
3. The skill invokes `inspecto detect --json`.
4. The CLI returns structured detection results, including framework, build tool, package manager, IDE/provider candidates, support status, and blockers.
5. The skill invokes `inspecto plan --json`.
6. The CLI returns a structured installation plan that lists dependencies, files to modify, configuration defaults, manual follow-up steps, and risk notes.
7. The skill summarizes the plan for the user and requests approval.
8. After approval, the skill invokes `inspecto apply`.
9. The CLI performs installation and returns structured success or failure details.
10. If onboarding fails, the skill invokes `inspecto doctor --json` and presents actionable recovery guidance.

## Responsibility Split

### Skill Responsibilities

- Provide the natural-language onboarding entry point.
- Gather shallow repository context for user communication.
- Call the CLI in a non-interactive, machine-readable way.
- Explain what will happen before applying changes.
- Ask for approval at the point of risk.
- Route failures into diagnostics and next steps.

### CLI Responsibilities

- Detect framework, build tool, package manager, IDE, and providers.
- Resolve a supported onboarding strategy.
- Generate a structured install plan.
- Install dependencies and mutate project files.
- Emit stable JSON output for success and failure cases.
- Run diagnostics and report blockers.

## CLI Surface Changes

The current interactive `init` flow should remain available, but Inspecto needs agent-friendly subcommands or flags.

### `inspecto detect --json`

Returns:

- Detected framework and version when available
- Detected build tool and version when available
- Package manager
- Candidate IDEs and providers
- Support level
- Blocking issues and warnings

### `inspecto plan --json`

Returns:

- Selected onboarding strategy
- Dependencies to install
- Files to create or modify
- Proposed provider default
- Required manual steps, if any
- Risks or unsupported edge cases

### `inspecto apply`

Accepts an explicit non-interactive plan or resolved options and performs the install.

Returns:

- Whether the install succeeded
- Which files changed
- Which dependencies were added
- Any post-install instructions
- Structured error details on failure

### `inspecto doctor --json`

Returns:

- Environment checks
- Failure classification
- Recommended recovery actions

## JSON Output Requirements

The CLI's machine-readable responses should be treated as a stable contract for skills.

Requirements:

- Distinguish `errors`, `warnings`, and `blockers`.
- Include a top-level `status` field.
- Return concrete file paths for planned and applied changes.
- Return provider identifiers using the same vocabulary as current settings.
- Avoid embedding critical state only in human-readable text.

## Why This Is Better Than Expanding `init`

Continuing to improve the existing interactive `init` command will help direct CLI users, but it will not change the primary onboarding experience for agent-native users. Those users do not want better prompts; they want the agent to absorb the prompts and present a single clear decision.

Skill-first onboarding addresses the actual friction:

- Lower discovery cost
- Lower command memorization cost
- Lower trust barrier through explain-before-apply planning
- Better failure recovery inside the same agent session

## MVP Scope

The first iteration stayed narrow in CLI scope, but expanded to multiple assistant entrypoints built on the same core flow.

- Add structured `detect`, `plan`, and `doctor` flows to the CLI.
- Add a non-interactive apply path built on top of current `init` internals.
- Ship assistant-specific onboarding skills for the primary agent environments.
- Update docs so agent users see the skill-first path before the CLI path.

## Deferred Work

- Post-onboarding skill flows beyond setup and diagnosis
- Full rollback support for partial installs
- Deep customization of provider strategy inside the skill flow
- Full assistant-platform standardization beyond the current entrypoint wrappers

## Risks

### CLI/Skill Drift

If the skill relies on undocumented output or ad hoc shell parsing, the integration will become fragile. Stable JSON contracts are required to prevent this.

### Duplicate Logic

If repository support detection or file mutation logic moves into the skill, maintenance cost will increase and onboarding behavior will diverge from the CLI path.

### Premature Platform Generalization

Trying to normalize every skill-capable agent environment in v1 will slow delivery and blur the product objective. The first version should validate the flow in one strong environment.

## Success Criteria

- A developer in a supported agent environment can onboard Inspecto without manually discovering the CLI command.
- The agent can explain planned changes before installation.
- The install path remains backed by the same execution logic as the current CLI flow.
- Failures can be diagnosed through structured CLI output without forcing the user back to documentation first.

## Open Questions

- Should `plan` be a separate subcommand or a `--dry-run --json` mode on `init`?
- How much approval granularity should the skill expose before `apply` runs?
