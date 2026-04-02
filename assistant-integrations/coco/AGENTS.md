# Inspecto Onboarding

Use this as a compatibility instruction for Coco-style agent runtimes.

When the user asks to install or set up Inspecto:

1. Prefer `detect --json`, `plan --json`, `apply --json`, and `doctor --json`.
2. Use `node packages/cli/bin/inspecto.js` inside the Inspecto repository.
3. Otherwise try `npx @inspecto-dev/cli@latest <command>`.
4. If structured onboarding commands are unavailable, explain the limitation and fall back to `npx @inspecto-dev/cli@latest init`.

Rules:

- Stop on `blocked` and explain why.
- Show planned changes before applying them.
- Ask for approval before `apply`.
- Default to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json`.
