---
name: inspecto-onboarding
description: Help users set up Inspecto in their project or diagnose Inspector runtime issues. Trigger this skill when the user asks "Set up Inspecto in this project" or similar queries.
---

# Inspecto Onboarding

Use this as a compatibility instruction for Trae IDE and Trae CLI agent runtimes.

When the user asks to set up Inspecto:

1. Prefer the single-entry flow: `onboard --json`.
2. If the result returns `status: "needs_target_selection"`, rerun with `--target <packagePath>`.
3. If the result returns `status: "needs_confirmation"`, summarize the proposed changes and wait for approval before rerunning with `--yes`.
4. Use `node packages/cli/bin/inspecto.js` inside the Inspecto repository.
5. Otherwise prefer an already available `inspecto` executable before falling back to `npx @inspecto-dev/cli@latest`.
6. Use `doctor --json` only for explicit recovery diagnostics.

Rules:

- Treat IDE extension installation as required before runtime verification.
- Use the CLI's `verification` field as the source of truth for the dev-server step.
- Default to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json`.
