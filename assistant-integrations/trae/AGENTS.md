# Inspecto Onboarding

Use this as a compatibility instruction for Trae-style agent runtimes.

When the user asks to set up Inspecto:

1. Prefer `detect --json`, `plan --json`, `apply --json`, and `doctor --json`.
2. Use `node packages/cli/bin/inspecto.js` inside the Inspecto repository.
3. Otherwise try `npx @inspecto-dev/cli@latest <command>`.
4. If structured onboarding commands are unavailable, fall back to `npx @inspecto-dev/cli@latest init`.

Rules:

- Explain `blockers` before making changes.
- Show the plan and ask for approval before `apply`.
- Default to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json`.
