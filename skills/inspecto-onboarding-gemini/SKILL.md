---
name: inspecto-onboarding
description: Help users install, configure, or diagnose Inspecto in the current workspace. Use this skill when asked to set up Inspecto.
---

# Inspecto Onboarding

When the user asks Gemini to set up Inspecto:

1. Prefer the single-entry flow: `onboard --json`.
2. If the result returns `status: "needs_target_selection"`, explain that this step chooses which local development build target should receive the Inspecto plugin and settings. Choose one returned target candidate and rerun with `--target <candidateId>`, preferring the explicit `candidateId` field. The CLI also accepts a returned `configPath` as a compatibility fallback. Do not collapse the selection back to a package path when multiple build configs exist in the same package.
3. If the result returns `status: "needs_confirmation"`, summarize the proposed changes and wait for approval before rerunning with `--yes`.
4. If the result returns `status: "partial_success"` and `diagnostics.nextSteps` includes IDE extension installation, treat that as a blocking onboarding follow-up. Do not move on to dev-server validation until the extension is installed automatically or the user confirms they completed the manual install.
5. If the result includes `handoff.patches`, treat them as the primary source of truth for the remaining work. Apply those patches directly before exploring framework docs or unrelated project files.
6. Only do broader documentation or repo exploration when a returned patch is clearly insufficient or conflicts with the local project structure.
7. Use `node packages/cli/bin/inspecto.js` when working inside the Inspecto repository.
8. Otherwise prefer an already available `inspecto` executable before falling back to `npx @inspecto-dev/cli@latest`.
9. Use `doctor --json` only for explicit recovery diagnostics.

Rules:

- Treat IDE extension installation as required before runtime verification.
- Let the Inspecto CLI perform dependency installation and config generation.
- Use the CLI's `verification` field as the source of truth for the dev-server step.
- Default to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json`.
- Do not rewrite Inspecto config files manually unless the user asks for a manual fallback.
- Prefer `handoff.patches`, `handoff.pendingSteps`, and `handoff.assistantPrompt` over ad-hoc investigation. Do not start with Next.js or Nuxt documentation searches when the CLI already returned concrete patch targets.

## Local Debugging

When debugging the skill against a local Inspecto checkout from a project outside the workspace, prefer environment-variable overrides instead of changing the target project:

- `INSPECTO_CLI_BIN=/absolute/path/to/inspecto/packages/cli/dist/bin.js`
- `INSPECTO_DEV_REPO=/absolute/path/to/inspecto`
