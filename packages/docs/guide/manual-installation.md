# Manual Installation

While the `@inspecto-dev/cli` handles most setups automatically, you might need to configure Inspecto manually if you are using a complex custom build setup or an unsupported meta-framework.

Use this guide as a fallback, not as the default first step. In the common case, the clearest setup path is still assistant-first onboarding or `inspecto init`.

Before following this page, first try:

```bash
npx @inspecto-dev/cli integrations install <assistant> --host-ide <vscode|cursor|trae|trae-cn>
```

Use manual installation only when that path does not fit your environment.

This page does not cover assistant onboarding automation. It will not:

- install the Inspecto IDE extension for you
- open onboarding in your IDE
- send the onboarding prompt to your assistant

## 1. Install the Plugin

First, install the plugin as a development dependency:

::: code-group

```bash [npm]
npm install -D @inspecto-dev/plugin
```

```bash [pnpm]
pnpm add -D @inspecto-dev/plugin
```

```bash [yarn]
yarn add -D @inspecto-dev/plugin
```

:::

## 2. Configure Build Tool

### Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { vitePlugin as inspecto } from '@inspecto-dev/plugin'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), inspecto()],
})
```

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

## 3. Install IDE Extension (Required)

Unlike assistant-first onboarding or `inspecto init`, manual installation does not manage the IDE plugin for you. **You must install the Inspecto companion extension for your editor yourself.** Without this extension, the browser will not be able to send code to your IDE.

Please refer to the [IDE Extensions Guide](../integrations/ide.md) for instructions on installing the plugin in VS Code, Cursor, or Trae.

## 4. Configure Project Settings

Because you skipped the automated `init` CLI, Inspecto does not know which AI assistant or IDE you are using. You need to create a configuration file manually in your project root.

Create a file named `.inspecto/settings.local.json` and add the following config (adjust the `ide` and `provider.default` fields to match your actual environment):

```json
{
  "ide": "vscode",
  "provider.default": "copilot.extension"
}
```

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
    // Keep the plugin active in both server and client development compilers
    // so App Router server components also receive Inspecto transforms.
    if (dev) {
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

**2. Install Core Client**

```bash
npm install -D @inspecto-dev/core
```

**3. Create Client Plugin** (e.g., `plugins/inspecto.client.ts`):

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

**1. Install Core**

```bash
npm install -D @inspecto-dev/core
```

**2. Initialize in your entry point** (e.g., `src/main.js`):

```javascript
import { mountInspector } from '@inspecto-dev/core'

if (process.env.NODE_ENV !== 'production') {
  mountInspector({
    serverUrl: 'http://127.0.0.1:5678', // Default local server port
  })
}
```
