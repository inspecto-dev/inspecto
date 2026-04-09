# 手动安装

虽然 `@inspecto-dev/cli` 可以自动处理大部分初始化工作，但如果你正在使用非常复杂的自定义构建脚本，或是某些不完全受官方支持的元框架（Meta-framework），你可能需要进行手动配置。

把这份文档当成兜底路径，而不是默认入口。在大多数情况下，更推荐 assistant-first onboarding 或 `inspecto init`。

在阅读这页之前，请先尝试：

```bash
npx @inspecto-dev/cli integrations install <assistant> --host-ide <vscode|cursor|trae|trae-cn>
```

只有当这条路径不适合你的环境时，再使用手动安装。

这页不包含 assistant onboarding 自动化。它不会：

- 自动为你安装 Inspecto IDE 插件
- 自动在 IDE 中打开 onboarding
- 自动把 onboarding prompt 发送给 assistant

## 1. 安装插件依赖

首先，将插件安装为开发环境依赖：

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

## 2. 配置构建工具

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

该插件同时支持 Webpack 5（默认）和 Webpack 4。

```javascript
// webpack.config.js (适用于 Webpack 5)
const { webpackPlugin: inspecto } = require('@inspecto-dev/plugin')

module.exports = {
  plugins: [inspecto()],
}
```

如果你正在使用的是 **Webpack 4**（例如比较老的 Vue CLI 或 Create React App 项目），你需要引入配套的旧版插件：

```javascript
// webpack.config.js (适用于 Webpack 4)
const { webpackPlugin: inspecto } = require('@inspecto-dev/plugin/legacy/webpack4')

module.exports = {
  plugins: [inspecto()],
}
```

### Rspack / Rsbuild

该插件默认完美支持现代版本的 Rspack。

```typescript
// rspack.config.ts
import { rspackPlugin as inspecto } from '@inspecto-dev/plugin'

export default {
  plugins: [inspecto()],
}
```

如果你使用的是较低版本的 Rspack（例如 `< 0.4.x`）尚未完全支持较新的 AST Transform API，请引入基于 loader 的旧版插件：

```typescript
// rspack.config.ts (适用于旧版 Rspack)
import { rspackPlugin as inspecto } from '@inspecto-dev/plugin/legacy/rspack'

export default {
  plugins: [inspecto()],
}
```

## 3. 安装 IDE 扩展（必须）

与 assistant-first onboarding 或 `inspecto init` 不同，手动安装时**你必须自己为你的编辑器安装 Inspecto 配套扩展**。没有这个扩展，浏览器将无法把代码发送到你的 IDE 中。

请参考 [IDE 扩展集成指南](../integrations/ide.md) 完成 VS Code、Cursor 或 Trae 中插件的安装。

## 4. 配置项目参数

由于你跳过了自动化的 CLI 初始化流程，Inspecto 目前并不知道你实际使用的是哪款 AI 助手或编辑器。因此你必须在项目根目录下手动创建一个配置文件。

请在项目根目录创建 `.inspecto/settings.local.json` 文件，并填入以下配置（请根据你的实际环境替换 `ide` 和 `provider.default` 字段的值）：

```json
{
  "ide": "vscode",
  "provider.default": "copilot.extension"
}
```

> **重要**：添加完配置文件后，请务必**重启你的开发服务器（Dev Server）**，以便插件读取到你的自定义配置。

---

## 元框架 (Meta-Frameworks)

对于某些元框架，你需要手动将插件注入到其底层的打包器配置中。

### Next.js

_注意：Next.js 目前属于实验性支持，在当前版本中需要通过自定义 Webpack 配置实现。_

```javascript
// next.config.mjs
import { webpackPlugin as inspecto } from '@inspecto-dev/plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    // 仅在开发环境并且是客户端构建时注入
    if (dev && !isServer) {
      config.plugins.push(inspecto())
    }
    return config
  },
}

export default nextConfig
```

### Nuxt.js

对于 Nuxt，除了配置底层的 Vite 插件，你还需要在客户端手动挂载 core 包的脚本。

**1. 修改 `nuxt.config.ts`**

```typescript
import { vitePlugin as inspecto } from '@inspecto-dev/plugin'

export default defineNuxtConfig({
  vite: {
    plugins: [inspecto()],
  },
})
```

**2. 安装核心客户端**

```bash
npm install -D @inspecto-dev/core
```

**3. 创建仅限客户端运行的插件** (例如 `plugins/inspecto.client.ts`):

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

## 没有内置 Dev Server 的打包器

如果你使用 **Rollup** 或 **esbuild** 等纯粹的打包工具，它们并没有提供像 Vite 那样强大的 Dev Server 钩子来帮你自动插入客户端脚本。你必须在业务代码入口处手动挂载 `@inspecto-dev/core`。

**1. 安装核心客户端**

```bash
npm install -D @inspecto-dev/core
```

**2. 在项目入口点初始化** (例如 `src/main.js`):

```javascript
import { mountInspector } from '@inspecto-dev/core'

if (process.env.NODE_ENV !== 'production') {
  mountInspector({
    serverUrl: 'http://127.0.0.1:5678', // 默认的本地服务端口
  })
}
```
