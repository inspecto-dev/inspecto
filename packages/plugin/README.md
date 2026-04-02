# @inspecto-dev/plugin

`@inspecto-dev/plugin` provides the universal build tools plugin for Inspecto.

## Overview

Powered by `unplugin`, this package supports Vite, Webpack, Rspack, and Rollup. It handles AST manipulation at build-time to inject source location metadata into DOM elements, allowing the browser client to trace elements back to their original source code.

## Supported Environment

### UI Frameworks

| Framework | Supported Versions | Notes                                                             |
| :-------- | :----------------- | :---------------------------------------------------------------- |
| React     | >= 16.8.0          | Supported via JSX/TSX AST transformation.                         |
| Vue       | >= 3.0.0           | Supported via Vue SFC compiler. Vue 2 is currently not supported. |

### Build Tools

| Build Tool | Supported Versions | Notes                                                                                 |
| :--------- | :----------------- | :------------------------------------------------------------------------------------ |
| Vite       | >= 2.0.0           | Full support with automatic client injection.                                         |
| Webpack    | >= 4.0.0           | Full support for both Webpack 4 and Webpack 5.                                        |
| Rspack     | >= 0.1.0           | Full support.                                                                         |
| Rollup     | >= 2.0.0           | Build-time injection supported. Client needs manual initialization (see main README). |
| esbuild    | >= 0.14.0          | Build-time injection supported. Client needs manual initialization.                   |

## Core Implementation

- **AST Transformation**: Uses Babel (`@babel/parser`, `@babel/traverse`) for React and `@vue/compiler-sfc` for Vue to parse source files.
- **Source Injection**: Utilizes `MagicString` to reliably inject `data-inspecto="filepath:line:column"` attributes onto HTML elements without breaking source maps.
- **Local Server Lifecycle**: Hooks into the bundler's build cycle (`buildStart`, `buildEnd`) to spawn and teardown the `@inspecto-dev/core` local HTTP server (`portfinder`) during development.
- **Client Injection**: Automatically injects global variables (like `__AI_INSPECTOR_PORT__`) into the client bundle to allow the browser component to discover the local server port.
