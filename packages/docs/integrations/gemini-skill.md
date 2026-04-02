# Gemini Onboarding

Inspecto does not ship a native Gemini skill directory. For Gemini CLI, the correct installation surface is `GEMINI.md`.

## Install

Use the shared installer:

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- gemini
```

This installs `GEMINI.md`.

Repository asset:

```text
assistant-integrations/gemini/GEMINI.md
```

Start a new Gemini CLI session after updating the file.

Then say:

```text
Set up Inspecto in this project and show me the plan before changing files
```

## What the Integration Does

The template tells Gemini CLI to prefer the official Inspecto CLI contract:

1. `detect --json`
2. `plan --json`
3. `apply --json`
4. `doctor --json`

If the installed CLI in the environment does not expose the structured onboarding commands yet, the template tells Gemini to explain that limitation and fall back to `inspecto init`.

## Notes

- Onboarding defaults to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json`.
- In monorepos, the onboarding flow may ask you to rerun from a single app directory if the project root contains multiple candidate apps.
- For response-field semantics, see the [Onboarding Contract](./onboarding-contract.md).
