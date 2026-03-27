# inspecto

[English](./README.md) | 简体中文

[![npm version](https://badge.fury.io/js/%40inspecto%2Fplugin.svg)](https://badge.fury.io/js/%40inspecto%2Fplugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 点击。提取。发送给 AI。点击任意 UI 元素，即可瞬间将其源代码上下文发送给你的 AI 助手。

## 特性

- 🖱️ **点击审查**：在开发环境中按住热键点击任意 JSX/Vue 元素
- 🤖 **直达 AI**：自动提取源码上下文并直接发送给 AI 助手（GitHub Copilot, Claude Code, CodeX, Gemini, Coco 等）
- ⚡ **零生产开销**：基于编译时 AST 注入，生产环境自动 Treeshaking，零运行时负担
- 🎨 **框架无关**：纯 Web Component 实现的 Shadow DOM 遮罩层，不干扰业务样式
- 🔧 **广泛的构建支持**：支持 Vite, Webpack, Rspack, esbuild, rollup (基于 unplugin)
- ⌨️ **高度可配**：支持自定义热键、多目标 AI 切换
- 🛠️ **智能初始化**：通过 `npx inspecto init` 一键探测环境并完成所有配置

## 快速开始

最简单的开始方式是使用 Inspecto CLI。它会自动探测你的包管理器、构建工具、框架以及已安装的 AI 工具，并为你配置好一切。

```bash
npx inspecto init
```

CLI 会自动执行以下操作：

1. **探测** 你的包管理器 (npm, pnpm, yarn, bun)
2. **探测** 你的构建工具/框架 (Vite, Webpack, Rspack, Rsbuild, Next.js)
3. **探测** 你的主流 IDE (VS Code, Cursor, Trae, Windsurf, WebStorm)
4. **探测** 已安装的 AI 工具（支持 CLI 模式和插件模式）
5. **安装** 必要的 `@inspecto/plugin` 依赖
6. **注入** 插件配置到你的构建文件（通过 AST 转换）
7. **安装** 对应的 IDE 扩展
8. **配置** 你的 `.inspecto/settings.json` 并更新 `.gitignore`

### 手动安装

如果你更喜欢手动配置，请根据你的构建工具遵循以下步骤：

**1. 安装插件**

```bash
npm install -D @inspecto/plugin
```

**2. 配置构建工具**

**Vite (`vite.config.ts`)**

```typescript
import { vitePlugin as inspecto } from '@inspecto/plugin'

export default defineConfig({
  plugins: [react(), inspecto()],
})
```

**Webpack (`webpack.config.js`)**

```javascript
const { webpackPlugin: inspecto } = require('@inspecto/plugin')

module.exports = {
  plugins: [inspecto()],
}
```

**Rspack (`rspack.config.ts`)**

```typescript
import { rspackPlugin as inspecto } from '@inspecto/plugin'

export default {
  plugins: [inspecto()],
}
```

**Rollup (`rollup.config.js`)**

```javascript
import { rollupPlugin as inspecto } from '@inspecto/plugin'

export default {
  plugins: [inspecto()],
}
```

**esbuild (`build.js`)**

```javascript
import { build } from 'esbuild'
import { esbuildPlugin as inspecto } from '@inspecto/plugin'

build({
  plugins: [inspecto()],
})
```

> **Rollup 和 esbuild 用户注意：**
> 与 Vite 和 Webpack 不同，Rollup 和 esbuild 没有内置的 dev server 钩子来自动注入客户端代码。你需要在你的应用入口文件（如 `main.js`）中手动安装并初始化核心客户端：
>
> ```bash
> npm install -D @inspecto/core
> ```
>
> ```javascript
> // src/main.js
> import { mountInspector } from '@inspecto/core'
>
> if (process.env.NODE_ENV !== 'production') {
>   mountInspector({
>     serverUrl: 'http://127.0.0.1:5678', // 默认的本地服务端口
>   })
> }
> ```

**3. 安装 IDE 扩展**

在你的编辑器扩展市场中搜索 "Inspecto" 并安装。

## CLI 命令

Inspecto 提供了一个强大的 CLI 来管理整个集成生命周期：

### `init`

在项目中初始化 Inspecto。如果检测到多个构建工具或 AI 工具，它会提供一个交互式终端提示让你选择首选配置。

```bash
npx inspecto init
```

### `doctor`

诊断当前环境，检查你的构建工具、IDE 和 AI 工具是否受 Inspecto 支持。非常适合用于排查故障。

```bash
npx inspecto doctor
```

### `teardown`

安全地移除所有 Inspecto 配置：卸载依赖、移除构建文件中的 AST 注入、并删除项目中生成的配置文件。

```bash
npx inspecto teardown
```

## AI 工具支持

Inspecto 智能地连接了浏览器和本地 AI 助手。它支持两种不同的交互模式，并在 `init` 期间自动探测：

- **插件模式 (IDE 扩展)**: GitHub Copilot, Claude Code Extension, Gemini Plugin, CodeX.
- **CLI 模式 (终端)**: Claude CLI (`claude`), Coco CLI (`coco`), CodeX CLI, Gemini CLI.

如果某个 AI 工具同时支持两种模式（例如 Claude），Inspecto 会检测出两者，并让你选择首选的交互方式。

## 配置指南

Inspecto 的配置分为两部分：**构建插件配置**（用于开发时的代码注入）和**用户设置**（用于自定义热键、AI 目标和编辑器行为）。

### 1. 构建插件配置

这些选项传递给 unplugin 包装器（例如在 `vite.config.ts`, `webpack.config.js` 或 `rspack.config.js` 中），用于控制代码在编译时如何被处理。

```typescript
import { vitePlugin as inspecto } from '@inspecto/plugin'

export default defineConfig({
  plugins: [
    inspecto({
      pathType: 'absolute',
      escapeTags: ['template', 'script', 'style', 'Fragment'], // 忽略的标签
      attributeName: 'data-inspecto', // 自定义 DOM 属性名
      include: ['**/*.{js,jsx,ts,tsx,vue}'],
      exclude: ['node_modules/**', 'dist/**'],
    }),
  ],
})
```

| 选项                  | 类型                         | 默认值            | 描述                                                |
| :-------------------- | :--------------------------- | :---------------- | :-------------------------------------------------- |
| `pathType`            | `'absolute'` \| `'relative'` | `'absolute'`      | 注入的路径类型。`'absolute'` 对于 monorepo 更安全。 |
| `escapeTags`          | `string[]`                   | `[...]`           | 不应注入 `data-inspecto` 属性的 HTML 标签。         |
| `attributeName`       | `string`                     | `'data-inspecto'` | 用于存储源码坐标的 DOM 属性名。                     |
| `include` / `exclude` | `string[]`                   | -                 | 用于转换步骤的文件匹配模式 (picomatch)。            |

### 2. 用户设置 (`.inspecto/settings.json`)

运行时行为、热键和 AI 目标使用 `settings.json` 文件进行配置。你可以将此文件放置在项目根目录（`<gitRoot>/.inspecto/settings.json`）以便与团队共享，或者放在系统用户目录（`~/.inspecto/settings.json`）作为全局偏好。

#### 示例 `.inspecto/settings.json`

```json
{
  "hotKeys": ["altKey"],
  "ide": "vscode",
  "prefer": "github-copilot",
  "includeSnippet": false,
  "providers": {
    "github-copilot": { "autoSend": false, "type": "plugin" },
    "claude-code": {
      "type": "cli",
      "bin": "claude"
    }
  }
}
```

#### 配置项参考

- **`hotKeys`**: 触发热键。修饰键数组（`'altKey'`, `'ctrlKey'`, `'metaKey'`, `'shiftKey'`）或设为 `false` 禁用热键触发。（默认：`['altKey']`）
- **`ide`**: 强制指定 IDE 上下文（`"vscode"`, `"cursor"`, `"trae"`, `"windsurf"`）。如果省略，Inspecto 会基于环境自动探测。
- **`prefer`**: 默认唤起的 AI 工具（`"github-copilot"`, `"claude-code"`, `"gemini"`, `"codex"`, `"coco"`）。
- **`includeSnippet`**: 是否将原始代码片段注入到 prompt 中。当使用 IDE 原生 AI 工具（Copilot/Cursor/Trae）时，将此项设置为 `false`（默认值）可以节省 token，因为 AI 能够直接读取本地文件。
- **`providers`**: 各个工具的具体配置。
  - **`type`**: 强制指定交互模式（`"plugin"` 或 `"cli"`）。
  - **`bin`**: CLI 可执行文件名称或绝对路径（仅限 CLI 模式）。
  - **`args`**: 额外的启动参数（仅限 CLI 模式）。
  - **`cwd`**: CLI 进程的工作目录（仅限 CLI 模式）。
  - **`autoSend`**: 是否在发送上下文后自动按下回车提交。（默认：`false`）

## CLI 启动延迟 (Cold Start Delay)

当通过终端集成直接使用像 `claude-code` 或 `coco-cli` 这样的 CLI 工具时，扩展需要等待 CLI 工具完全初始化其交互式 REPL 后，才能粘贴初始 Prompt。

由于初始化时间在很大程度上取决于你机器的性能、网络速度以及 Node 模块解析速度，**首次执行的默认安全延迟被设置为 5 秒（5000ms）**。

你可以在你的 IDE 设置中配置此延迟，以更好地匹配你系统的性能：

```json
{
  "inspecto.cliColdStartDelay": 5000
}
```

> **注意：** 如果你将此值设置得太低，CLI 可能会在其启动序列中清空终端缓冲区，导致你发送的上下文丢失。此延迟**仅**适用于 CLI 的首次启动。后续请求将会瞬间执行。

## 社区

- [GitHub Discussions](https://github.com/inspecto-dev/inspecto/discussions)

## 贡献指南

我们非常欢迎社区贡献！请查阅我们的 [Contributing Guide](CONTRIBUTING.md) 了解如何开始，并确保阅读我们的 [Code of Conduct](CODE_OF_CONDUCT.md)。

## 许可证

[MIT](LICENSE)
