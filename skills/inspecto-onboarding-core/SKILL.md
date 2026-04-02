---
name: inspecto-onboarding-core
description: Use when creating or maintaining assistant-specific Inspecto onboarding skills that should follow the shared detect, plan, apply, and doctor workflow.
---

# Inspecto Onboarding Core

This is the shared onboarding workflow for assistant-specific Inspecto skills. It is a maintainer-facing reference, not the primary end-user entry point.

## Scope

Use this workflow when an assistant skill needs to set up Inspecto in the current project without hand-editing project files.

## Shared Flow

1. Run `scripts/run-inspecto.sh detect --json`.
2. If detection returns `status: "blocked"`, summarize `blockers` and stop.
3. Run `scripts/run-inspecto.sh plan --json`.
4. Show the user the planned `actions`, `warnings`, and manual constraints before making changes.
5. Ask for approval before running `apply`.
6. Run `scripts/run-inspecto.sh apply --json` after approval.
7. If `apply.status` is `warning`, show `postInstall.nextSteps`.
8. If `apply.status` is `blocked` or `error`, run `scripts/run-inspecto.sh doctor --json` and summarize the diagnostics.

## Guardrails

- Let the Inspecto CLI own dependency installation, config injection, settings generation, and diagnostics.
- Default to local-only settings: `.inspecto/settings.local.json` and `.inspecto/prompts.local.json`.
- Do not rewrite the plan by hand or edit config files directly unless the user explicitly asks for a manual fallback.
- Treat JSON `code` fields as the stable automation signal. Do not branch on free-form message text.
- Surface `manual_step` actions and `postInstall.nextSteps` to the user as required follow-up.
- If the plan reports a multi-app monorepo root or another blocked/manual strategy, ask the user to rerun from the intended app root instead of forcing `apply`.

## Command Runner

Always use `scripts/run-inspecto.sh`. It prefers a local Inspecto workspace CLI when available and otherwise falls back to the appropriate package-manager launcher:

- `node ./packages/cli/bin/inspecto.js`
- `./node_modules/.bin/inspecto`
- `pnpm dlx @inspecto-dev/cli@latest`
- `yarn dlx @inspecto-dev/cli@latest`
- `bunx @inspecto-dev/cli@latest`
- `npx @inspecto-dev/cli@latest`

The CLI command may need network access or permission escalation the first time it runs.

## References

- JSON contract and field semantics: `packages/docs/integrations/onboarding-contract.md`
- Assistant entrypoint docs: `packages/docs/integrations/codex-skill.md`, `packages/docs/integrations/claude-code-skill.md`
