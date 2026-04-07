---
name: inspecto-onboarding-claude-code
description: Use when Claude Code should install or set up Inspecto in the current frontend project through the shared onboarding workflow.
allowed-tools: Bash
---

# Inspecto Onboarding For Claude Code

Use Inspecto's structured CLI flow instead of hand-editing project files.

## When to use

- The user asks Claude Code to install or set up Inspecto in the current project.
- The user wants Claude Code to explain what Inspecto will change before applying it.
- The user wants Claude Code to recover from a failed onboarding attempt.

## Workflow

1. Run `scripts/run-inspecto.sh onboard --json`.
2. If the result returns `status: "needs_target_selection"`, show the target `candidates`, ask the user which app/package to use, then rerun with `--target <packagePath>`.
3. If the result returns `status: "needs_confirmation"`, summarize `summary.headline`, `summary.changes`, `summary.risks`, and `summary.manualFollowUp`, then ask for approval before rerunning with `--yes`.
4. If the user explicitly asked to see the plan before any changes, stop after the `needs_confirmation` summary and wait for approval.
5. If the result returns `status: "partial_success"` and `diagnostics.nextSteps` includes IDE extension installation, treat that as a blocking onboarding follow-up. Do not move on to dev-server validation until the extension is installed automatically or the user confirms they completed the manual install.
6. When manual IDE extension installation is needed, guide the user with the correct official path:
   - VS Code: `code --install-extension inspecto.inspecto`
   - VS Code Marketplace: `https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto`
   - Cursor / VSCodium / other derivatives: `https://open-vsx.org/extension/inspecto/inspecto`
7. If the result returns `status: "error"`, summarize `diagnostics.errors` and `diagnostics.nextSteps`. Run `scripts/run-inspecto.sh doctor --json` only when explicit recovery diagnostics are still needed.
8. Only after the IDE extension step is complete, use the onboarding result's `verification` payload.
9. If `verification.available` is `true` and `verification.devCommand` is present, offer to start that exact command immediately for validation.
10. Otherwise, use `verification.message` and tell the user to start their normal dev server command manually.

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

## Claude Code Prompt Pattern

Use short prompts like:

- `Use inspecto-onboarding-claude-code to set up Inspecto in this project`
- `Set up Inspecto here and show me the plan before changing files`
- `Use inspecto-onboarding-claude-code to diagnose why Inspecto onboarding is blocked`
