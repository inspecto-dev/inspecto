# 手动安装

虽然 `@inspecto-dev/cli` 可以自动处理大部分初始化工作，但如果你正在使用非常复杂的自定义构建脚本，或是某些不完全受官方支持的元框架（Meta-framework），你可能需要进行手动配置。

把这份文档当成兜底路径，而不是默认入口。在大多数情况下，更推荐 assistant-first onboarding 或 `npx @inspecto-dev/cli init`。

在阅读这页之前，请先尝试：

```bash
npx @inspecto-dev/cli integrations install <assistant> --host-ide <vscode|cursor|trae|trae-cn|codebuddy|codebuddy-cn>
```

只有当这条路径不适合你的环境时，再使用手动安装。

## 选择你要开启的能力

手动安装时，直接看“必须安装 / 配置什么”会更清楚。选择第一个符合你目标的场景即可：

### A. 我只想高亮组件并复制上下文

需要安装 / 配置：

1. 安装 `@inspecto-dev/plugin`。
2. 安装 `@inspecto-dev/core`。
3. 在构建工具中启用 Inspecto plugin。

阅读：[1. 安装插件依赖](#_1-安装插件依赖) → [2. 配置构建工具](#_2-配置构建工具)

### B. 我想用 `Alt` / `Option` + 点击打开源码

需要安装 / 配置：

1. 完成 **A** 的全部内容。
2. 本机已经安装编辑器，例如 VS Code、Cursor、Trae 或 CodeBuddy。
3. 可选：如果 Inspecto 打开了错误的编辑器，在 `.inspecto/settings.local.json` 中设置 `ide`。

源码跳转**不需要**安装 Inspecto IDE 扩展。

### C. 我想把 Inspect / Annotate 的 prompt 发送到 IDE 助手

需要安装 / 配置：

1. 完成 **B** 的全部内容。
2. 为你的编辑器安装 Inspecto IDE 扩展。
3. 配置 `provider.default`；或者直接运行自动化的 `integrations install` 命令，不必手动配置。

阅读：[3. 为助手交接安装 IDE 扩展](#_3-为助手交接安装-ide-扩展-可选) → [4. 配置项目参数](#_4-配置项目参数)

### D. 我想使用 MCP Agent session，不接 IDE 助手

需要安装 / 配置：

1. 完成 **A** 的全部内容。
2. 在 `.inspecto/settings.local.json` 中设置 `"annotate.channel": "mcp"`。
3. 在你的 Agent 中添加 Inspecto MCP server。

阅读：[4. 配置项目参数](#_4-配置项目参数) → [MCP 集成](../integrations/mcp.md)

### E. 我想增加 deploy、PR 或 release 这样的自定义 workflow 按钮

需要安装 / 配置：

1. 完成 **A** 的全部内容。
2. 在 `.inspecto/prompts.json` 中增加 `kind: "workflow"` 条目，例如 `Deploy Preview` 或 `Review & PR`。
3. 选择 workflow 要发送到哪里：
   - 如果希望 MCP Agent 利用自身 skill、MCP server 和 tool 执行：完成 **D**。
   - 如果只想交给 IDE 助手：完成 **C**。

更推荐使用 MCP route 执行 workflow 自动化，因为 Inspecto 可以创建可持久化的 workflow session，追加项目元信息，并在浏览器 timeline 中展示 Agent 进度。

### F. 我想全部一起使用

需要安装 / 配置：

1. 完成 **C** 的全部内容。
2. 完成 **D** 的全部内容。
3. 可选：如果需要项目专属 workflow 按钮，完成 **E**。

关键区别很简单：**源码跳转**只需要本地 dev server 调用编辑器打开文件；**IDE 助手交接**才需要 Inspecto IDE 扩展把 prompt 送进助手面板；**MCP route** 负责创建可持久化的标注和 workflow session 让 Agent 领取；**workflow 按钮**则是可配置 prompt，让 Agent 利用自身 skill、MCP server 和 tool 执行项目级指令。这几条路线可以组合，但互不依赖。

这页不包含 assistant onboarding 自动化。它不会：

- 自动为你安装 Inspecto IDE 插件
- 自动在 IDE 中打开 onboarding
- 自动把 onboarding prompt 发送给 assistant

## 1. 安装插件依赖

首先，将插件和核心客户端安装为开发环境依赖：

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

## 2. 配置构建工具

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
    // 通常 inspecto() 应放置在框架专属 plugin 之前
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

Astro 需要使用专门的 integration 入口，而不是仅仅复用通用的 Vite 配置。Inspecto 会在
内部注册 Vite 转换逻辑，并在开发阶段通过 Astro 的页面脚本注入链路挂载浏览器端 runtime。

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

## 3. 为助手交接安装 IDE 扩展（可选）

源码跳转本身**不需要**安装 Inspecto IDE 扩展。`Alt` / `Option` + 点击由本地 Inspecto dev server 处理，它会通过编辑器自带的 URI scheme 或命令行 launcher 打开目标源码文件。

只有当你希望 Inspect / Annotate 操作把 AI prompt 直接发送到 Copilot、Cursor、Trae 或 CodeBuddy 这类 IDE 助手时，才需要安装 Inspecto 配套扩展。没有这个扩展，你仍然可以使用源码跳转、MCP 或“复制上下文”按钮。

请参考 [IDE 扩展集成指南](../integrations/ide.md) 完成 VS Code、Cursor、Trae 或 CodeBuddy 中插件的安装。

> **如果你使用纯浏览器模式 (Standalone) 并且不依赖 IDE 插件，你可以跳过这一步**。请参考 [MCP 集成指南](../integrations/mcp.md) 了解如何将你的独立 Agent 直接连接到 Inspecto，而无需安装任何 IDE 扩展。

## 4. 配置项目参数

由于你跳过了自动化的 CLI 初始化流程，Inspecto 目前并不知道你实际使用的是哪款 AI 助手或编辑器。因此你必须在项目根目录下手动创建一个配置文件。

请在项目根目录创建 `.inspecto/settings.local.json` 文件，并填入以下配置（请根据你的实际环境替换 `ide` 和 `provider.default` 字段的值）：

```json
{
  "ide": "vscode",
  "provider.default": "copilot.extension",
  "annotate.channel": "mcp",
  "server.publicUrl": "http://127.0.0.1:5678"
}
```

- `annotate.channel`: 如果使用 MCP，请设为 `"mcp"`；如果只走 IDE 派发，可省略或使用 `"ide"`
- `server.publicUrl`: 可选的浏览器可访问 Inspecto 服务地址。当服务端监听地址和浏览器实际访问地址不一致时使用，例如 devbox、端口转发、远程容器或 tunnel 场景。

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
    // 仅在客户端开发环境注入
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
    serverUrl: 'http://127.0.0.1:5678', // 默认的本地服务地址
  })
}
```
