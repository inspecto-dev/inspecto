# @inspecto/ide

`@inspecto/ide` is the IDE extension for Inspecto, currently supporting VS Code, Cursor, and Trae.

## Overview

This extension acts as the receiver for requests initiated from the browser via the Inspecto overlay. It listens for custom protocol URIs (e.g., `vscode://inspecto.inspecto/send`) and routes the context to the configured AI assistant strategy.

## Core Implementation

- **URI Handler**: Registers a `vscode.window.registerUriHandler` to catch incoming payloads containing file paths, code snippets, and generated prompts.
- **Strategy Pattern**: Dispatches the payload to different AI tools:
  - **Copilot**: Integrates with GitHub Copilot Chat via `workbench.action.chat.open`.
  - **Claude Code**: Integrates with Anthropic's Claude Code extension.
  - **Native IDE Chats**: Supports Cursor Chat and Trae Chat natively.
  - **CLIs**: Supports CLI tools like Claude Code CLI, Coco CLI via terminal spawning.
- **Fallback Chain**: Each strategy defines a series of channels (API, Deep-link, CLI, Clipboard). If one channel fails, it seamlessly falls back to the next, ultimately guaranteeing the context reaches the user's clipboard at a minimum.
- **IDE Detection**: Auto-detects the running IDE (VS Code, Cursor, or Trae) to optimize dispatch logic.
- **Dynamic Configuration**: Supports configuration overrides and auto-send features provided via local `.inspecto/settings.local.json` file.
