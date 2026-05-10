# 快速开始

Inspecto 适合这样一种场景：你已经在浏览器里看到了问题，现在想立刻定位源码，或者把正确上下文交给当前配置的 AI Agent。

## 快速接入

第一次使用时，不需要先理解 MCP、IDE route 或各种安装层级。只要做一件事：**选你正在用的编辑器 / AI 助手，然后运行一条命令**。

这条命令会帮你接入最常用的完整体验：

- 浏览器里点击组件，自动带上源码上下文；
- `Alt + 点击` 直接打开源码；
- 在 Inspect / Annotate 模式里把上下文交给你的 AI 助手。
- 后续也可以增加项目专属 workflow 按钮，例如 `Deploy Preview`、`Review & PR` 或 `Release`。

在项目根目录运行**其中一条**命令：

::: code-group

```bash [Copilot]
npx @inspecto-dev/cli integrations install copilot --host-ide vscode
```

```bash [Claude Code]
npx @inspecto-dev/cli integrations install claude-code --scope project --host-ide vscode
```

```bash [Cursor]
npx @inspecto-dev/cli integrations install cursor --host-ide cursor
```

```bash [Trae]
npx @inspecto-dev/cli integrations install trae --host-ide trae-cn
```

```bash [Codex]
npx @inspecto-dev/cli integrations install codex --host-ide vscode
```

```bash [Gemini]
npx @inspecto-dev/cli integrations install gemini --host-ide vscode
```

```bash [Coco]
npx @inspecto-dev/cli integrations install coco --host-ide trae-cn
```

```bash [CodeBuddy]
npx @inspecto-dev/cli integrations install codebuddy --host-ide codebuddy-cn
```

:::

_(如果你使用其他包管理器，可以用 `pnpm dlx`、`yarn dlx` 或 `bunx` 代替 `npx`)。_

不知道选哪条？按这个规则选：

- 用 **VS Code + Copilot**：选 `Copilot`。
- 用 **Cursor**：选 `Cursor`。
- 用 **Trae CN**：选 `Trae`；如果你用的是 Coco，选 `Coco`。
- 用 **CodeBuddy**：选 `CodeBuddy`。
- 只想要源码跳转、不接 AI：看[手动安装](./manual-installation.md)。
- 只想让独立 MCP Agent 处理任务、不装 IDE 扩展：看 [MCP 集成](../integrations/mcp.md)。

命令执行后，Inspecto 会尝试在你的 IDE 中打开 onboarding 会话。**如果没有自动打开**，请开启一个 AI 助手聊天并发送：

> _"Set up Inspecto in this project"_

需要了解自动接入做了什么？请查看 [Onboarding 集成](../integrations/onboarding-skills.md)。

## 接入完成后

1. **重启开发服务器**（如 `npm run dev`），让 Inspecto 插件读取到新配置。
2. **在浏览器中打开你的应用** —— 你应该能看到 Inspecto 的 launcher 悬浮层。
3. **试试看**：
   - `Alt + 点击` 任意组件跳转到源码
   - 点击 launcher 选择「检查模式」或「标注模式」
   - 在「标注模式」里收集一个或多个 UI 批注，然后点击 `Create Task` 将它们作为结构化任务发出

如果你的项目使用 MCP 标注链路（`"annotate.channel": "mcp"`），标注侧栏还会展示最近任务的 timeline。你可以用它确认任务已经入队、被 Agent 领取、收到进度回复，并最终完成或关闭。

如果你想做自定义自动化，可以在 `.inspecto/prompts.json` 中增加 `kind: "workflow"` 条目。它们会显示为「标注模式」里的 workflow 按钮。按钮可以把 deploy、PR、release 或 review 指令交给 Agent；Agent 再利用自身已有的 skill、MCP server 和 tool 完成任务，同时由 Inspecto 追踪 session 进度。

如果组件没有高亮，或者 IDE 没有收到代码，请运行：

```bash
npx @inspecto-dev/cli doctor
```

> **需要查看支持的环境或 AI 工具？** 请参考[兼容性清单](./compatibility-checklist.md)和[支持的 AI 工具](../integrations/ai-tools.md)。

## 遇到问题？

常见问题的排查（快捷键冲突、IDE 插件无响应等），请参考[常见问题与排查指南 (FAQ)](./faq.md)。
