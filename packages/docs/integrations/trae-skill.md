# Trae Onboarding

Inspecto currently ships Trae onboarding as an `AGENTS.md` compatibility template.

## Install

Use the shared installer:

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- trae
```

This installs `AGENTS.md`.

Repository asset:

```text
assistant-integrations/trae/AGENTS.md
```

Start a new Trae chat after updating the file.

Then say:

```text
Set up Inspecto in this project and show me the plan before changing files
```

## What the Integration Does

The compatibility template tells Trae to prefer the official Inspecto CLI contract:

1. `detect --json`
2. `plan --json`
3. `apply --json`
4. `doctor --json`

If the installed CLI in the environment does not expose the structured onboarding commands yet, the template tells Trae to explain that limitation and fall back to `inspecto init`.

## Notes

- This is currently a compatibility template rather than a documented native Trae skill package.
- Onboarding defaults to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json`.
- For response-field semantics, see the [Onboarding Contract](./onboarding-contract.md).
