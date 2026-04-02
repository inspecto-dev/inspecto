# Getting Started

The easiest way to get started is through an agent-capable workflow: ask your agent to detect the project, build a plan, apply it, and verify the result. If you are setting things up directly in a terminal, `inspecto init` is still the guided fallback.

## Agent-First Setup

Use the structured CLI flow when your environment can drive Inspecto from an agent:

1. `inspecto detect --json`
2. `inspecto plan --json`
3. `inspecto apply`
4. `inspecto doctor --json`

This keeps setup machine-readable while still letting the agent confirm the environment before making changes.

If you are using Codex, Claude Code, Copilot, Cursor, Gemini, Trae, or Coco, install the matching onboarding integration from [Onboarding Integrations](../integrations/onboarding-skills.md) and ask it to run the onboarding flow for you.

Recommended install cards:

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

If you are integrating Inspecto into a skill or agent runtime, use the [Onboarding Contract](../integrations/onboarding-contract.md) as the source of truth for JSON response fields and status handling.

## Quick Start

If you are working directly in the terminal, run the initialization command **in your project root directory**:

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

### What happens next?

Once initialized, simply start your dev server (e.g. `npm run dev`), open your browser, and **hold `Alt` + `Click`** on any component to instantly send its source code to your AI.

::: tip What does the CLI do under the hood?
The CLI will automatically:

1. **Detect** your package manager (npm, pnpm, yarn, bun)
2. **Detect** your build tool/framework (Vite, Webpack, Rspack, Rsbuild)
3. **Detect** your IDE (VS Code, Cursor, Trae)
4. **Detect** installed AI tools in both CLI and Plugin modes
5. **Install** the required `@inspecto-dev/plugin` dependencies
6. **Inject** the plugin into your Vite/Webpack/Rspack configuration file via AST transformation
7. **Install** the appropriate IDE extension (with fallback strategies)
8. **Configure** your `.inspecto/settings.local.json` and update `.gitignore`
   :::

If anything looks off after setup, run `npx @inspecto-dev/cli doctor --json` to confirm the environment before retrying `init`.

## Supported Environment

### UI Frameworks

| Framework | Supported Versions | Notes                                                             |
| :-------- | :----------------- | :---------------------------------------------------------------- |
| React     | >= 16.8.0          | Supported via JSX/TSX AST transformation.                         |
| Vue       | >= 3.0.0           | Supported via Vue SFC compiler. Vue 2 is currently not supported. |

### Build Tools

| Build Tool | Supported Versions | Notes                                                               |
| :--------- | :----------------- | :------------------------------------------------------------------ |
| Vite       | >= 2.0.0           | Full support with automatic client injection.                       |
| Webpack    | >= 4.0.0           | Full support for both Webpack 4 and Webpack 5.                      |
| Rspack     | >= 0.1.0           | Full support.                                                       |
| Rsbuild    | >= 0.1.0           | Full support via Rspack plugin.                                     |
| Rollup     | >= 2.0.0           | Build-time injection supported. Client needs manual initialization. |
| esbuild    | >= 0.14.0          | Build-time injection supported. Client needs manual initialization. |

## AI Tool Support

Inspecto intelligently bridges the gap between your browser and your AI assistant. It supports three different interaction modes, and detects them during the structured onboarding flow or during `init`:

- **Plugin Mode (IDE Extensions)**: GitHub Copilot, Claude Code Extension, Gemini Plugin, CodeX.
- **CLI Mode (Terminal)**: Claude CLI (`claude`), Coco CLI (`coco`), CodeX CLI, Gemini CLI.
- **Built-in Mode (Native IDE)**: Trae, Cursor (Native AI integration without extensions).

## Having trouble?

If you encounter issues during initialization or usage (such as no highlights, failed message sending, etc.), please prioritize running the environment diagnostic tool:

```bash
npx @inspecto-dev/cli doctor
```

For more common troubleshooting (such as shortcut conflicts, IDE plugin unresponsiveness, etc.), please refer to the [Troubleshooting & FAQ](./faq.md).
