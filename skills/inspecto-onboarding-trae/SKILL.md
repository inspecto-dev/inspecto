---
name: inspecto-onboarding
description: Help users set up Inspecto in their project or diagnose Inspector runtime issues. Trigger this skill when the user asks "Set up Inspecto in this project" or similar queries.
allowed-tools: Bash
---

# Inspecto Onboarding

Use this as a compatibility instruction for Trae IDE and Trae CLI agent runtimes.
Use Inspecto's structured CLI flow instead of hand-editing project files. Always prefer the single-entry onboarding command.

## Workflow

1. Execute the Inspecto CLI to get the JSON plan.
   - Run `scripts/run-inspecto.sh onboard --json`.
   - The launcher already prefers `INSPECTO_CLI_BIN`, `INSPECTO_DEV_REPO`, a locally available `inspecto` executable, and only falls back to `@latest` as the last resort.
2. If the result returns `status: "needs_target_selection"`, explain that this step chooses which local development build target should receive the Inspecto plugin and settings. Show the target `candidates`, prefer each candidate's `candidateId`, ask the user which exact candidate to use, then rerun with `--target <candidateId>`. The CLI also accepts a returned `configPath` as a compatibility fallback. Do not collapse the user's choice back to a package path when the same package has multiple build configs.
   - If the user names a config file that is not present in the returned `candidates`, stop and explain that Inspecto did not recognize that config as a valid onboarding target. Do not force the target, do not guess another value, and do not begin manual config edits unless the user explicitly asks for a manual fallback.
3. If the result returns `status: "needs_confirmation"`, summarize `summary.headline`, `summary.changes`, `summary.risks`, and `summary.manualFollowUp`, then ask for approval before rerunning with `--yes`.
4. If the user explicitly asked to see the plan before any changes, stop after the `needs_confirmation` summary and wait for approval.
5. If the result returns `status: "partial_success"` and `diagnostics.nextSteps` includes IDE extension installation, treat that as a blocking onboarding follow-up. Do not move on to dev-server validation until the extension is installed automatically or the user confirms they completed the manual install.
6. When manual IDE extension installation is needed, guide the user to search "Inspecto" in the Trae Extension Marketplace and install it.
7. If the result returns `status: "error"`, summarize `diagnostics.errors` and `diagnostics.nextSteps`. Run `scripts/run-inspecto.sh doctor --json` only when explicit recovery diagnostics are still needed.
8. Only after the IDE extension step is complete, read the onboarding result's `verification` field.
9. If `verification.available` is `true` and `verification.devCommand` is present, offer to start that exact command immediately for validation.
10. Otherwise, use `verification.message` and tell the user to start their normal dev server command manually.

## Fast Path

Use the CLI with `--yes` only when the user explicitly wants direct setup without reviewing the plan first (for example: "install it now", "use the defaults", or "skip the preview").

Example:

`scripts/run-inspecto.sh onboard --json --yes`

For the normal "set up Inspecto in this project" request, start with `onboard --json` and respect `needs_confirmation` when the CLI asks for it.

## Guardrails

- Let the Inspecto CLI own dependency installation, config injection, settings generation, and diagnostics.
- Default to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json` unless the user explicitly asks for shared config.
- Treat IDE extension installation as a required onboarding step, not an optional reminder.
- Do not rewrite the plan by hand or edit config files directly unless the user explicitly asks for a manual fallback.
- If `needs_target_selection` keeps returning after rerunning with a returned `candidateId` or `configPath`, stop and report that target resolution is blocked. Do not guess alternate targets, install packages manually, or edit config files directly.
- Treat JSON `code` fields as the stable automation signal. Do not branch on free-form message text.
- Do not create a project-local `scripts/run-inspecto.sh`. Use the installed skill launcher or a directly available `inspecto` executable.
- Use the CLI's `verification` payload as the source of truth for dev-server validation. Do not guess custom start commands.
- Do not suggest restarting or validating the local dev server until the IDE extension step is complete.

## Local Debugging

When debugging the skill against a local Inspecto checkout from a project outside the workspace, prefer environment-variable overrides instead of changing the target project:

- `INSPECTO_CLI_BIN=/absolute/path/to/inspecto/packages/cli/dist/bin.js`
- `INSPECTO_DEV_REPO=/absolute/path/to/inspecto`

Examples:

- `INSPECTO_CLI_BIN=/Users/tangjie/hugo.felix/inspecto/packages/cli/dist/bin.js scripts/run-inspecto.sh onboard --json`
- `INSPECTO_DEV_REPO=/Users/tangjie/hugo.felix/inspecto scripts/run-inspecto.sh onboard --json`
