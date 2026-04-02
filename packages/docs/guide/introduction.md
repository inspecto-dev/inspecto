# Introduction

## What is Inspecto?

Inspecto is a developer tool that creates a seamless bridge between your browser and your AI assistant. It allows you to **hold a hotkey (like Alt) and click any UI element in your browser** to instantly send its source code context directly to your favorite AI tools (like GitHub Copilot, Claude Code, Cursor, or Trae).

Instead of manually searching for the file, finding the exact line number, copying the code, and pasting it into your AI prompt, Inspecto automates this entire workflow in a single click.

For first install, Inspecto now also supports assistant-first onboarding. In environments such as Codex, Claude Code, Coco, Copilot, Cursor, Gemini, or Trae, the preferred path is to let the assistant run the structured CLI flow, explain the plan, and apply the setup for you.

## Why Inspecto?

In a traditional development workflow, when you need to debug a UI component and ask AI for help, you usually go through a tedious process. Inspecto fully automates this:

| Pain Point             | Traditional Debug Workflow ❌                                            | Inspecto Workflow 🚀                                                 |
| :--------------------- | :----------------------------------------------------------------------- | :------------------------------------------------------------------- |
| 🔍 **Locating Code**   | Press `F12` to inspect element, then manually search for the file in IDE | **Fully Automated**                                                  |
| ✂️ **Copying Context** | Manually select and copy the relevant code snippet                       | **Fully Automated**                                                  |
| 🤖 **Invoking AI**     | Open AI chat panel, paste code, and type "Please fix this..."            | **Fully Automated**                                                  |
| ⏱️ **Time Spent**      | **~30 to 60 seconds**, frequently interrupting your flow state           | **Near 0**. Alt+Click a component and AI starts answering instantly! |

## How it Works

Inspecto operates across three different layers of your development environment:

### 1. Compile Time (The Plugin)

During development, the `@inspecto-dev/plugin` intercepts your framework's compilation process (via Vite, Webpack, or Rspack). It analyzes your React JSX or Vue SFC files and injects a hidden `data-inspecto="file:line:col"` attribute into every DOM element.

### 2. Runtime (The Core Client)

The `@inspecto-dev/core` runs in your browser as an invisible, framework-agnostic Web Component overlay. When you hold the activation hotkey, it highlights elements on hover. Upon clicking, it reads the `data-inspecto` attribute and extracts the relevant code snippet from your local file system.

### 3. Dispatch (The Action)

Once the code context is extracted, the local HTTP server relays this payload. Depending on your configuration, it either triggers a URI scheme to open your IDE Extension, or pastes it directly into a running CLI process in your terminal.

## Key Features

- **Zero Runtime Overhead in Production**: The AST injection only happens when `NODE_ENV !== 'production'`. The attributes are completely stripped out of your production builds.
- **Framework Agnostic Overlay**: The browser overlay uses standard Web Components and Shadow DOM, meaning it will never interfere with your application's CSS or global styles.
- **Highly Configurable**: You can customize hotkeys, themes, and route payloads to different AI providers without changing your code.
