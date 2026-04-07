# Getting Started

Inspecto is for the moment when you already see the issue in the browser and want to move straight to source or AI with the right context.

## Fast Setup

For most users:

1. **Navigate to your project root**.
2. **Copy and run the matching install command**:

`--host-ide` values: `vscode`, `cursor`, `trae`, `trae-cn`.

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

If you prefer another package manager, replace `npx` with `pnpm dlx`, `yarn dlx`, or `bunx`.

> **Note on scopes**: Run these commands from your project root. Codex and `claude-code --scope user` are the user-level exceptions.

3. **Watch the result in your IDE**:
   - If onboarding opens automatically, continue there.
   - If it does not open, start a chat session and say: `Set up Inspecto in this project`.

Then open the app in the browser and use `Inspect mode`, `Annotate mode`, or `Quick jump`.

If you only remember two rules, remember these:

- run project-level install commands from the target project root
- pass `--host-ide` explicitly when you are not running inside the target IDE terminal

Need assistant-specific wording, file locations, or install targets? See [Onboarding Integrations](../integrations/onboarding-skills.md).

## Terminal Fallback

If you are not using an assistant integration, run this in your project root:

::: code-group

```bash [npm]
npx @inspecto-dev/cli@latest init
```

```bash [pnpm]
pnpm dlx @inspecto-dev/cli@latest init
```

```bash [yarn]
yarn dlx @inspecto-dev/cli@latest init
```

```bash [bun]
bunx @inspecto-dev/cli@latest init
```

:::

## After Setup

Once setup finishes:

1. Confirm that the Inspecto IDE extension is installed and enabled.
2. Start or restart your dev server (e.g. `npm run dev`).
3. Open your app in the browser.
4. Use the launcher to choose a mode:
   - `Inspect mode`: click one component to inspect or ask AI right away
   - `Annotate mode`: capture notes across components, then `Ask AI` once
5. Use **`Alt` + `Click`** anytime for `Quick jump`.

Expected result:

- components highlight in the browser
- `Inspect mode` opens the Inspecto menu
- `Annotate mode` captures notes into the sidebar
- `Quick jump` opens the source location

If highlighting works but nothing reaches your editor, confirm that the Inspecto IDE extension is installed and enabled.

::: tip Structured onboarding
If you are building your own skill, rule, or agent runtime, prefer the single-entry command:

1. `inspecto onboard --json`
2. If `status: needs_target_selection`, rerun with `--target <packagePath>`
3. If `status: needs_confirmation`, confirm the planned changes and rerun with `--yes`
4. Treat `ideExtension` as required: auto-install when possible; otherwise guide users with command/link fallback before verification
5. After extension setup, use the `verification` payload to restart the dev server automatically when possible, or prompt the user to verify manually
6. Use `inspecto doctor --json` only when the onboarding status is `error` or you still have unresolved diagnostics
   :::

If anything looks off after setup, run `npx @inspecto-dev/cli doctor --json` before rerunning onboarding.

## Supported Environment

### UI Frameworks

| Framework | Supported Versions | Notes                                                             |
| :-------- | :----------------- | :---------------------------------------------------------------- |
| React     | >= 16.8.0          | Supported via JSX/TSX AST transformation.                         |
| Vue       | >= 3.0.0           | Supported via Vue SFC compiler. Vue 2 is currently not supported. |

### Build Tools

| Build Tool | Supported Versions | Notes                                                                           |
| :--------- | :----------------- | :------------------------------------------------------------------------------ |
| Vite       | >= 2.0.0           | Full support with automatic client injection.                                   |
| Webpack    | >= 4.0.0           | Recognized by the CLI. Plugin registration currently requires manual follow-up. |
| Rspack     | >= 0.1.0           | Recognized by the CLI. Plugin registration currently requires manual follow-up. |
| Rsbuild    | >= 0.1.0           | Recognized by the CLI. Plugin registration currently requires manual follow-up. |
| Rollup     | >= 2.0.0           | Build-time injection supported. Client needs manual initialization.             |
| esbuild    | >= 0.14.0          | Build-time injection supported. Client needs manual initialization.             |

## Supported AI Tools

Inspecto bridges the gap between your browser and your AI assistant. During setup, the CLI probes CLI tools and IDE extensions; built-in IDE targets remain available at runtime and through manual configuration:

- **Plugin Mode (IDE Extensions)**: GitHub Copilot, Claude Code Extension, Gemini Plugin, CodeX.
- **CLI Mode (Terminal)**: Claude CLI (`claude`), Coco CLI (`coco`), CodeX CLI, Gemini CLI.
- **Built-in Mode (Native IDE)**: Trae, Cursor (Native AI integration without extensions).

## Need Help?

If you encounter issues during initialization or usage (such as no highlights, failed message sending, etc.), please prioritize running the environment diagnostic tool:

```bash
npx @inspecto-dev/cli doctor
```

For more common troubleshooting (such as shortcut conflicts, IDE plugin unresponsiveness, etc.), please refer to the [Troubleshooting & FAQ](./faq.md).
