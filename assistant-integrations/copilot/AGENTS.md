# Inspecto Onboarding

When the user asks this agent to set up Inspecto in the current project:

1. Prefer `inspecto detect --json`, `plan --json`, `apply --json`, and `doctor --json`.
2. Use `node packages/cli/bin/inspecto.js` when onboarding the Inspecto repo itself.
3. Otherwise try `npx @inspecto-dev/cli@latest <command>`.
4. If the installed CLI does not expose structured onboarding commands yet, tell the user and fall back to `npx @inspecto-dev/cli@latest init`.

Execution rules:

- Stop and explain `blockers` before applying changes.
- Show the onboarding plan and ask for approval before `apply`.
- Surface `manual_step` actions and `postInstall.nextSteps` exactly as required follow-up.
- Default to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json`.
