# Introduction

## What is Inspecto?

Inspecto shortens the loop between the browser, your editor, DevTools, and AI chat. Start from the page, then move to code or AI with the right context already attached.

It gives you three core browser-first workflows:

- `Inspect mode`: click one component and ask AI right away
- `Annotate mode`: collect notes across components, then send one batch
- `Quick jump`: use `Alt` + `Click` to open the exact source location

Instead of bouncing between the browser, DevTools, your editor, and AI chat, Inspecto keeps the handoff tight. You stay on the page, target the component you care about, and move to code or AI with the right context already attached.

For setup, Inspecto now supports automated onboarding integrations. In environments such as Codex, Claude Code, Coco, Copilot, Cursor, Gemini, or Trae, the fastest path is to install the matching onboarding integration from your terminal. Inspecto will open the setup instructions right inside your IDE, let the assistant complete the setup, and apply the configuration for you.

## Why Inspecto?

In a traditional development workflow, when you need to debug a UI component and ask AI for help, you usually go through a tedious process. Inspecto fully automates this:

| Pain Point             | Traditional Debug Workflow ❌                                     | Inspecto Workflow 🚀                                                               |
| :--------------------- | :---------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| 🔍 **Locating Code**   | Press `F12`, inspect the element, then manually search in the IDE | Use `Quick jump` or `Inspect mode` to open the relevant location faster            |
| ✂️ **Copying Context** | Manually collect code, runtime clues, and UI details              | Inspecto builds the relevant context from the page and source automatically        |
| 🤖 **Invoking AI**     | Open AI chat, paste snippets, and explain what the component is   | Ask directly from `Inspect mode` or send one structured batch from `Annotate mode` |
| ⏱️ **Flow Cost**       | Frequent context switching breaks your train of thought           | The browser becomes the starting point for source lookup and AI handoff            |

## How it Works

Inspecto operates across three different layers of your development environment:

### 1. Compile Time (The Plugin)

During development, the `@inspecto-dev/plugin` intercepts your framework's compilation process (via Vite, Webpack, or Rspack). It analyzes your React JSX or Vue SFC files and injects a hidden `data-inspecto="file:line:col"` attribute into every DOM element.

### 2. Runtime (The Core Client)

The `@inspecto-dev/core` runs in your browser as a framework-agnostic Web Component overlay. It provides the launcher, `Inspect mode`, `Annotate mode`, and `Quick jump`. When you interact with a component, it reads the `data-inspecto` attribute, builds the prompt in the browser, and can optionally request snippet context.

### 3. Dispatch (The Action)

Once the code context is ready, the local HTTP server relays this payload. When snippet context is enabled, the server reads the relevant source file and returns the snippet. Depending on your configuration, the server either triggers a URI scheme to open your IDE Extension, or pastes the payload directly into a running CLI process in your terminal.

## Key Features

- **Zero Runtime Overhead in Production**: The AST injection only happens when `NODE_ENV !== 'production'`. The attributes are completely stripped out of your production builds.
- **Framework Agnostic Overlay**: The browser overlay uses standard Web Components and Shadow DOM, meaning it will never interfere with your application's CSS or global styles.
- **Highly Configurable**: You can customize hotkeys, themes, and route payloads to different AI providers without changing your code.
