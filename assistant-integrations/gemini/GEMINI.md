# Inspecto Onboarding

When the user asks Gemini CLI to install or connect Inspecto in the current project:

1. Prefer the structured Inspecto CLI flow:
   - `detect --json`
   - `plan --json`
   - `apply --json`
   - `doctor --json`
2. Use `node packages/cli/bin/inspecto.js` when working inside the Inspecto repository.
3. Otherwise try `npx @inspecto-dev/cli@latest <command>`.
4. If structured commands are unavailable, explain that the fallback is `npx @inspecto-dev/cli@latest init`.

Execution rules:

- Stop on `detect.status: blocked` and explain `blockers`.
- Show the onboarding plan and ask for approval before applying changes.
- Surface `manual_step` actions and `postInstall.nextSteps` to the user.
- Default to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json`.
- Let the Inspecto CLI own dependency installation, config injection, and diagnostics.
