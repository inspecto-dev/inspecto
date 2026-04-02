# Assistant Onboarding Integrations

This directory contains the platform-specific onboarding entrypoints for Inspecto.

The recommended installation path is the shared installer:

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- <assistant>
```

Examples:

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- claude-code project
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- copilot
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- cursor rules
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- gemini
```

- `skills/inspecto-onboarding-codex`: native Codex skill
- `skills/inspecto-onboarding-claude-code`: native Claude Code skill
- `assistant-integrations/copilot`: GitHub Copilot instruction templates
- `assistant-integrations/cursor`: Cursor rules and AGENTS templates
- `assistant-integrations/gemini`: Gemini CLI context template
- `assistant-integrations/trae`: compatibility instruction template
- `assistant-integrations/coco`: compatibility instruction template

All variants wrap the same structured onboarding contract:

1. `detect --json`
2. `plan --json`
3. `apply --json`
4. `doctor --json`

All onboarding entrypoints default to local-only settings:

- `.inspecto/settings.local.json`
- `.inspecto/prompts.local.json`
