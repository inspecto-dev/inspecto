# Onboarding Integrations

Inspecto ships assistant-specific onboarding integrations for the most common coding agents. Some platforms support native skills, while others use the platform's native instruction or rules mechanism. Every variant wraps the same CLI contract:

1. `detect --json`
2. `plan --json`
3. `apply --json`
4. `doctor --json`

They exist so users can say "set up Inspecto in this project" inside their assistant, review the plan, approve it, and let the CLI perform the actual file mutations.

For installation UX, prefer the shared installer script. Use raw asset URLs or local file copies only as a manual fallback.

## Recommended Install

Use the shared installer:

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

All onboarding integrations default to local-only settings:

- `.inspecto/settings.local.json`
- `.inspecto/prompts.local.json`

## Available Integrations

| Assistant                             | Type                   | Repository Path                           | Install Target                                         | Notes                                                      |
| :------------------------------------ | :--------------------- | :---------------------------------------- | :----------------------------------------------------- | :--------------------------------------------------------- |
| [Codex](./codex-skill.md)             | Native skill           | `skills/inspecto-onboarding-codex`        | Codex skills directory                                 | Best experience when installed through `$skill-installer`. |
| [Claude Code](./claude-code-skill.md) | Native skill           | `skills/inspecto-onboarding-claude-code`  | `.claude/skills/` or `~/.claude/skills/`               | Use the shared installer with the `claude-code` target.    |
| [Copilot](./copilot-skill.md)         | Instruction template   | `assistant-integrations/copilot`          | `.github/copilot-instructions.md` or `AGENTS.md`       | Use the shared installer with the `copilot` target.        |
| [Cursor](./cursor-skill.md)           | Rule template          | `assistant-integrations/cursor`           | `.cursor/rules/inspecto-onboarding.mdc` or `AGENTS.md` | Use the shared installer with the `cursor` target.         |
| [Gemini](./gemini-skill.md)           | Context template       | `assistant-integrations/gemini/GEMINI.md` | `GEMINI.md`                                            | Use the shared installer with the `gemini` target.         |
| [Trae](./trae-skill.md)               | Compatibility template | `assistant-integrations/trae/AGENTS.md`   | `AGENTS.md`                                            | Use the shared installer with the `trae` target.           |
| [Coco](./coco-skill.md)               | Compatibility template | `assistant-integrations/coco/AGENTS.md`   | `AGENTS.md`                                            | Use the shared installer with the `coco` target.           |

## Shared Workflow

Regardless of the assistant, the flow is the same:

1. Detect the current project.
2. Explain the onboarding plan.
3. Ask for approval before changes.
4. Apply the setup through the CLI.
5. Use `doctor --json` for failure recovery.

## Notes

- These integrations are onboarding-only in v1. They do not cover day-to-day Inspecto usage flows after installation.
- Native skills use `scripts/run-inspecto.sh` and prefer a local Inspecto workspace CLI when available.
- Instruction templates tell the assistant to prefer structured commands and fall back to `init` if the installed CLI does not expose the onboarding contract yet.
- For JSON field semantics and automation rules, see the [Onboarding Contract](./onboarding-contract.md).
