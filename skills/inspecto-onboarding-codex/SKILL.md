---
name: inspecto-onboarding-codex
description: Use when Codex should install or set up Inspecto in the current frontend project through the shared onboarding workflow.
---

# Inspecto Onboarding For Codex

Use Inspecto's structured CLI flow instead of hand-editing project files.

## When to use

- The user asks Codex to install or set up Inspecto in the current project.
- The user wants Codex to explain what Inspecto will change before applying it.
- The user wants Codex to recover from a failed onboarding attempt.

## Workflow

1. Run `scripts/run-inspecto.sh detect --json`.
2. If detection returns `status: "blocked"`, summarize `blockers` and stop.
3. Run `scripts/run-inspecto.sh plan --json`.
4. Show the user the planned `actions`, `warnings`, and any manual constraints before making changes.
5. Ask for approval before running `apply`.
6. Run `scripts/run-inspecto.sh apply --json` after approval.
7. If `apply.status` is `warning`, show `postInstall.nextSteps`.
8. If `apply.status` is `blocked` or `error`, run `scripts/run-inspecto.sh doctor --json` and summarize the diagnostics.

## Guardrails

- Let the Inspecto CLI own dependency installation, config injection, settings generation, and diagnostics.
- Default to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json` unless the user explicitly asks for shared config.
- Do not rewrite the plan by hand or edit config files directly unless the user explicitly asks for a manual fallback.
- Treat JSON `code` fields as the stable automation signal. Do not branch on free-form message text.

## Codex Prompt Pattern

Use short prompts like:

- `Use $inspecto-onboarding-codex to set up Inspecto in this project`
- `Use $inspecto-onboarding-codex to show the Inspecto plan before changing files`
- `Use $inspecto-onboarding-codex to diagnose why Inspecto onboarding is blocked`
