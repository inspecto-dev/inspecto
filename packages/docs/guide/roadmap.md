# Roadmap

Inspecto is actively evolving. Our goal is to make it the ultimate bridge between visual UI development and AI agents. Here is a glimpse into what we are planning for the upcoming releases.

## Phase 1: MCP & Agentic Workflow (In Progress)

We are actively building Inspecto's Model Context Protocol (MCP) server to establish a standardized, bidirectional communication bridge between AI agents and the browser frontend. Key initiatives include:

- **Core State Management**: Implement an in-memory store and event bus to track the lifecycle of UI inspections, states, and browser pages.
- **HTTP & SSE APIs**: Build RESTful APIs for inspection management and Server-Sent Events (SSE) for real-time state synchronization.
- **MCP Server & Tools**: Provide 10 core MCP tools (e.g., `inspecto_watch`, `inspecto_resolve`, `inspecto_reply`) allowing agents to watch for new UI inspections, read context, and reply to developers.
- **Browser Bidirectional UI**: Introduce a visual status indicator and an interactive thread panel in the browser, enabling developers to chat directly with the AI agent inspecting the UI element.
- **Self-Driving Mode & Diagnostics**: Enable closed-loop resolution where AI Agents can automatically read errors, fetch source code via MCP, apply fixes, and verify. Also introducing `inspecto doctor` to automatically fix common build injection or connectivity errors.

## Phase 2: Context Enrichment

After the MCP surface stabilizes, we’ll focus on giving AI richer architectural context instead of shipping raw snippets only.

- **Props Source Tracking (P0)**: Track the origin of props so the AI agent knows exactly where data is passed from and where to apply changes.
- **Condition / Loop Rendering Context (P0)**: Provide context on conditionals and loops rendering the component, helping AI understand the structural code logic better.
- **Import Chain Resolution (P1)**: Resolve the import chain to distinguish between internal project components and third-party library components.
- **Expression Span (P1)**: Support precise code replacement utilizing location data.
- **Multiple Element Selection**: Allow developers to hold a modifier key (e.g., `Shift`) to select multiple React/Vue components at once and send their combined context to the AI in a single prompt.
- **Runtime State & Computed Styles**: Beyond static source code, we plan to extract real-time component states (props/state) and final computed CSS styles from the browser, helping AI pinpoint logic and styling bugs more accurately.
- **Auto Screenshot Capture**: Automatically take a screenshot of the selected component's rendered state in the browser and attach it to the AI prompt alongside the source code.

## Phase 3: Architecture Upgrades

To support multi-agent and real-time workflows, we’re modernizing Inspecto’s transport layer and IDE bridge.

- **WebSocket Migration**: Primarily resolving the bidirectional communication gap between IDE Extensions and the local DevServer. Moving away from the current one-way URI Scheme invocation, we will establish persistent WebSocket connections, enabling complex instruction routing and real-time state syncing between the IDE and the browser.
  - **Agent Journaling**: Persist conversations between browser → MCP → IDE so the same context can be replayed later (useful for multi-step tasks).

---

_Have a feature request or want to see where each item lands? Track issues labeled `roadmap` on [GitHub Discussions](https://github.com/inspecto-dev/inspecto/discussions)._
