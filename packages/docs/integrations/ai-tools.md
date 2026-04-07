# Supported AI Tools

Inspecto bridges the gap between your browser and your AI assistant. It supports multiple interaction modes depending on how your AI tool is architected.

When you use the structured onboarding flow or `inspecto init`, the CLI currently probes two install surfaces automatically: CLI tools and IDE extensions. Built-in IDE targets are still supported by the runtime, but they are not auto-detected by the CLI onboarding probe yet.

## Onboarding

For most users, the default path is **assistant-first onboarding**:

1. Run `inspecto integrations install <assistant> --host-ide <ide>` from the target project root.
2. Follow the onboarding flow opened by the CLI.
3. If onboarding did not open automatically, ask the assistant to set up Inspecto in this project.
4. Use `inspecto integrations doctor <assistant> --host-ide <ide> --compact` only when you want to check blockers before install or troubleshoot.

Then open the app in the browser, use the launcher for `Inspect mode` or `Annotate mode`, and use `Alt` + `Click` anytime for `Quick jump`.

If you are setting up Inspecto manually in a terminal, use `inspecto init` as the guided fallback.

If you are building your own agent/runtime integration, use the structured onboarding flow directly:

1. `inspecto onboard --json`
2. if `status` is `needs_target_selection`, rerun with `--target <packagePath>`
3. if `status` is `needs_confirmation`, confirm the planned changes and rerun with `--yes`
4. complete the required `ideExtension` step first (auto-install when possible, otherwise show install links/commands)
5. then follow `verification` guidance to restart or prompt for dev-server validation
6. if `status` is `error`, run `inspecto doctor --json`

For field-level response semantics and status handling, see [Onboarding Integrations](./onboarding-skills.md) and the onboarding command docs.

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

The structured onboarding flow and `init` command will probe available CLI tools and VS Code-compatible extensions, then prompt you to select the default target. Workspace extension recommendations may also appear in that probe, so the result is best interpreted as available integration candidates rather than a strict list of locally installed AI tools.

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
