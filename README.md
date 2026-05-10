# Inspecto

English | [简体中文](./README.zh-CN.md)

[![@inspecto-dev/plugin](https://img.shields.io/npm/v/@inspecto-dev/plugin?label=@inspecto-dev/plugin)](https://www.npmjs.com/package/@inspecto-dev/plugin)
[![@inspecto-dev/core](https://img.shields.io/npm/v/@inspecto-dev/core?label=@inspecto-dev/core)](https://www.npmjs.com/package/@inspecto-dev/core)
[![@inspecto-dev/cli](https://img.shields.io/npm/v/@inspecto-dev/cli?label=@inspecto-dev/cli)](https://www.npmjs.com/package/@inspecto-dev/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Click UI, jump to source, and let AI fix it or run your custom workflow with the exact frontend context.
> Inspecto turns browser-visible UI issues into source-aware AI handoffs, annotation tasks, custom prompt workflows, and MCP agent sessions you can track from the page.

👉 **[Read the full documentation at inspecto-dev.github.io/inspecto](https://inspecto-dev.github.io/inspecto/)**

<div align="center">
  <table border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td width="33%" align="center">
        <img src="packages/docs/public/inspect-mode.gif" width="100%" alt="Inspect mode workflow" />
        <br/>
        <b>Inspect mode</b><br/>
        Click one component and hand off the right context immediately
      </td>
      <td width="33%" align="center">
        <img src="packages/docs/public/annotate-mode.gif" width="100%" alt="Annotate mode workflow" />
        <br/>
        <b>Annotate mode</b><br/>
        Collect UI notes, create agent tasks, and follow progress
      </td>
      <td width="33%" align="center">
        <img src="packages/docs/public/quick-jump.gif" width="100%" alt="Quick jump workflow" />
        <br/>
        <b>Quick jump</b><br/>
        Use <code>Alt</code> + <code>Click</code> to open exact source location
      </td>
    </tr>
  </table>
</div>

## Quick Start

If this is your first time using Inspecto, you do not need to understand MCP, IDE routes, or setup layers yet. Do one thing: **pick the editor / AI assistant you already use, then run one command**.

That command sets up the common full experience: click a browser component, open source with `Alt + Click`, and send Inspect / Annotate context to your AI assistant.

From your project root, run **one** command:

```bash
# VS Code + Copilot
npx @inspecto-dev/cli integrations install copilot --host-ide vscode

# VS Code + Claude Code
npx @inspecto-dev/cli integrations install claude-code --scope project --host-ide vscode

# Cursor builtin
npx @inspecto-dev/cli integrations install cursor --host-ide cursor

# Trae CN + Trae
npx @inspecto-dev/cli integrations install trae --host-ide trae-cn

# VS Code + Codex
npx @inspecto-dev/cli integrations install codex --host-ide vscode

# VS Code + Gemini
npx @inspecto-dev/cli integrations install gemini --host-ide vscode

# Trae CN + Coco
npx @inspecto-dev/cli integrations install coco --host-ide trae-cn

# CodeBuddy
npx @inspecto-dev/cli integrations install codebuddy --host-ide codebuddy-cn
```

_(Prefer `pnpm dlx`, `yarn dlx`, or `bunx` instead of `npx` if you use them)._

Not sure which one to pick?

- VS Code + Copilot: choose `Copilot`
- Cursor: choose `Cursor`
- Trae CN: choose `Trae`; if you use Coco, choose `Coco`
- CodeBuddy: choose `CodeBuddy`
- Only want source jump without AI: see the [Installation Guide](https://inspecto-dev.github.io/inspecto/guide/manual-installation)
- Only want a standalone MCP agent without an IDE extension: see [MCP Integration](https://inspecto-dev.github.io/inspecto/integrations/mcp)

Once run, Inspecto will attempt to open an onboarding session in your IDE. **If it doesn't open automatically**, open a chat with your AI assistant and say:

> _"Set up Inspecto in this project"_

Want to know what the automated setup does? See the [Official Documentation](https://inspecto-dev.github.io/inspecto/).

## Use It

1. Open your app in the browser.
2. Use the launcher for `Inspect mode` or `Annotate mode`.
3. Use **`Alt` + `Click`** anytime for `Quick jump`.

For agent-driven fixes, switch annotate to MCP mode, collect UI notes, click **Create Task**, and let your assistant process the session queue. The sidebar shows the latest task status, progress updates, and an expandable timeline of every agent reply.

You can also define custom workflow buttons in `.inspecto/prompts.json`. For example, add a `kind: "workflow"` prompt such as `Deploy Preview`, click it from Annotate mode, and let the agent use its own skills, MCP servers, and tools to deploy the current branch while reporting progress back to Inspecto.

Success looks like this:

- components highlight in the browser
- `Inspect mode` opens the Inspecto menu
- `Quick jump` opens the source location
- `Annotate mode` can create MCP agent tasks and show live browser-side progress

If highlighting works but nothing reaches your editor, verify your IDE configuration or use the "Copy Context" action. If using MCP or Standalone mode (`ide: "none"`), the IDE extension is not required, see [MCP Integration](https://inspecto-dev.github.io/inspecto/integrations/mcp).

---

> Need platform-specific commands or structured onboarding details? Use the **[Official Documentation](https://inspecto-dev.github.io/inspecto/)**.

## Community

- [GitHub Discussions](https://github.com/inspecto-dev/inspecto/discussions)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started, and make sure to read our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
