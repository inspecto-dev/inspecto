# @inspecto-dev/core

`@inspecto-dev/core` is the core browser runtime and server logic for Inspecto.

## Overview

This package handles two main responsibilities:

1. **Browser Client**: A native Web Component (`<inspecto-overlay>`) utilizing Shadow DOM for style isolation. It captures DOM clicks, parses the injected source location attributes (`data-inspecto`), and provides the interactive UI menu.
2. **Local Development Server**: A local HTTP server that acts as a bridge between the browser client and the IDE extension, extracting code snippets from local source files based on the requested location and opening the IDE.

## Core Implementation

- **Web Component**: Implemented with pure native DOM APIs and `goober` for CSS-in-JS inside the Shadow DOM, ensuring zero framework dependency and avoiding conflicts with user styles.
- **Intent System**: Defines the default AI actions (Explain, Fix Bug, Code Review, etc.) and handles prompting.
- **Snippet Extraction**: Reads local source files and returns the relevant AST-based or line-based code block.
- **IDE Dispatch**: Generates custom URIs (e.g., `vscode://inspecto.inspecto/send`) to launch the user's preferred IDE extension or CLI tool.
