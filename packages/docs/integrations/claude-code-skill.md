# Claude Code Skill

Inspecto ships an official Claude Code onboarding skill in this repository at `skills/inspecto-onboarding-claude-code`.

Use it when you want Claude Code to drive the full setup flow instead of manually running `inspecto init`.

## Install

Claude Code supports native skills. The recommended path is the shared installer:

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- claude-code project
```

For a user-level install:

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- claude-code user
```

Manual fallback if you are working from a cloned Inspecto repository:

```bash
mkdir -p .claude/skills
cp -R path/to/inspecto/skills/inspecto-onboarding-claude-code .claude/skills/
```

Repository path:

```text
skills/inspecto-onboarding-claude-code
```

Restart Claude Code after installing the skill.

Then say:

```text
Use inspecto-onboarding-claude-code to set up Inspecto in this project
```

## What the Skill Does

The skill wraps the official Inspecto CLI contract:

1. `detect --json`
2. `plan --json`
3. `apply --json`
4. `doctor --json`

The assistant should explain the plan before applying it, let the CLI perform all file mutations, and use `doctor --json` for failure recovery.

## Notes

- The first run may require network access because the runner falls back to `@inspecto-dev/cli@latest` when no local Inspecto CLI is installed.
- If the published CLI in your environment does not expose `detect`, `plan`, or `apply` yet, use the local Inspecto workspace CLI or wait for the next CLI release.
- In monorepos, the skill may ask you to rerun from a single app directory if the project root contains multiple candidate apps.
- Onboarding defaults to `.inspecto/settings.local.json` and `.inspecto/prompts.local.json`.
- For response-field semantics, see the [Onboarding Contract](./onboarding-contract.md).
