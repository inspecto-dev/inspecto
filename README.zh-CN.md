# inspecto

[English](./README.md) | 简体中文

[![@inspecto-dev/plugin](https://img.shields.io/npm/v/@inspecto-dev/plugin?label=@inspecto-dev/plugin)](https://www.npmjs.com/package/@inspecto-dev/plugin)
[![@inspecto-dev/core](https://img.shields.io/npm/v/@inspecto-dev/core?label=@inspecto-dev/core)](https://www.npmjs.com/package/@inspecto-dev/core)
[![@inspecto-dev/cli](https://img.shields.io/npm/v/@inspecto-dev/cli?label=@inspecto-dev/cli)](https://www.npmjs.com/package/@inspecto-dev/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 点击。提取。发送给 AI。点击任意 UI 元素，即可瞬间将其源代码上下文发送给你的 AI 助手。

👉 **[前往 inspecto-dev.github.io/inspecto 阅读完整文档](https://inspecto-dev.github.io/inspecto/zh/)**

## 特性

- 🖱️ **点击审查**：在开发环境中按住热键点击任意 JSX/Vue 元素
- 🤖 **直达 AI**：自动提取源码上下文并直接发送给 AI 助手（GitHub Copilot, Claude Code, CodeX, Cursor, Gemini, Trae 等）
- ⚡ **零生产开销**：基于编译时 AST 注入，生产环境自动 Treeshaking，零运行时负担
- 🎨 **框架无关**：纯 Web Component 实现的 Shadow DOM 遮罩层，不干扰业务样式
- 🔧 **广泛的构建支持**：支持 Vite, Webpack, Rspack, esbuild, rollup, next.js, nuxt.js 等
- ⌨️ **高度可配**：支持自定义热键、多目标 AI 切换
- 🛠️ **智能初始化**：优先通过原生 skill、原生指令模板或兼容模板接入，终端里仍可回退到 `npx @inspecto-dev/cli init`

## 快速开始

最简单的开始方式是通过支持 assistant 的环境来接入 Inspecto。找到你正在使用的 assistant，然后执行对应安装步骤：

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

如果你直接在终端中操作，保留的引导式入口仍然是：

```bash
npx @inspecto-dev/cli@latest init
```

### 接下来做什么？

初始化完成后，只需启动你的开发服务器（如 `npm run dev`），打开浏览器，在任意组件上 **按住 `Alt` + `点击`** ，即可瞬间将该组件的源码发送给你的 AI！

---

> 有关 onboarding 集成、结构化 CLI 协议、平台安装步骤、API 配置项、用户设置以及 IDE 集成的详细说明，请访问我们的 **[官方中文文档](https://inspecto-dev.github.io/inspecto/zh/)**。

## 社区

- [GitHub Discussions](https://github.com/inspecto-dev/inspecto/discussions)

## 贡献指南

我们非常欢迎社区贡献！请查阅我们的 [Contributing Guide](CONTRIBUTING.md) 了解如何开始，并确保阅读我们的 [Code of Conduct](CODE_OF_CONDUCT.md)。

## 许可证

[MIT](LICENSE)
