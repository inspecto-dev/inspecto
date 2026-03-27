# @inspecto/types

`@inspecto/types` contains all shared TypeScript definitions for the Inspecto monorepo.

## Overview

This package serves as the single source of truth for all types and interfaces used across the Inspecto ecosystem, ensuring strict type safety between the build plugin, local server, browser client, and IDE extension.

## Core Implementation

- **Protocol Types**: Defines the request/response shapes for the local HTTP server (`OpenFileRequest`, `SnippetResponse`, `SendToAiRequest`).
- **Configuration Types**: Defines the user configuration structure (`InspectoUserConfig`, `UnpluginOptions`, `InspectorOptions`).
- **Domain Models**: Contains definitions for AI targets (`AiTool`), tool modes (`ToolMode`), and IDE types (`IdeType`).
- **Constants**: Provides shared constants like `DEFAULT_INTENTS` and tool mode mappings to keep behavior consistent across packages.
