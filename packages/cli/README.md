# @inspecto/cli

The official command-line interface for Inspecto. This tool automates the process of scaffolding, configuring, and maintaining the Inspecto setup within your project.

## Installation

You can use the CLI without installing it globally by using `npx`:

```bash
npx inspecto <command>
```

Alternatively, you can install it as a dev dependency in your project:

```bash
npm install -D @inspecto/cli
```

## Commands

### `inspecto init`

The primary command to scaffold Inspecto into a project. It performs a comprehensive environmental analysis and automatically configures Inspecto.

**Features:**

- **Package Manager Detection:** Auto-detects `npm`, `pnpm`, `yarn`, or `bun`.
- **Build Tool / Framework Detection:** Detects Vite, Webpack, Rspack, Rsbuild, and Next.js. Supports legacy versions (e.g., `@rspack/cli < 0.4.0`).
- **IDE Detection:** Prioritizes environment variables, then falls back to directory structures to accurately detect VS Code, Cursor, Trae, Windsurf, or WebStorm.
- **AI Tool Detection:** Scans for both CLI-based tools (Claude, Coco, CodeX, Gemini) and IDE Plugins (GitHub Copilot, Claude Code, Gemini, CodeX).
- **Interactive Prompts:** If multiple build configurations or AI tools are detected, it presents an interactive prompt for you to select your preferred configuration.
- **AST Injection:** Safely injects the `@inspecto/plugin` into your build configuration file (`vite.config.ts`, `rspack.config.js`, etc.) using AST transformation, preventing duplicate injections.
- **IDE Extension Installation:** Uses a robust 4-level waterfall strategy to install the necessary IDE extension.
- **Configuration Scaffolding:** Generates the `.inspecto/settings.json` file tailored to your detected or selected AI tools, and updates `.gitignore` to prevent committing local settings.

### `inspecto doctor`

A diagnostic command to verify your current environment.

**Features:**

- Checks if the current project is a recognized framework/build tool.
- Verifies if the IDE is supported.
- Scans for available AI tools (both CLI and Plugin modes).
- Validates the current Inspecto installation and configuration.

### `inspecto teardown`

A clean-up command to remove Inspecto from your project.

**Features:**

- Uninstalls `@inspecto/plugin` and `@inspecto/cli`.
- Uses AST transformation to carefully remove the plugin injection from your build configuration file.
- Deletes the `.inspecto` directory and its contents.
- Restores `.gitignore` by removing Inspecto-specific rules.

## Technical Details

### Waterfall Degradation Strategy

The CLI employs a resilient fallback strategy for certain operations, such as installing IDE extensions.

**IDE Extension Installation Levels:**

1. **PATH Command:** Attempts to use the IDE's CLI command (e.g., `code --install-extension`).
2. **Binary Path:** Searches known default installation paths for the IDE binary across different operating systems (macOS, Linux, Windows).
3. **URI Scheme:** Uses the IDE's deep-link URI scheme (e.g., `vscode:extension/inspecto...`).
4. **Manual:** If all else fails, provides explicit instructions for the user to install the extension manually.

### AI Tool Detection

The CLI intelligently detects AI tools across two modes:

- **CLI Mode:** Checks the system `PATH` for known executables (e.g., `claude`, `coco`).
- **Plugin Mode:** Checks the IDE's extension directories (e.g., `~/.vscode/extensions`) for known plugin IDs.

When a tool supports both modes, the CLI merges the detections and presents a unified option to the user, configuring the `settings.json` accordingly.
