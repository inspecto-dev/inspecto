# 快速开始

最简单的开始方式是通过支持 assistant 的环境来接入 Inspecto：让助手先探测项目、生成计划、请求确认，再执行接入。如果你直接在终端里操作，`inspecto init` 仍然是保留的引导式入口。

## Assistant-First 接入

如果你的环境支持 assistant 原生集成，推荐使用结构化 CLI 流程：

1. `inspecto detect --json`
2. `inspecto plan --json`
3. `inspecto apply`
4. `inspecto doctor --json`

这样助手就能在真正修改文件之前先向你解释接入计划。

如果你使用 Codex、Claude Code、Copilot、Cursor、Gemini、Trae 或 Coco，可以从 [Onboarding 集成](../integrations/onboarding-skills.md) 页面选择对应的平台入口，再让它帮你完成接入。

推荐安装卡片：

### Codex

```text
Use $skill-installer to install https://github.com/inspecto-dev/inspecto/tree/main/skills/inspecto-onboarding-codex
```

然后直接说：

```text
Use $inspecto-onboarding-codex to set up Inspecto in this project
```

### Claude Code

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- claude-code project
```

然后直接说：

推荐直接使用下面这句英文提示词，以减少不同 assistant 对中文措辞的理解偏差：

```text
Use inspecto-onboarding-claude-code to set up Inspecto in this project
```

### Copilot

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- copilot
```

然后直接说：

推荐直接使用下面这句英文提示词，以减少不同 assistant 对中文措辞的理解偏差：

```text
Set up Inspecto in this project and show me the plan before changing files
```

### Cursor

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- cursor rules
```

然后直接说：

推荐直接使用下面这句英文提示词，以减少不同 assistant 对中文措辞的理解偏差：

```text
Set up Inspecto in this project and show me the plan before changing files
```

### Gemini

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- gemini
```

然后直接说：

推荐直接使用下面这句英文提示词，以减少不同 assistant 对中文措辞的理解偏差：

```text
Set up Inspecto in this project and show me the plan before changing files
```

### Trae

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- trae
```

然后直接说：

推荐直接使用下面这句英文提示词，以减少不同 assistant 对中文措辞的理解偏差：

```text
Set up Inspecto in this project and show me the plan before changing files
```

### Coco

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- coco
```

然后直接说：

推荐直接使用下面这句英文提示词，以减少不同 assistant 对中文措辞的理解偏差：

```text
Set up Inspecto in this project and show me the plan before changing files
```

如果你要把 Inspecto 集成到自定义 skill、规则文件或 agent runtime 中，请以英文版 [Onboarding Contract](../../integrations/onboarding-contract.md) 作为 JSON 字段和状态语义的唯一来源。

## 一键初始化

如果你直接在终端中操作，请在你的 **项目根目录** 下运行初始化命令：

::: code-group

```bash [npm]
npx @inspecto-dev/cli@latest init
```

```bash [pnpm]
pnpm dlx @inspecto-dev/cli@latest init
```

```bash [yarn]
yarn dlx @inspecto-dev/cli@latest init
```

```bash [bun]
bunx @inspecto-dev/cli@latest init
```

:::

### 接下来做什么？

初始化完成后，只需启动你的开发服务器（如 `npm run dev`），打开浏览器，在任意组件上 **按住 `Alt` + `点击`** ，即可瞬间将该组件的源码发送给你的 AI！

::: tip CLI 在背后为你做了什么？
CLI 会自动执行以下操作：

1. **探测** 你的包管理器 (npm, pnpm, yarn, bun)
2. **探测** 你的构建工具/框架 (Vite, Webpack, Rspack, Rsbuild)
3. **探测** 你的主流 IDE (VS Code, Cursor, Trae)
4. **探测** 已安装的 AI 工具（支持 CLI 模式和插件模式）
5. **安装** 必要的 `@inspecto-dev/plugin` 依赖
6. **注入** 插件配置到你的 Vite/Webpack/Rspack 构建文件中（通过 AST 转换）
7. **安装** 对应的 IDE 扩展
8. **配置** 你的 `.inspecto/settings.local.json` 并更新 `.gitignore`
   :::

## 支持的环境

### UI 框架

| 框架  | 支持的版本 | 说明                                              |
| :---- | :--------- | :------------------------------------------------ |
| React | >= 16.8.0  | 通过 JSX/TSX AST 转换提供支持。                   |
| Vue   | >= 3.0.0   | 通过 Vue SFC 编译器提供支持。目前暂不支持 Vue 2。 |

### 构建工具

| 构建工具 | 支持的版本 | 说明                                         |
| :------- | :--------- | :------------------------------------------- |
| Vite     | >= 2.0.0   | 完全支持，自动注入客户端脚本。               |
| Webpack  | >= 4.0.0   | 完全支持 Webpack 4 和 Webpack 5。            |
| Rspack   | >= 0.1.0   | 完全支持。                                   |
| Rsbuild  | >= 0.1.0   | 通过 Rspack 插件完全支持。                   |
| Rollup   | >= 2.0.0   | 支持构建时代码注入。客户端脚本需手动初始化。 |
| esbuild  | >= 0.14.0  | 支持构建时代码注入。客户端脚本需手动初始化。 |

## AI 工具支持

Inspecto 智能地连接了浏览器和本地 AI 助手。它支持三种不同的交互模式，并会在结构化 onboarding 流程或 `init` 期间自动探测：

- **插件模式 (IDE 扩展)**: GitHub Copilot, Claude Code Extension, Gemini Plugin, CodeX.
- **CLI 模式 (终端)**: Claude CLI (`claude`), Coco CLI (`coco`), CodeX CLI, Gemini CLI.
- **内置模式 (原生 IDE)**: Trae, Cursor (无需额外安装扩展的原生 AI 继承).

## 遇到问题？

如果在初始化或使用过程中遇到没有高亮、发送失败等情况，请优先运行环境诊断工具：

```bash
npx @inspecto-dev/cli doctor
```

如果你是通过 assistant 集成接入的，也可以让它重新运行 `doctor --json` 来继续诊断问题。

更多常见问题排查（如快捷键冲突、IDE 插件无响应等），请参考 [常见问题与排查指南 (FAQ)](./faq.md)。
