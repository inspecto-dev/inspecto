# inspecto

English | [简体中文](./README.zh-CN.md)

[![@inspecto-dev/plugin](https://img.shields.io/npm/v/@inspecto-dev/plugin?label=@inspecto-dev/plugin)](https://www.npmjs.com/package/@inspecto-dev/plugin)
[![@inspecto-dev/core](https://img.shields.io/npm/v/@inspecto-dev/core?label=@inspecto-dev/core)](https://www.npmjs.com/package/@inspecto-dev/core)
[![@inspecto-dev/cli](https://img.shields.io/npm/v/@inspecto-dev/cli?label=@inspecto-dev/cli)](https://www.npmjs.com/package/@inspecto-dev/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Click. Extract. Ship to AI. Click any UI element to instantly send its source code to your AI Assistant.

👉 **[Read the full documentation at inspecto-dev.github.io/inspecto](https://inspecto-dev.github.io/inspecto/)**

## Features

- 🖱️ Click-to-inspect any JSX/Vue element during development
- 🤖 Sends source context directly to AI Assistants (GitHub Copilot, Claude Code, CodeX, Cursor, Gemini, Trae, etc.)
- ⚡ Zero runtime overhead in production (compile-time attributes, tree-shaken)
- 🎨 Framework-agnostic overlay (pure Web Component, Shadow DOM)
- 🔧 Works with Vite, Webpack, Rspack, esbuild, rollup, next.js, nuxt.js, etc.
- ⌨️ Configurable hotkeys
- 🛠️ **Intelligent Setup**: Assistant-first onboarding via native skills, native instruction templates, or compatibility templates, with `npx @inspecto-dev/cli init` as the terminal fallback

## Quick Start

The easiest way to get started is through an assistant-capable onboarding workflow. Pick your assistant and run the matching install step:

### Codex

```text
Use $skill-installer to install https://github.com/inspecto-dev/inspecto/tree/main/skills/inspecto-onboarding-codex
```

Then say:

```text
Use $inspecto-onboarding-codex to set up Inspecto in this project
```

### Claude Code

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- claude-code project
```

Then say:

```text
Use inspecto-onboarding-claude-code to set up Inspecto in this project
```

### Copilot

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- copilot
```

Then say:

```text
Set up Inspecto in this project and show me the plan before changing files
```

### Cursor

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- cursor rules
```

Then say:

```text
Set up Inspecto in this project and show me the plan before changing files
```

### Gemini

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- gemini
```

Then say:

```text
Set up Inspecto in this project and show me the plan before changing files
```

### Trae

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- trae
```

Then say:

```text
Set up Inspecto in this project and show me the plan before changing files
```

### Coco

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- coco
```

Then say:

```text
Set up Inspecto in this project and show me the plan before changing files
```

If you are working directly in a terminal, the guided fallback is still:

```bash
npx @inspecto-dev/cli@latest init
```

### What happens next?

Once initialized, simply start your dev server (`npm run dev`), open your browser, and **hold `Alt` + `Click`** on any component to instantly send its source code to your AI!

---

> For onboarding integrations, the structured CLI contract, platform-specific installation instructions, configuration options, API reference, and IDE integration details, please visit our **[Official Documentation](https://inspecto-dev.github.io/inspecto/)**.

## Community

- [GitHub Discussions](https://github.com/inspecto-dev/inspecto/discussions)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started, and make sure to read our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
