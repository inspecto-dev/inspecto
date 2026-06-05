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

- **Runtime Layer**: `src/runtime/` owns the custom element, lifecycle, launcher, interactions, annotate UI coordination, evidence wiring, and mode switching.
- **Inspect Feature**: `src/features/inspect/` contains the inspect menu, overlay, and prompt actions.
- **Annotate Feature**: `src/features/annotate/` contains annotation session state, sidebar, overlay, targets, timeline, and prompt assembly.
- **Evidence Feature**: `src/features/evidence/` contains runtime and CSS evidence capture, ranking, and prompt formatting.
- **Transport Layer**: `src/transport/http-client.ts` contains the browser HTTP/EventSource client for local server endpoints.
- **Shared Assets**: `src/shared/` contains source-location helpers, i18n, icons, and style modules.
- **Public Entry**: `src/index.ts` exposes `mountInspector()` / `unmountInspector()` and lazy-loads DOM-dependent runtime code for SSR safety.

## Modes

- `Inspect mode`: single-target inspect and immediate actions.
- `Annotate mode`: multi-target annotation, sidebar queueing, structured AI task dispatch, custom workflow buttons, and MCP session progress visibility.

Use inspect when you want to act on one element immediately. Use annotate when one problem spans multiple linked components, or when you want to hand off a durable task or custom workflow to an agent and monitor its progress from the browser.
