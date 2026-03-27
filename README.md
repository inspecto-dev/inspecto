# inspecto

English | [简体中文](./README.zh-CN.md)

[![npm version](https://badge.fury.io/js/%40inspecto%2Fplugin.svg)](https://badge.fury.io/js/%40inspecto%2Fplugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Click. Extract. Ship to AI. Click any UI element to instantly send its source code to your AI Assistant.

## Features

- 🖱️ Click-to-inspect any JSX/Vue element during development
- 🤖 Sends source context directly to AI Assistants (GitHub Copilot, Claude Code, CodeX, Gemini, Coco, etc.)
- ⚡ Zero runtime overhead in production (compile-time attributes, tree-shaken)
- 🎨 Framework-agnostic overlay (pure Web Component, Shadow DOM)
- 🔧 Works with Vite, Webpack, Rspack, esbuild, rollup (via unplugin)
- ⌨️ Configurable hotkeys
- 🛠️ **Intelligent Setup**: One-command scaffolding with `npx inspecto init`

## Quick Start

The easiest way to get started is by using the Inspecto CLI. It automatically detects your environment, build tool, framework, and installed AI tools to configure everything for you.

```bash
npx inspecto init
```

The CLI will automatically:

1. **Detect** your package manager (npm, pnpm, yarn, bun)
2. **Detect** your build tool/framework (Vite, Webpack, Rspack, Rsbuild, Next.js)
3. **Detect** your IDE (VS Code, Cursor, Trae, Windsurf, WebStorm)
4. **Detect** installed AI tools in both CLI and Plugin modes
5. **Install** the required `@inspecto/plugin` dependencies
6. **Inject** the plugin into your build configuration file via AST transformation
7. **Install** the appropriate IDE extension (with fallback strategies)
8. **Configure** your `.inspecto/settings.json` and update `.gitignore`

### Manual Installation

If you prefer to set things up manually, follow these steps based on your build tool.

**1. Install the plugin**

```bash
npm install -D @inspecto/plugin
```

**2. Configure your build tool**

**Vite (`vite.config.ts`)**

```typescript
import { vitePlugin as inspecto } from '@inspecto/plugin'

export default defineConfig({
  plugins: [react(), inspecto()],
})
```

**Webpack (`webpack.config.js`)**

```javascript
const { webpackPlugin: inspecto } = require('@inspecto/plugin')

module.exports = {
  plugins: [inspecto()],
}
```

**Rspack (`rspack.config.ts`)**

```typescript
import { rspackPlugin as inspecto } from '@inspecto/plugin'

export default {
  plugins: [inspecto()],
}
```

**Rollup (`rollup.config.js`)**

```javascript
import { rollupPlugin as inspecto } from '@inspecto/plugin'

export default {
  plugins: [inspecto()],
}
```

**esbuild (`build.js`)**

```javascript
import { build } from 'esbuild'
import { esbuildPlugin as inspecto } from '@inspecto/plugin'

build({
  plugins: [inspecto()],
})
```

> **Note for Rollup and esbuild users:**
> Unlike Vite and Webpack, Rollup and esbuild do not have built-in dev servers to automatically inject the client code. You need to manually install and initialize the core client in your application entry point (e.g. `main.js`):
>
> ```bash
> npm install -D @inspecto/core
> ```
>
> ```javascript
> // src/main.js
> import { mountInspector } from '@inspecto/core'
>
> if (process.env.NODE_ENV !== 'production') {
>   mountInspector({
>     serverUrl: 'http://127.0.0.1:5678', // default local server port
>   })
> }
> ```

**3. Install the IDE Extension**

Search for "Inspecto" in your editor's extension marketplace and install it.

## CLI Commands

Inspecto provides a robust CLI to manage the integration lifecycle:

### `init`

Scaffolds Inspecto into your project. If it detects multiple build tools or AI tools, it provides an interactive prompt for you to select your preferred configuration.

```bash
npx inspecto init
```

### `doctor`

Diagnoses your current environment and verifies if your build tool, IDE, and AI tools are supported by Inspecto. Useful for troubleshooting.

```bash
npx inspecto doctor
```

### `teardown`

Safely removes all Inspecto configurations, uninstalls dependencies, removes AST injections from build files, and deletes generated settings files from your project.

```bash
npx inspecto teardown
```

## AI Tool Support

Inspecto intelligently bridges the gap between your browser and your AI assistant. It supports two different interaction modes, and detects both during `init`:

- **Plugin Mode (IDE Extensions)**: GitHub Copilot, Claude Code Extension, Gemini Plugin, CodeX.
- **CLI Mode (Terminal)**: Claude CLI (`claude`), Coco CLI (`coco`), CodeX CLI, Gemini CLI.

If an AI tool supports both modes (e.g., Claude), Inspecto will detect both and let you choose your preferred interaction method (e.g., "Terminal CLI & VS Code Extension").

## Configuration

Inspecto's configuration is split into two parts: **Build Plugin Configuration** (for code injection during development) and **User Settings** (for customizing hotkeys, AI targets, and editor behavior).

### 1. Build Plugin Configuration

These options are passed to the unplugin wrapper (e.g., in `vite.config.ts`, `webpack.config.js`, or `rspack.config.js`). They control how your code is instrumented at compile time.

```typescript
import { vitePlugin as inspecto } from '@inspecto/plugin'

export default defineConfig({
  plugins: [
    inspecto({
      pathType: 'absolute',
      escapeTags: ['template', 'script', 'style', 'Fragment'], // skipped tags
      attributeName: 'data-inspecto', // custom DOM attribute
      include: ['**/*.{js,jsx,ts,tsx,vue}'],
      exclude: ['node_modules/**', 'dist/**'],
    }),
  ],
})
```

| Option                | Type                         | Default                       | Description                                                            |
| :-------------------- | :--------------------------- | :---------------------------- | :--------------------------------------------------------------------- |
| `pathType`            | `'absolute'` \| `'relative'` | `'absolute'`                  | Path type in injected attributes. `'absolute'` is safer for monorepos. |
| `escapeTags`          | `string[]`                   | `[...]` (framework internals) | Tags that should not receive the `data-inspecto` attribute.            |
| `attributeName`       | `string`                     | `'data-inspecto'`             | The DOM attribute name used to store source coordinates.               |
| `include` / `exclude` | `string[]`                   | -                             | File matching patterns (picomatch) for the transform step.             |

### 2. User Settings (`.inspecto/settings.json`)

Runtime behaviors, hotkeys, and AI targets are configured using a `settings.json` file. You can place this file in your project root (`<gitRoot>/.inspecto/settings.json`) to share it with your team, or in your home directory (`~/.inspecto/settings.json`) for global preferences.

#### Example `.inspecto/settings.json`

```json
{
  "hotKeys": ["altKey"],
  "ide": "vscode",
  "prefer": "github-copilot",
  "includeSnippet": false,
  "providers": {
    "github-copilot": { "autoSend": false, "type": "plugin" },
    "claude-code": {
      "type": "cli",
      "bin": "claude"
    }
  }
}
```

#### Settings Reference

- **`hotKeys`**: Activation hotkeys. Array of modifiers (`'altKey'`, `'ctrlKey'`, `'metaKey'`, `'shiftKey'`) or `false` to disable hotkey activation. (Default: `['altKey']`)
- **`ide`**: Force a specific IDE context (`"vscode"`, `"cursor"`, `"trae"`, `"windsurf"`). If omitted, Inspecto auto-detects based on environment.
- **`prefer`**: The default AI tool to dispatch to (`"github-copilot"`, `"claude-code"`, `"gemini"`, `"codex"`, `"coco"`).
- **`includeSnippet`**: Whether to inject the raw code snippet into the prompt. Setting this to `false` (default) saves tokens when using IDE-native AI tools (Copilot/Cursor/Trae), as they can read the file directly.
- **`providers`**: Per-tool configuration. Keys are tool names.
  - **`type`**: Force a specific interaction mode (`"plugin"` or `"cli"`).
  - **`bin`**: CLI executable name or absolute path (CLI mode only).
  - **`args`**: Extra startup arguments (CLI mode only).
  - **`cwd`**: Working directory for the CLI process (CLI mode only).
  - **`autoSend`**: Submit the prompt automatically without user review. (Default: `false`)

## CLI Cold Start Delay

When using CLI tools like `claude-code` or `coco-cli` directly via the terminal integration, the extension needs to wait for the CLI tool to fully initialize its interactive REPL before pasting the initial prompt.

Because initialization time heavily depends on your machine's performance, network speed (for auth/version checks), and node module resolution, **the default delay is set to a safe 5 seconds (5000ms)** for the very first execution.

You can configure this delay in your IDE's settings to better match your system's performance:

```json
{
  "inspecto.cliColdStartDelay": 5000
}
```

> **Note:** If you set this value too low, the CLI might clear the terminal buffer during its boot sequence, causing your initial prompt to be lost. This delay _only_ applies to the first time the CLI is launched. Subsequent requests will execute instantly.

## Community

- [GitHub Discussions](https://github.com/inspecto-dev/inspecto/discussions)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started, and make sure to read our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
