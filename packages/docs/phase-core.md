# Phase Core: `@inspecto-dev/core` Core Module

`@inspecto-dev/core` is the foundational infrastructure layer of Inspecto, implemented in pure JavaScript (Vanilla JS) without any front-end framework dependencies. It is responsible for establishing a communication bridge between the user's browser (Client) and the local development server (Dev Server), acting as the initiator of the entire "Page Element -> Local Source Code -> IDE/AI" pipeline.

## 1. Architecture and Responsibilities

The package is architecturally divided into two core parts: **Client (Browser)** and **Server (Node.js)**:

- **Client (`src/client/`)**: Runs in the user's browser. Responsible for DOM listening, Overlay rendering, Intent menu interaction, and initiating HTTP requests to the Dev Server.
- **Server (`src/server/`)**: Runs in the local development environment (as a middleware for build tools like Vite/Webpack/Rspack). Responsible for receiving requests from the Client and communicating with the system's IDE extensions or CLI processes.

## 2. Browser Client Core Mechanisms

### 2.1 Web Components and CSS Isolation

To completely avoid CSS style pollution or DOM conflicts with the host application's projects, Inspecto utilizes **Web Components (Shadow DOM)** technology:

- Core UI components (like `<inspecto-overlay>`) are encapsulated within isolated custom elements.
- All built-in UI styles (such as highlight borders, Tooltips, pop-up menus) are strictly isolated inside the Shadow DOM, achieving "zero side-effect" integration.

### 2.2 Element Location and `data-inspecto` Parsing

The front-end build plugin (like `@inspecto-dev/plugin`) injects the `data-inspecto` attribute into component DOMs at compile time. The Core Client is responsible for parsing this attribute at runtime:

- **Format Standard**: `file:line:column` (e.g., `/src/components/Button.tsx:12:5`)
- **Parsing Logic**: Splits the string by colons from back to front to accurately extract the absolute file path, line number, and column number, which are used for subsequent source code positioning and cursor jumping in the IDE.

### 2.3 Hotkey Detection and Interaction

- **Trigger Mechanism**: Listens for the `Alt` key by default (can be configured to `Shift`, `Control`, or `Meta`).
- **Penetration Detection**: When the user holds the hotkey and moves the mouse over the page (`mousemove`), the system uses `event.composedPath()` to penetrate the native DOM tree (including any Shadow DOM used by the host code) to accurately hit component nodes with the `data-inspecto` attribute.
- **Overlay Rendering**: Once an element is selected, its position and dimensions are calculated via `getBoundingClientRect()`, and a blue mask and a component info tooltip are rendered within the Viewport. Collision detection is handled to prevent content from being obscured.

### 2.4 Intent Menu System

When a user clicks on a highlighted element, an operation menu (Intent Menu) pops up:

- **Dynamic Rendering**: Renders Built-in Intents (like "Open in IDE") and Custom Intents based on the local configuration (`prompts.json`).
- **`isAction` Dispatch**: Determines whether the Intent is a pure local action (e.g., just copying a path, opening in IDE) or requires an AI-involved Prompt interaction.
- **Hotkey Binding**: Displays configured `shortcuts` (e.g., `⌘+C`, `↵`, etc.) in the menu UI and listens for their execution globally.

## 3. Server Communication (HTTP Protocol)

The Client and the local Dev Server communicate via a lightweight HTTP interface, bridging the front-end sandbox with the local file system/IDE:

- `GET /config`: Retrieves the current runtime configuration: available AI providers, `hotKeys`, `prompts`, and `providerOverrides`.
- `GET /__inspecto/api/snippet`: Reads the local file and gets the source code snippet around the specified component based on the parsed `line/column`.
- `POST /__inspecto/api/open-file`: Triggers a system-level "open file in IDE and position cursor" operation.
- `POST /__inspecto/api/send-ai`: Sends the collected component context (including the source code snippet, file path, selected Prompt intent, etc.) to the Dev Server. The Server then dispatches it to the IDE extension or CLI tool (via the Strategy Dispatch Pipeline).

## 4. Summary

As the cornerstone package of the Inspecto ecosystem, `@inspecto-dev/core` implements cross-boundary handshakes from the web page to the local development environment in an extremely lightweight and non-intrusive way. Its Vanilla JS implementation guarantees absolute compatibility with any front-end framework like Vue, React, Svelte, etc., while its robust event dispatch mechanism provides solid support for higher-level features.
