# Getting Started

Inspecto is for the moment when you already see the issue in the browser and want to move straight to source or an AI agent with the right context.

## Fast Setup

If this is your first time using Inspecto, you do not need to understand MCP, IDE routes, or setup layers yet. Do one thing: **pick the editor / AI assistant you already use, then run one command**.

That command sets up the common full experience:

- click a component in the browser with source context attached;
- use `Alt + Click` to open the source file;
- send Inspect / Annotate context to your AI assistant.
- optionally add project-specific workflow buttons later, such as `Deploy Preview`, `Review & PR`, or `Release`.

From your project root, run **one** command:

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

Not sure which one to pick?

- Using **VS Code + Copilot**: choose `Copilot`.
- Using **Cursor**: choose `Cursor`.
- Using **Trae CN**: choose `Trae`; if you use Coco, choose `Coco`.
- Using **CodeBuddy**: choose `CodeBuddy`.
- Only want source jump without AI: see [Manual Installation](./manual-installation.md).
- Only want a standalone MCP agent without an IDE extension: see [MCP Integration](../integrations/mcp.md).

Once run, Inspecto will attempt to open an onboarding session in your IDE. **If it doesn't open automatically**, open a chat with your AI assistant and say:

> _"Set up Inspecto in this project"_

Want to know what the automated setup does? See [Onboarding Integrations](../integrations/onboarding-skills.md).

## After Setup

1. **Restart your dev server** (e.g. `npm run dev`) so the Inspecto plugin picks up the new config.
2. **Open your app in the browser** — you should see the Inspecto launcher overlay.
3. **Try it out**:
   - `Alt + Click` any component to jump to source
   - Click the launcher for `Inspect mode` or `Annotate mode`
   - In `Annotate mode`, collect one or more UI notes and click `Create Task` to send them as a structured task

If your project uses MCP annotation (`"annotate.channel": "mcp"`), the annotation sidebar also shows the latest task timeline. Use it to confirm that the task was queued, claimed by the agent, updated with progress replies, and resolved or dismissed.

For custom automation, add `kind: "workflow"` entries in `.inspecto/prompts.json`. These appear as workflow buttons in Annotate mode. A button can send a deploy, PR, release, or review instruction to the agent; the agent then uses its own skills, MCP servers, and tools to complete the work while Inspecto tracks the session.

If components don't highlight or nothing reaches your editor, run:

```bash
npx @inspecto-dev/cli doctor
```

> **Need to check supported environments or AI tools?** See the [Compatibility Checklist](./compatibility-checklist.md) and [Supported AI Tools](../integrations/ai-tools.md).

## Need Help?

For common troubleshooting (shortcut conflicts, IDE plugin issues, etc.), see the [Troubleshooting & FAQ](./faq.md).
