# @inspecto-dev/core

`@inspecto-dev/core` is the browser runtime for Inspecto.

## Overview

This package focuses on the browser-side runtime:

1. **Browser Client**: A native Web Component (`<inspecto-overlay>`) utilizing Shadow DOM for style isolation. It captures DOM clicks, parses the injected source location attributes (`data-inspecto`), and provides the interactive UI menu.
2. **Prompt Assembly**: Builds inspect and annotate payloads in the browser, including optional runtime, CSS, and snippet context.
3. **Workflow Dispatch**: Renders configured workflow buttons from `prompts.json` and sends project-level instructions such as deploy or PR review to the configured agent route.
4. **Agent Session Visibility**: Renders MCP annotation and workflow session state in the browser, including queued, acknowledged, progress reply, resolved, and dismissed timeline events.

The local development server, snippet extraction, and IDE dispatch runtime live in `@inspecto-dev/plugin`.

## Core Implementation

- **Web Component**: Implemented with pure native DOM APIs and `goober` for CSS-in-JS inside the Shadow DOM, ensuring zero framework dependency and avoiding conflicts with user styles.
- **Intent System**: Defines the default AI actions (Explain, Fix Bug, Code Review, etc.) and handles prompting.
- **Context Assembly**: Requests optional snippet/runtime/CSS context and appends it to the outgoing prompt.
- **Workflow Buttons**: Displays project-specific workflow entries such as Deploy Preview or Review & PR, letting agents execute them with their own skills, MCP servers, and tools.
- **Session Timeline**: Converts annotation and workflow sessions into deterministic timeline items and renders the latest agent task progress in Annotate mode.
- **Overlay Runtime**: Mounts and configures the browser overlay via `mountInspector()` / `unmountInspector()`.

## Modes

- `Inspect mode`: single-target inspect and immediate actions.
- `Annotate mode`: multi-target annotation, sidebar queueing, structured AI task dispatch, custom workflow buttons, and MCP session progress visibility.

Use inspect when you want to act on one element immediately. Use annotate when one problem spans multiple linked components, or when you want to hand off a durable task or custom workflow to an agent and monitor its progress from the browser.
