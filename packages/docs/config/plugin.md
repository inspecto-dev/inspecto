# Plugin Configuration

The build plugin configuration options are passed to the unplugin wrapper (e.g., in `vite.config.ts`, `webpack.config.js`, or `rspack.config.js`). They control how your code is instrumented at compile time.

## Example

::: code-group

```typescript [Vite]
// vite.config.ts
import { defineConfig } from 'vite'
import { vitePlugin as inspecto } from '@inspecto-dev/plugin'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    inspecto({
      pathType: 'absolute',
      escapeTags: ['template', 'script', 'style', 'Fragment'],
      attributeName: 'data-inspecto',
      include: ['**/*.{js,jsx,ts,tsx,vue}'],
      exclude: ['node_modules/**', 'dist/**'],
    }),
  ],
})
```

```javascript [Webpack]
// webpack.config.js
const { webpackPlugin: inspecto } = require('@inspecto-dev/plugin')

module.exports = {
  plugins: [
    inspecto({
      pathType: 'absolute',
      // ...other options
    }),
  ],
}
```

```typescript [Rspack]
// rspack.config.ts
import { rspackPlugin as inspecto } from '@inspecto-dev/plugin'

export default {
  plugins: [
    inspecto({
      pathType: 'absolute',
      // ...other options
    }),
  ],
}
```

:::

## Options Reference

### `pathType`

- **Type:** `'absolute' | 'relative'`
- **Default:** `'absolute'`
- **Description:** Path type injected into `data-inspecto` attributes. `'absolute'` is safer for monorepos and symlinked dependencies (like pnpm's virtual store).

### `escapeTags`

- **Type:** `string[]`
- **Default:** `['template', 'script', 'style', 'Transition', 'TransitionGroup', 'KeepAlive', 'Teleport', 'Suspense', 'Fragment', ...]`
- **Description:** Element tag names to skip source injection. Useful for framework-internal elements that should not carry source data.

### `attributeName`

- **Type:** `string`
- **Default:** `'data-inspecto'`
- **Description:** The DOM attribute name used to store source coordinates. Change only if `'data-inspecto'` conflicts with another tool.

### `include`

- **Type:** `string[]`
- **Default:** `[]`
- **Description:** File path patterns to include for transform. Matched using picomatch. `.jsx, .tsx, .js, .ts, .vue` are included by default.

### `exclude`

- **Type:** `string[]`
- **Default:** `[]`
- **Description:** File path patterns to exclude from transform. `node_modules` and `dist` are always excluded automatically.

### `logLevel`

- **Type:** `'info' | 'warn' | 'error' | 'silent'`
- **Default:** `'warn'`
- **Description:** Console log level for the plugin.
