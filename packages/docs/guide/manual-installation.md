# Manual Installation

While the `@inspecto-dev/cli` handles most setups automatically, you might need to configure Inspecto manually if you are using a complex custom build setup or an unsupported meta-framework.

Use this guide as a fallback, not as the default first step. In the common case, the clearest setup path is still assistant-first onboarding or `npx @inspecto-dev/cli init`.

Before following this page, first try:

```bash
npx @inspecto-dev/cli integrations install <assistant> --host-ide <vscode|cursor|trae|trae-cn|codebuddy|codebuddy-cn>
```

Use manual installation only when that path does not fit your environment.

This page does not cover assistant onboarding automation. It will not:

- install the Inspecto IDE extension for you
- open onboarding in your IDE
- send the onboarding prompt to your assistant

## 1. Install the Plugin

First, install the plugin and the core client as development dependencies:

::: code-group

```bash [npm]
npm install -D @inspecto-dev/plugin @inspecto-dev/core
```

```bash [pnpm]
pnpm add -D @inspecto-dev/plugin @inspecto-dev/core
```

```bash [yarn]
yarn add -D @inspecto-dev/plugin @inspecto-dev/core
```

:::

## 2. Configure Build Tool

### Vite (React, Vue, Svelte, Solid)

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { vitePlugin as inspecto } from '@inspecto-dev/plugin'
// import react from '@vitejs/plugin-react'
// import { svelte } from '@sveltejs/vite-plugin-svelte'
// import solid from 'vite-plugin-solid'
export default defineConfig({
  plugins: [
    // inspecto() should typically be placed before the framework plugin
    // except for React where order generally matters less
    inspecto(),
    // frameworkPlugin(),
  ],
})
```

### Astro

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config'
import { astroIntegration as inspecto } from '@inspecto-dev/plugin/astro'

export default defineConfig({
  integrations: [inspecto()],
})
```

Astro uses a dedicated integration entry instead of the generic Vite-only setup. Inspecto will
register its Vite transform internally and inject the browser runtime through Astro's page script
pipeline during development.

### Webpack

The plugin supports both Webpack 5 (default) and Webpack 4.

```javascript
// webpack.config.js (Webpack 5)
const { webpackPlugin: inspecto } = require('@inspecto-dev/plugin')

module.exports = {
  plugins: [inspecto()],
}
```

If you are using **Webpack 4** (e.g. older Vue CLI or CRA projects), import the legacy plugin instead:

```javascript
// webpack.config.js (Webpack 4)
const { webpackPlugin: inspecto } = require('@inspecto-dev/plugin/legacy/webpack4')

module.exports = {
  plugins: [inspecto()],
}
```

### Rspack / Rsbuild

The plugin supports modern Rspack versions out of the box.

```typescript
// rspack.config.ts
import { rspackPlugin as inspecto } from '@inspecto-dev/plugin'

export default {
  plugins: [inspecto()],
}
```

If you are using an older version of Rspack (e.g., `< 0.4.x`) that does not fully support the new AST transformation APIs, import the legacy loader-based plugin:

```typescript
// rspack.config.ts (Older Rspack versions)
import { rspackPlugin as inspecto } from '@inspecto-dev/plugin/legacy/rspack'

export default {
  plugins: [inspecto()],
}
```

## 3. Install IDE Extension (Optional)

If you want the browser to send code directly to your IDE via URI schemes, install the Inspecto companion extension for your editor. Without this extension, you can still use MCP or the "Copy Context" button.

Please refer to the [IDE Extensions Guide](../integrations/ide.md) for instructions on installing the plugin in VS Code, Cursor, Trae, or CodeBuddy.

> **If you are using Standalone mode and do not rely on IDE plugins, you can skip this step**. Please refer to the [MCP Integration Guide](../integrations/mcp.md) to learn how to connect your agent directly to Inspecto without installing any IDE extensions.

## 4. Configure Project Settings

Because you skipped the automated `init` CLI, Inspecto does not know which AI assistant or IDE you are using. You need to create a configuration file manually in your project root.

Create a file named `.inspecto/settings.local.json` and add the following config (adjust the fields to match your actual environment):

```json
{
  "ide": "vscode",
  "provider.default": "copilot.extension",
  "annotate.deliveryMode": "agent",
  "server.publicUrl": "http://127.0.0.1:5678"
}
```

- `ide`: your editor (`vscode`, `cursor`, `trae`, `trae-cn`, `codebuddy`, `codebuddy-cn`, or `none` for standalone/MCP mode)
- `provider.default`: your AI assistant (e.g. `copilot.extension`, `claude-code.extension`, `cursor.builtin`)
- `annotate.deliveryMode`: set to `"agent"` or `"both"` if using MCP; omit or use `"ide"` for IDE-only dispatch
- `server.publicUrl`: optional browser-visible base URL for the local Inspecto server. Set this when the server listens on one address but must be reached from the browser through another address, such as devboxes, tunnels, or remote containers.

> **Important**: After making these changes, remember to **restart your development server** so that the Inspecto plugin can pick up your custom settings.

---

## Meta-Frameworks

For some meta-frameworks, you need to inject the plugin into their underlying bundler manually.

### Next.js

_Note: Next.js support is experimental and requires manual configuration._

```javascript
// next.config.mjs
import { webpackPlugin as inspecto } from '@inspecto-dev/plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    // Inject only during client-side development
    if (dev && !isServer) {
      config.plugins.push(inspecto())
    }
    return config
  },
}

export default nextConfig
```

### Nuxt.js

For Nuxt, you need to configure the Vite plugin AND manually initialize the core client on the client side.

**1. Update `nuxt.config.ts`**

```typescript
import { vitePlugin as inspecto } from '@inspecto-dev/plugin'

export default defineNuxtConfig({
  vite: {
    plugins: [inspecto()],
  },
})
```

**2. Create Client Plugin** (e.g., `plugins/inspecto.client.ts`):

```typescript
export default defineNuxtPlugin(() => {
  if (import.meta.dev) {
    import('@inspecto-dev/core').then(({ mountInspector }) => {
      mountInspector()
    })
  }
})
```

---

## Bundlers without Dev Servers

If you are using pure bundlers like **Rollup** or **esbuild**, they do not have built-in dev servers to automatically inject the client script. You must manually import and initialize `@inspecto-dev/core`.

**1. Install the core client**

```bash
npm install -D @inspecto-dev/core
```

**2. Initialize in your entry point** (e.g., `src/main.js`):

```javascript
import { mountInspector } from '@inspecto-dev/core'

if (process.env.NODE_ENV !== 'production') {
  mountInspector({
    serverUrl: 'http://127.0.0.1:5678', // Default local server URL
  })
}
```
