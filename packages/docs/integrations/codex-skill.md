# Codex Skill

Inspecto ships an official Codex onboarding skill in this repository at `skills/inspecto-onboarding-codex`.

Use it when you want Codex to drive the full setup flow instead of manually running `inspecto init`.

## Install

Ask Codex to install the skill from this repository:

```text
Use $skill-installer to install https://github.com/inspecto-dev/inspecto/tree/main/skills/inspecto-onboarding-codex
```

You can also run the installer script directly:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo inspecto-dev/inspecto \
  --path skills/inspecto-onboarding-codex
```

After installation, restart Codex so it reloads the new skill.

Then say:

```text
Use $inspecto-onboarding-codex to set up Inspecto in this project
```

## What the Skill Does

The skill wraps the official Inspecto CLI contract:

1. `detect --json`
2. `plan --json`
3. `apply --json`
4. `doctor --json`

The agent should explain the plan before applying it, let the CLI perform all file mutations, and use `doctor --json` for failure recovery.

## Notes

- The first run may require network access because the skill falls back to `@inspecto-dev/cli@latest` when no local Inspecto CLI is installed.
- If the published CLI in your environment does not expose `detect`, `plan`, or `apply` yet, use the local Inspecto workspace CLI or wait for the next CLI release.
- In monorepos, the skill may ask you to rerun from a single app directory if the project root contains multiple candidate apps.
- Onboarding defaults to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json`.
- For response-field semantics, see the [Onboarding Contract](./onboarding-contract.md).
