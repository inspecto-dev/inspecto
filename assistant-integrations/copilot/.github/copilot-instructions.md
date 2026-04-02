# Inspecto Onboarding

When the user asks to install, set up, or connect Inspecto in this repository:

1. Prefer the structured CLI contract:
   - If this repo contains `packages/cli/bin/inspecto.js` and `packages/cli/dist`, run `node packages/cli/bin/inspecto.js detect --json`.
   - Otherwise try `npx @inspecto-dev/cli@latest detect --json`.
   - If structured commands are unavailable, explain that the CLI fallback is `npx @inspecto-dev/cli@latest init`.
2. If `detect.status` is `blocked`, summarize `blockers` and stop.
3. Run `plan --json` and show `actions`, `warnings`, and manual steps before changing files.
4. Ask for approval before running `apply --json`.
5. If `apply.status` is `warning`, show `postInstall.nextSteps`.
6. If `apply.status` is `blocked` or `error`, run `doctor --json` and summarize the diagnostics.

Guardrails:

- Let Inspecto CLI own dependency installation, config injection, settings generation, and diagnostics.
- Default to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json` unless the user explicitly asks for shared config.
- Do not hand-edit Inspecto config files unless the user explicitly asks for a manual fallback.
- Treat JSON `code` and `status` fields as the stable automation contract.
