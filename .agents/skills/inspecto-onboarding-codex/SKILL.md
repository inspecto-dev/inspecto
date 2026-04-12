---
name: inspecto-onboarding-codex
description: Use when Codex should install or set up Inspecto in the current frontend project through the shared onboarding workflow.
---

# Inspecto Onboarding For Codex

Use Inspecto's structured CLI flow instead of hand-editing project files.

Always prefer the single-entry onboarding command over the legacy detect/plan/apply sequence.

## When to use

- The user asks Codex to install or set up Inspecto in the current project.
- The user wants Codex to explain what Inspecto will change before applying it.
- The user wants Codex to recover from a failed onboarding attempt.

## Workflow

1. Run `~/.codex/skills/inspecto-onboarding-codex/scripts/run-inspecto.sh onboard --json`.
2. If the result returns `status: "needs_target_selection"`, explain that this step chooses which local development build target should receive the Inspecto plugin and settings. Show the target `candidates`, ask the user which exact candidate to use, then rerun with `--target <candidateId>`, preferring the explicit `candidateId` field. The CLI also accepts a returned `configPath` as a compatibility fallback. Do not collapse the user's choice back to a package path when the same package has multiple build configs.
3. If the result returns `status: "needs_confirmation"`, summarize `summary.headline`, `summary.changes`, `summary.risks`, and `summary.manualFollowUp`, then ask for approval before rerunning with `--yes`.
4. If the user explicitly asked to see the plan before any changes, stop after the `needs_confirmation` summary and wait for approval.
5. If the result returns `status: "partial_success"` and `diagnostics.nextSteps` includes IDE extension installation, treat that as a blocking onboarding follow-up. Do not move on to dev-server validation until the extension is installed automatically or the user confirms they completed the manual install.
6. When manual IDE extension installation is needed, guide the user with the correct official path:
   - VS Code: `code --install-extension inspecto.inspecto`
   - VS Code Marketplace: `https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto`
   - Cursor / VSCodium / other derivatives: `https://open-vsx.org/extension/inspecto/inspecto`
7. If the result returns `status: "error"`, summarize `diagnostics.errors` and `diagnostics.nextSteps`. Run `~/.codex/skills/inspecto-onboarding-codex/scripts/run-inspecto.sh doctor --json` only when explicit recovery diagnostics are still needed.
8. Only after the IDE extension step is complete, read the onboarding result's `verification` field.
9. If `verification.available` is `true` and `verification.devCommand` is present, offer to start that exact command immediately for validation.
10. Otherwise, use `verification.message` and tell the user to start their normal dev server command manually.
11. If the result includes `handoff.patches`, treat them as the primary source of truth for the remaining work. Apply those patches directly before exploring framework docs or unrelated project files.
12. Only do broader documentation or repo exploration when a returned patch is clearly insufficient or conflicts with the local project structure.

## Fast Path

For the common "set up Inspecto in this project" request, use:

`~/.codex/skills/inspecto-onboarding-codex/scripts/run-inspecto.sh onboard --json --yes`

This should be the default for straightforward single-app repositories when the user did not ask to preview the plan first.

After this fast path succeeds, the next default action should be:

1. confirm the IDE extension is installed or guide the user through manual installation
2. only then offer to start the app's `dev` script for validation if it is clearly available

## Guardrails

- Let the Inspecto CLI own dependency installation, config injection, settings generation, and diagnostics.
- Default to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json` unless the user explicitly asks for shared config.
- Treat IDE extension installation as a required onboarding step, not an optional reminder.
- Prefer automatic IDE extension installation through the CLI. If that fails, explicitly guide the user to install it manually before moving on to runtime verification.
- Do not rewrite the plan by hand or edit config files directly unless the user explicitly asks for a manual fallback.
- Treat JSON `code` fields as the stable automation signal. Do not branch on free-form message text.
- Do not create a project-local `scripts/run-inspecto.sh`. Use the installed skill launcher or a directly available `inspecto` executable.
- Use the CLI's `verification` payload as the source of truth for dev-server validation. Do not guess custom start commands.
- Do not suggest restarting or validating the local dev server until the IDE extension step is complete.
- Prefer `handoff.patches`, `handoff.pendingSteps`, and `handoff.assistantPrompt` over ad-hoc investigation. Do not start with Next.js or Nuxt documentation searches when the CLI already returned concrete patch targets.

## Local Debugging

When debugging the skill against a local Inspecto checkout from a project outside the workspace, prefer environment-variable overrides instead of changing the target project:

- `INSPECTO_CLI_BIN=/absolute/path/to/inspecto/packages/cli/dist/bin.js`
- `INSPECTO_DEV_REPO=/absolute/path/to/inspecto`

Examples:

- `INSPECTO_CLI_BIN=/Users/tangjie/hugo.felix/inspecto/packages/cli/dist/bin.js ~/.codex/skills/inspecto-onboarding-codex/scripts/run-inspecto.sh onboard --json --yes`
- `INSPECTO_DEV_REPO=/Users/tangjie/hugo.felix/inspecto ~/.codex/skills/inspecto-onboarding-codex/scripts/run-inspecto.sh onboard --json --yes`

`INSPECTO_CLI_BIN` forces the skill to use your local CLI build. `INSPECTO_DEV_REPO` also makes the CLI install local `packages/plugin` and `packages/core` instead of fetching published packages.

## Codex Prompt Pattern

Use short prompts like:

- `Use $inspecto-onboarding-codex to set up Inspecto in this project`
- `Use $inspecto-onboarding-codex to show the Inspecto plan before changing files`
- `Use $inspecto-onboarding-codex to diagnose why Inspecto onboarding is blocked`
