# Inspecto - AI DOM Inspector

Inspecto is the official IDE extension that bridges the gap between your browser and your AI assistant. Click any UI component in your web application, and instantly send its source code and context to your preferred AI tool in your IDE.

## Features

- **One-Click Context Transfer**: Instantly send DOM elements, source code paths, and code snippets from the browser directly to your IDE.
- **Broad IDE Support**: Works seamlessly across **VS Code**, **Cursor**, and **Trae**.
- **Multi-AI Assistant Integration**: Automatically routes your context to your favorite AI tools:
  - **GitHub Copilot** (VS Code)
  - **Cursor Composer** (Cursor)
  - **Trae Chat** (Trae)
  - **Claude Code** (Anthropic)
  - **Gemini Code Assist** (Google)
  - **CLI Tools** (Coco, Codex, Claude CLI)
- **Robust Fallback Mechanism**: If your configured AI assistant is unavailable, Inspecto automatically falls back to your CLI or simply copies the context to your clipboard, ensuring you never lose your flow.

## How to Use

1. **Install the Extension**: Install the `inspecto` extension in your preferred IDE (VS Code, Cursor, or Trae).
2. **Setup Inspecto**: Integrate the Inspecto plugin (`@inspecto-dev/plugin`) in your front-end project (Vite/Webpack/etc.).
3. **Click & Send**: Open your app in the browser, activate the Inspecto overlay, and click the AI button on any UI component.
4. **AI Ready**: Your IDE will automatically open your configured AI assistant's chat panel and paste the component's source code and context, ready for your next prompt.

## Configuration

Inspecto is designed to work out-of-the-box, but supports dynamic configuration via a local `.inspecto/settings.local.json` file in your workspace root.

You can use this to customize the target AI provider, enable auto-send features, and tweak prompt templates to perfectly fit your workflow.

## Requirements

- VS Code `^1.85.0`, Cursor, or Trae.
- A front-end project with the `@inspecto-dev/plugin` installed.

## Issue Tracking

Found a bug or have a feature request? Please report it on our [GitHub Issues](https://github.com/inspecto-dev/inspecto/issues).

## License

[MIT](LICENSE)
