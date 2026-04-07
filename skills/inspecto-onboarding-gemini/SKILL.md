---
name: inspecto-onboarding
description: Help users install, configure, or diagnose Inspecto in the current workspace. Use this skill when asked to set up Inspecto.
---

# Inspecto Onboarding

When the user asks Gemini to set up Inspecto:

1. Prefer the single-entry flow: `onboard --json`.
2. If the result returns `status: "needs_target_selection"`, rerun with `--target <packagePath>`.
3. If the result returns `status: "needs_confirmation"`, summarize the proposed changes and wait for approval before rerunning with `--yes`.
4. Use `node packages/cli/bin/inspecto.js` when working inside the Inspecto repository.
5. Otherwise prefer an already available `inspecto` executable before falling back to `npx @inspecto-dev/cli@latest`.
6. Use `doctor --json` only for explicit recovery diagnostics.

Rules:

- Treat IDE extension installation as required before runtime verification.
- Let the Inspecto CLI perform dependency installation and config generation.
- Use the CLI's `verification` field as the source of truth for the dev-server step.
- Default to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json`.
- Do not rewrite Inspecto config files manually unless the user asks for a manual fallback.
