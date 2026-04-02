# Cursor Onboarding

Inspecto does not ship a native Cursor skill directory. For Cursor, the correct installation surface is a rules file.

## Recommended Install

Use the shared installer:

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- cursor rules
```

This installs `.cursor/rules/inspecto-onboarding.mdc`.

## Alternative Install

If your team standardizes on `AGENTS.md`, use:

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- cursor agents
```

Repository assets:

```text
assistant-integrations/cursor/.cursor/rules/inspecto-onboarding.mdc
assistant-integrations/cursor/AGENTS.md
```

Open a new Cursor chat after updating the rule.

Then say:

```text
Set up Inspecto in this project and show me the plan before changing files
```

## What the Integration Does

The rule tells Cursor to prefer the official Inspecto CLI contract:

1. `detect --json`
2. `plan --json`
3. `apply --json`
4. `doctor --json`

If the installed CLI in the environment does not expose the structured onboarding commands yet, the rule tells Cursor to explain that limitation and fall back to `inspecto init`.

## Notes

- Onboarding defaults to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json`.
- In monorepos, the onboarding flow may ask you to rerun from a single app directory if the project root contains multiple candidate apps.
- For response-field semantics, see the [Onboarding Contract](./onboarding-contract.md).
