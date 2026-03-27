# @inspecto/plugin

`@inspecto/plugin` provides the universal build tools plugin for Inspecto.

## Overview

Powered by `unplugin`, this package supports Vite, Webpack, Rspack, and Rollup. It handles AST manipulation at build-time to inject source location metadata into DOM elements, allowing the browser client to trace elements back to their original source code.

## Core Implementation

- **AST Transformation**: Uses Babel (`@babel/parser`, `@babel/traverse`) for React and `@vue/compiler-sfc` for Vue to parse source files.
- **Source Injection**: Utilizes `MagicString` to reliably inject `data-inspecto="filepath:line:column"` attributes onto HTML elements without breaking source maps.
- **Local Server Lifecycle**: Hooks into the bundler's build cycle (`buildStart`, `buildEnd`) to spawn and teardown the `@inspecto/core` local HTTP server (`portfinder`) during development.
- **Client Injection**: Automatically injects global variables (like `__AI_INSPECTOR_PORT__`) into the client bundle to allow the browser component to discover the local server port.
