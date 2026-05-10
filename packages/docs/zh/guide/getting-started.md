# 快速开始

Inspecto 适合这样一种场景：你已经在浏览器里看到了问题，现在想立刻定位源码，或者把正确上下文交给当前配置的助手链路。

## 快速接入

要安装 Inspecto 并将其连接到你的 AI 助手，请进入项目根目录，根据你的环境运行**其中一条**命令：

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

命令执行后，Inspecto 会尝试在你的 IDE 中打开 onboarding 会话。**如果没有自动打开**，请开启一个 AI 助手聊天并发送：

> _"Set up Inspecto in this project"_

需要手动安装？请查看[安装指南](./manual-installation.md)或 [Onboarding 集成](../integrations/onboarding-skills.md)。

> **不使用 IDE 扩展？** 如果你希望使用 MCP 独立模式（如 Cursor、Claude Desktop），请参考 [MCP 集成](../integrations/mcp.md)。

## 接入完成后

1. **重启开发服务器**（如 `npm run dev`），让 Inspecto 插件读取到新配置。
2. **在浏览器中打开你的应用** —— 你应该能看到 Inspecto 的 launcher 悬浮层。
3. **试试看**：
   - `Alt + 点击` 任意组件跳转到源码
   - 点击 launcher 选择「检查模式」或「标注模式」

如果组件没有高亮，或者 IDE 没有收到代码，请运行：

```bash
npx @inspecto-dev/cli doctor
```

> **需要查看支持的环境或 AI 工具？** 请参考[兼容性清单](./compatibility-checklist.md)和[支持的 AI 工具](../integrations/ai-tools.md)。

## 遇到问题？

常见问题的排查（快捷键冲突、IDE 插件无响应等），请参考[常见问题与排查指南 (FAQ)](./faq.md)。
