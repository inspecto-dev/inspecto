# @inspecto-dev/core

`@inspecto-dev/core` is the browser runtime for Inspecto.

## Overview

This package focuses on the browser-side runtime:

1. **Browser Client**: A native Web Component (`<inspecto-overlay>`) utilizing Shadow DOM for style isolation. It captures DOM clicks, parses the injected source location attributes (`data-inspecto`), and provides the interactive UI menu.
2. **Prompt Assembly**: Builds inspect and annotate payloads in the browser, including optional runtime, screenshot, CSS, and snippet context.

The local development server, snippet extraction, and IDE dispatch runtime live in `@inspecto-dev/plugin`.

## Core Implementation

- **Web Component**: Implemented with pure native DOM APIs and `goober` for CSS-in-JS inside the Shadow DOM, ensuring zero framework dependency and avoiding conflicts with user styles.
- **Intent System**: Defines the default AI actions (Explain, Fix Bug, Code Review, etc.) and handles prompting.
- **Context Assembly**: Requests optional snippet/runtime/screenshot context and appends it to the outgoing prompt.
- **Overlay Runtime**: Mounts and configures the browser overlay via `mountInspector()` / `unmountInspector()`.

## Modes

- `Inspect mode`: single-target inspect and immediate actions.
- `Annotate mode`: multi-target annotation, sidebar queueing, and batch AI dispatch.

Use inspect when you want to act on one element immediately. Use annotate when one problem spans multiple linked components.
