# Inspecto

[English](./README.md) | 简体中文

[![@inspecto-dev/plugin](https://img.shields.io/npm/v/@inspecto-dev/plugin?label=@inspecto-dev/plugin)](https://www.npmjs.com/package/@inspecto-dev/plugin)
[![@inspecto-dev/core](https://img.shields.io/npm/v/@inspecto-dev/core?label=@inspecto-dev/core)](https://www.npmjs.com/package/@inspecto-dev/core)
[![@inspecto-dev/cli](https://img.shields.io/npm/v/@inspecto-dev/cli?label=@inspecto-dev/cli)](https://www.npmjs.com/package/@inspecto-dev/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 点击 UI，直达源码，让 AI 带着准确前端上下文修改代码，或执行你的自定义工作流。
> Inspecto 把浏览器里可见的 UI 问题变成源码感知的 AI 交接、批注任务、自定义 prompt 工作流和可追踪的 MCP Agent session。

👉 **[前往 inspecto-dev.github.io/inspecto 阅读完整文档](https://inspecto-dev.github.io/inspecto/zh/)**

<div align="center">
  <table border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td width="33%" align="center">
        <img src="packages/docs/public/inspect-mode.gif" width="100%" alt="Inspect mode workflow" />
        <br/>
        <b>Inspect mode</b><br/>
        点击单个组件，立即 Ask AI
      </td>
      <td width="33%" align="center">
        <img src="packages/docs/public/annotate-mode.gif" width="100%" alt="Annotate mode workflow" />
        <br/>
        <b>Annotate mode</b><br/>
        收集 UI 批注，创建 Agent 任务，并跟进处理进度
      </td>
      <td width="33%" align="center">
        <img src="packages/docs/public/quick-jump.gif" width="100%" alt="Quick jump workflow" />
        <br/>
        <b>Quick jump</b><br/>
        用 <code>Alt</code>+<code>点击</code> 直达源码
      </td>
    </tr>
  </table>
</div>

## 快速开始

第一次使用时，不需要先理解 MCP、IDE route 或各种安装层级。只要做一件事：**选你正在用的编辑器 / AI 助手，然后运行一条命令**。

这条命令会帮你接入最常用的完整体验：浏览器点击组件、`Alt + 点击` 打开源码、把 Inspect / Annotate 上下文交给 AI 助手。

在项目根目录运行**其中一条**命令：

```bash
# VS Code + Copilot
npx @inspecto-dev/cli integrations install copilot --host-ide vscode

# VS Code + Claude Code
npx @inspecto-dev/cli integrations install claude-code --scope project --host-ide vscode

# Cursor builtin
npx @inspecto-dev/cli integrations install cursor --host-ide cursor

# Trae CN + Trae
npx @inspecto-dev/cli integrations install trae --host-ide trae-cn

# VS Code + Codex
npx @inspecto-dev/cli integrations install codex --host-ide vscode

# VS Code + Gemini
npx @inspecto-dev/cli integrations install gemini --host-ide vscode

# Trae CN + Coco
npx @inspecto-dev/cli integrations install coco --host-ide trae-cn

# CodeBuddy
npx @inspecto-dev/cli integrations install codebuddy --host-ide codebuddy-cn
```

_(如果你使用其他包管理器，可以用 `pnpm dlx`、`yarn dlx` 或 `bunx` 代替 `npx`)。_

不知道选哪条？

- VS Code + Copilot：选 `Copilot`
- Cursor：选 `Cursor`
- Trae CN：选 `Trae`；如果你用 Coco，选 `Coco`
- CodeBuddy：选 `CodeBuddy`
- 只想要源码跳转、不接 AI：看[安装指南](https://inspecto-dev.github.io/inspecto/zh/guide/manual-installation)
- 只想让独立 MCP Agent 处理任务、不装 IDE 扩展：看 [MCP 集成](https://inspecto-dev.github.io/inspecto/zh/integrations/mcp)

命令执行后，Inspecto 会尝试在你的 IDE 中打开 onboarding 会话。**如果没有自动打开**，请开启一个 AI 助手聊天并发送：

> _"Set up Inspecto in this project"_

需要了解自动接入做了什么？请查看[官方中文文档](https://inspecto-dev.github.io/inspecto/zh/)。

## 开始使用

1. 在浏览器中打开你的应用。
2. 通过 launcher 使用 `Inspect mode` 或 `Annotate mode`。
3. 随时使用 **`Alt` + `点击`** 执行 `Quick jump`。

如果希望由 Agent 自动处理前端修改，请将 annotate 切到 MCP 模式，收集 UI 批注后点击 **Create Task**。Agent 会从 Inspecto 的 session 队列领取任务并回传进度，浏览器侧边栏会展示当前任务状态、最新进展，以及可展开的完整处理时间线。

你还可以在 `.inspecto/prompts.json` 中定义自定义 workflow 按钮。例如配置一个 `kind: "workflow"` 的 `Deploy Preview` 指令，在标注模式里点击后，Agent 会利用自身已有的 skill、MCP server 和 tool 完成当前分支部署，并把进度回写到 Inspecto。

成功后你应该能看到：

- 页面里的组件可以高亮
- `Inspect mode` 能打开 Inspecto 菜单
- `Quick jump` 可以打开源码位置
- `Annotate mode` 可以创建 MCP Agent 任务，并在浏览器里实时查看处理进度

如果高亮正常，但编辑器中没有收到任何信息，请检查您的 IDE 配置或使用“复制上下文”操作。如果您正在使用 MCP 或独立模式 (`ide: "none"`)，则不需要安装 IDE 插件，详情请查看 [MCP 集成](https://inspecto-dev.github.io/inspecto/zh/integrations/mcp)。

---

> 需要平台专用命令或结构化 onboarding 细节说明，请查看 **[官方中文文档](https://inspecto-dev.github.io/inspecto/zh/)**。

## 社区

- [GitHub Discussions](https://github.com/inspecto-dev/inspecto/discussions)

## 贡献指南

我们非常欢迎社区贡献！请查阅我们的 [Contributing Guide](CONTRIBUTING.md) 了解如何开始，并确保阅读我们的 [Code of Conduct](CODE_OF_CONDUCT.md)。

## 许可证

[MIT](LICENSE)
