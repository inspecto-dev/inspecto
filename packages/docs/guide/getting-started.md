# Getting Started

Inspecto is for the moment when you already see the issue in the browser and want to move straight to source or AI with the right context.

## Fast Setup

To install Inspecto and connect it to your AI assistant, navigate to your project root and run **one** of the commands below based on your setup:

::: code-group

```bash [Copilot]
npx @inspecto-dev/cli integrations install copilot --host-ide vscode
```

```bash [Claude Code]
npx @inspecto-dev/cli integrations install claude-code --scope project --host-ide vscode
```

```bash [Cursor]
npx @inspecto-dev/cli integrations install cursor --host-ide cursor
```

```bash [Trae]
npx @inspecto-dev/cli integrations install trae --host-ide trae-cn
```

```bash [Codex]
npx @inspecto-dev/cli integrations install codex --host-ide vscode
```

```bash [Gemini]
npx @inspecto-dev/cli integrations install gemini --host-ide vscode
```

```bash [Coco]
npx @inspecto-dev/cli integrations install coco --host-ide trae-cn
```

```bash [CodeBuddy]
npx @inspecto-dev/cli integrations install codebuddy --host-ide codebuddy-cn
```

:::

_(Prefer `pnpm dlx`, `yarn dlx`, or `bunx` instead of `npx` if you use them)._

Once run, Inspecto will attempt to open an onboarding session in your IDE. **If it doesn't open automatically**, open a chat with your AI assistant and say:

> _"Set up Inspecto in this project"_

Need manual installation? Check out the [Installation Guide](./manual-installation.md) or [Onboarding Integrations](../integrations/onboarding-skills.md).

> **Not using an IDE extension?** If you prefer a standalone setup with MCP (e.g. for Cursor, Claude Desktop), see the [MCP Integration](../integrations/mcp.md).

## After Setup

1. **Restart your dev server** (e.g. `npm run dev`) so the Inspecto plugin picks up the new config.
2. **Open your app in the browser** — you should see the Inspecto launcher overlay.
3. **Try it out**:
   - `Alt + Click` any component to jump to source
   - Click the launcher for `Inspect mode` or `Annotate mode`

If components don't highlight or nothing reaches your editor, run:

```bash
npx @inspecto-dev/cli doctor
```

> **Need to check supported environments or AI tools?** See the [Compatibility Checklist](./compatibility-checklist.md) and [Supported AI Tools](../integrations/ai-tools.md).

## Need Help?

For common troubleshooting (shortcut conflicts, IDE plugin issues, etc.), see the [Troubleshooting & FAQ](./faq.md).
