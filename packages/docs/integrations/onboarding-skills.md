# Install Integrations

Inspecto provides onboarding integrations for common AI coding assistants to automate setup in your projects. Install the matching integration from your project root, and the CLI will try to open the onboarding flow in your host IDE automatically.

## Quick Start

The fastest path is:

1. **Navigate to your project root** (most integrations are project-level).
2. **Copy and run the matching install command**:

`--host-ide` values: `vscode`, `cursor`, `trae`, `trae-cn`.

::: code-group

```bash [Codex]
npx @inspecto-dev/cli integrations install codex --host-ide vscode
```

```bash [Claude Code]
npx @inspecto-dev/cli integrations install claude-code --scope project --host-ide vscode
```

```bash [Copilot]
npx @inspecto-dev/cli integrations install copilot --host-ide vscode
```

```bash [Cursor]
npx @inspecto-dev/cli integrations install cursor --host-ide cursor
```

```bash [Gemini]
npx @inspecto-dev/cli integrations install gemini --host-ide vscode
```

```bash [Trae]
npx @inspecto-dev/cli integrations install trae --host-ide trae-cn
```

```bash [Coco]
npx @inspecto-dev/cli integrations install coco --host-ide trae-cn
```

:::

3. **Follow the onboarding flow** opened by the CLI.

When you already know the host IDE, always prefer passing `--host-ide` explicitly. It avoids ambiguous IDE detection in plain terminal sessions.

If onboarding does not open automatically, say:

```text
Set up Inspecto in this project
```

## Installation Scopes

Depending on the assistant, the integration is installed either globally for your user, or locally for the current project.

- **Project-level** (run from your target project root): `Copilot`, `Cursor`, `Gemini`, `Trae`, `Coco`, and `Claude Code --scope project`.
- **User-level** (run from anywhere): `Codex --scope user`, `Claude Code --scope user`.

> **Important:** If you run a project-level install command from the wrong directory, the assistant won't be able to find the integration when you ask it for help!

## Available Integrations

Here is a full list of supported assistants and where their integrations are installed.

| Assistant   | Type         | Install Target                           | Notes                                            |
| :---------- | :----------- | :--------------------------------------- | :----------------------------------------------- |
| Codex       | Native skill | `.agents/skills/` or `~/.agents/skills/` | User-level or Project-level.                     |
| Claude Code | Native skill | `.claude/skills/` or `~/.claude/skills/` | User-level or Project-level.                     |
| Copilot     | Native skill | `.github/skills/inspecto-onboarding/`    | Project-level. Run from the target project root. |
| Cursor      | Native skill | `.cursor/skills/inspecto-onboarding/`    | Project-level. Run from the target project root. |
| Gemini      | Native skill | `.gemini/skills/inspecto-onboarding/`    | Project-level. Run from the target project root. |
| Trae        | Native skill | `.trae/skills/inspecto-onboarding/`      | Project-level. Run from the target project root. |
| Coco        | Native skill | `.traecli/skills/inspecto-onboarding/`   | Project-level. Run from the target project root. |

All onboarding integrations will by default write configuration into local-only files (`.inspecto/settings.local.json` and `.inspecto/prompts.local.json`), keeping your repository clean.

Common install examples:

::: code-group

```bash [Codex]
npx @inspecto-dev/cli integrations install codex --host-ide vscode
```

```bash [Claude Code]
# Project-level
npx @inspecto-dev/cli integrations install claude-code --scope project --host-ide vscode

# User-level
npx @inspecto-dev/cli integrations install claude-code --scope user --host-ide vscode
```

```bash [Copilot]
npx @inspecto-dev/cli integrations install copilot --host-ide vscode
```

```bash [Cursor]
npx @inspecto-dev/cli integrations install cursor --host-ide cursor
```

```bash [Gemini]
npx @inspecto-dev/cli integrations install gemini --host-ide vscode
```

```bash [Trae]
npx @inspecto-dev/cli integrations install trae --host-ide trae-cn
```

```bash [Coco]
npx @inspecto-dev/cli integrations install coco --host-ide trae-cn
```

:::

Use `inspecto integrations doctor <assistant> --host-ide <ide> --compact` only when you want to check blockers before install, or when you need to troubleshoot.

## How It Works Under the Hood

The integrations work by exposing Inspecto's structured CLI onboarding contract to your assistant. When you ask it to set up Inspecto, it will execute:

1. `onboard --json`: Analyzes the project and returns a structured plan.
2. `onboard --json --target <packagePath>`: Reruns if target selection is needed in monorepos.
3. `onboard --json --yes`: Applies the code mutations after your confirmation.
4. Guides you through installing the IDE extension (a required step).
5. Confirms the dev server start command.

This guarantees that the actual file modifications are always safely performed by the Inspecto CLI parser, rather than relying on the assistant to hand-edit your configuration files.

> For JSON field semantics and automation rules, see the [Onboarding Contract](./onboarding-contract.md).
>
> For `inspecto integrations doctor --json` field semantics and exit codes, see `packages/cli/README.md`.
