# Supported AI Tools

Inspecto bridges the gap between your browser and your AI assistant. It supports multiple interaction modes depending on how your AI tool is architected.

## Onboarding

In agent-capable environments, have the agent run the structured onboarding flow:

1. `inspecto detect --json`
2. `inspecto plan --json`
3. `inspecto apply`
4. `inspecto doctor --json`

For field-level response semantics, examples, and status handling, see the [Onboarding Contract](./onboarding-contract.md).

If you want an assistant-specific entrypoint instead of calling the CLI contract directly, use the matching setup from [Onboarding Integrations](./onboarding-skills.md).

If you are setting up Inspecto manually in a terminal, use `inspecto init` as the guided fallback.

## Interaction Modes

### 1. Extension Mode

The AI tool is installed as an IDE extension (e.g., in VS Code). Inspecto will use the IDE's custom URI schemes to dispatch the prompt to the AI chat panel.

**Supported:**

- GitHub Copilot (`copilot.extension`)
- Claude Code (`claude-code.extension`)
- Gemini Code Assist (`gemini.extension`)
- CodeX (`codex.extension`)

### 2. Built-in Mode

The AI tool is natively integrated into a fork of the IDE. No extensions are required. Inspecto will open the local file and trigger the native AI chat panel.

**Supported:**

- Cursor (`cursor.builtin`)
- Trae (`trae.builtin`)

### 3. CLI Mode

The AI tool runs entirely within the terminal. Inspecto will open a new terminal panel in your IDE, launch the CLI tool (if not already running), and paste the prompt.

**Supported:**

- Claude Code CLI (`claude-code.cli`)
- Trae CLI / Coco (`coco.cli`)
- Gemini CLI (`gemini.cli`)
- CodeX CLI (`codex.cli`)

## Switching Providers

The structured onboarding flow and `init` command will detect the AI tools installed on your machine and prompt you to select the default one.

To change it later, simply update your `.inspecto/settings.local.json`:

```json
{
  "provider.default": "claude-code.cli"
}
```

## Adding Custom CLI Arguments

If you are using CLI mode and want to pass specific arguments to your AI tool on startup (e.g., passing a specific flag to Claude), you can configure it via the settings file:

```json
{
  "provider.claude-code.cli.args": ["--dangerously-skip-permissions"]
}
```
