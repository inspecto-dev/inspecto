# Inspecto Onboarding

Use the Inspecto CLI as the source of truth for onboarding:

1. Run `detect --json`.
2. Stop on `blocked` and explain `blockers`.
3. Run `plan --json` and show the plan before changes.
4. Ask for approval before `apply --json`.
5. Run `doctor --json` on failure.

Prefer `node packages/cli/bin/inspecto.js` in the Inspecto repo itself. Otherwise use `npx @inspecto-dev/cli@latest`. If the installed CLI does not yet expose structured onboarding commands, fall back to `npx @inspecto-dev/cli@latest init`.
