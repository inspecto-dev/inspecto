# Inspecto

English | [简体中文](./README.zh-CN.md)

[![@inspecto-dev/plugin](https://img.shields.io/npm/v/@inspecto-dev/plugin?label=@inspecto-dev/plugin)](https://www.npmjs.com/package/@inspecto-dev/plugin)
[![@inspecto-dev/core](https://img.shields.io/npm/v/@inspecto-dev/core?label=@inspecto-dev/core)](https://www.npmjs.com/package/@inspecto-dev/core)
[![@inspecto-dev/cli](https://img.shields.io/npm/v/@inspecto-dev/cli?label=@inspecto-dev/cli)](https://www.npmjs.com/package/@inspecto-dev/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Say goodbye to context switching between browser, DevTools, editor, and AI assistant.
> Inspecto shortens the loop. Start from the webpage, and instantly hand off the right context to your code or AI.

👉 **[Read the full documentation at inspecto-dev.github.io/inspecto](https://inspecto-dev.github.io/inspecto/)**

<p align="center">
  <img src="packages/docs/public/demo/inspecto.gif" width="100%" alt="Inspecto 46s Demo" />
</p>

## Core Workflows

<p align="center">
  <img src="packages/docs/public/inspect-mode.png" width="32%" alt="Inspect mode screenshot" />
  <img src="packages/docs/public/annotate-mode.png" width="32%" alt="Annotate mode screenshot" />
  <img src="packages/docs/public/quick-jump.png" width="32%" alt="Quick jump screenshot" />
</p>

- `Inspect mode`: click one component and ask AI right away
- `Annotate mode`: collect notes across components, then send one batch
- `Quick jump`: use `Alt` + `Click` to open the exact source location

## Quick Start

The fastest way to get started is:

1. **Navigate to your project root**.
2. **Copy and run the matching install command**:

   `--host-ide` values: `vscode`, `cursor`, `trae`, `trae-cn`.

   ```bash
   # VS Code + Copilot
   npx @inspecto-dev/cli integrations install copilot --host-ide vscode

   # VS Code + Codex
   npx @inspecto-dev/cli integrations install codex --host-ide vscode

   # VS Code + Claude Code
   npx @inspecto-dev/cli integrations install claude-code --scope project --host-ide vscode

   # Cursor builtin
   npx @inspecto-dev/cli integrations install cursor --host-ide cursor

   # VS Code + Gemini
   npx @inspecto-dev/cli integrations install gemini --host-ide vscode

   # Trae CN + Trae
   npx @inspecto-dev/cli integrations install trae --host-ide trae-cn

   # Trae CN + Coco
   npx @inspecto-dev/cli integrations install coco --host-ide trae-cn
   ```

   Prefer another package manager? Replace `npx` with `pnpm dlx`, `yarn dlx`, or `bunx`.

3. **Watch the result in your IDE**:
   - If onboarding opens automatically, continue there.
   - If it does not open, start a chat session and send the fallback prompt below.

When you already know your host IDE, always prefer passing `--host-ide` explicitly. It avoids ambiguous IDE detection in plain terminal sessions.

### Manual Fallback

If onboarding does not open automatically, open a chat session with your assistant and say:

```text
Set up Inspecto in this project
```

Need other assistants, scopes, or file locations? See [Onboarding Integrations](https://inspecto-dev.github.io/inspecto/integrations/onboarding-skills).

### Terminal Fallback

If you are not using an assistant integration:

```bash
npx @inspecto-dev/cli@latest init
```

Use `pnpm dlx`, `yarn dlx`, or `bunx` if you prefer those package managers.

## Use It

1. Open your app in the browser.
2. Use the launcher for `Inspect mode` or `Annotate mode`.
3. Use **`Alt` + `Click`** anytime for `Quick jump`.

Success looks like this:

- components highlight in the browser
- `Inspect mode` opens the Inspecto menu
- `Quick jump` opens the source location

If highlighting works but nothing reaches your editor, install or enable the Inspecto IDE extension first.

---

> Need platform-specific commands or structured onboarding details? Use the **[Official Documentation](https://inspecto-dev.github.io/inspecto/)**.

## Community

- [GitHub Discussions](https://github.com/inspecto-dev/inspecto/discussions)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started, and make sure to read our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
