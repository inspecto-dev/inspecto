---
name: inspecto-onboarding-core
description: Use when creating or maintaining assistant-specific Inspecto onboarding skills that should follow the shared detect, plan, apply, and doctor workflow.
---

# Inspecto Onboarding Core

This is the shared onboarding workflow for assistant-specific Inspecto skills. It is a maintainer-facing reference, not the primary end-user entry point.

## Scope

Use this workflow when an assistant skill needs to set up Inspecto in the current project without hand-editing project files.

## Shared Flow

1. Run `scripts/run-inspecto.sh onboard --json`.
2. If the result returns `status: "needs_target_selection"`, explain that this step chooses which local development build target should receive the Inspecto plugin and settings. Ask the user to choose one returned target candidate and rerun with `--target <candidateId>`, preferring the explicit `candidateId` field. The CLI also accepts a returned `configPath` as a compatibility fallback. Do not collapse the selection back to a package path when multiple build configs exist in the same package.
3. If the result returns `status: "needs_confirmation"`, summarize `summary` and ask for approval before rerunning with `--yes`.
4. If the result returns `status: "partial_success"` and the remaining step is IDE extension installation, treat that as a required onboarding follow-up.
5. If IDE extension installation must be done manually, guide the user with the documented install path before moving on:
   - `code --install-extension inspecto.inspecto`
   - `https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto`
   - `https://open-vsx.org/extension/inspecto/inspecto`
6. If the result returns `status: "error"`, summarize `diagnostics` and run `doctor --json` only when explicit recovery diagnostics are still needed.
7. Only after the IDE extension step is complete, use the onboarding result's `verification` payload. If `verification.available` is `true` and `verification.devCommand` is present, offer to start that exact command for validation. Otherwise, tell the user to run their usual dev command manually using `verification.message`.

## Guardrails

- Let the Inspecto CLI own dependency installation, config injection, settings generation, and diagnostics.
- Default to local-only settings: `.inspecto/settings.local.json` and `.inspecto/prompts.local.json`.
- Do not rewrite the plan by hand or edit config files directly unless the user explicitly asks for a manual fallback.
- Treat JSON `code` fields as the stable automation signal. Do not branch on free-form message text.
- Treat IDE extension installation as a required onboarding step.
- Surface `diagnostics.nextSteps` to the user as required follow-up.
- Do not create a project-local wrapper script as part of onboarding. Use the installed skill launcher or a directly available `inspecto` executable.
- Use the CLI's `verification` payload as the source of truth for dev-server validation.
- Do not suggest restarting or validating the local dev server until the IDE extension step is complete.

## Command Runner

Always use a stable launcher instead of generating one in the target project. The preferred order is:

- `node ./packages/cli/bin/inspecto.js`
- `inspecto`
- `./node_modules/.bin/inspecto`
- `pnpm dlx @inspecto-dev/cli@latest`
- `yarn dlx @inspecto-dev/cli@latest`
- `bunx @inspecto-dev/cli@latest`
- `npx @inspecto-dev/cli@latest`

The CLI command may need network access or permission escalation the first time it runs.

## References

- JSON contract and field semantics: `packages/docs/integrations/onboarding-contract.md`
- Assistant entrypoint docs: `packages/docs/integrations/onboarding-skills.md`
