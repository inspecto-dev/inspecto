# Inspecto

[English](./README.md) | 简体中文

[![@inspecto-dev/plugin](https://img.shields.io/npm/v/@inspecto-dev/plugin?label=@inspecto-dev/plugin)](https://www.npmjs.com/package/@inspecto-dev/plugin)
[![@inspecto-dev/core](https://img.shields.io/npm/v/@inspecto-dev/core?label=@inspecto-dev/core)](https://www.npmjs.com/package/@inspecto-dev/core)
[![@inspecto-dev/cli](https://img.shields.io/npm/v/@inspecto-dev/cli?label=@inspecto-dev/cli)](https://www.npmjs.com/package/@inspecto-dev/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 告别浏览器、DevTools、编辑器与 AI Assistant 之间的繁琐切换。
> Inspecto 缩短了整个链路：直接从网页开始，顺滑无缝地把准确的上下文交给源码或当前配置的助手链路。

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
        跨组件记录，整理后统一提交
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

要安装 Inspecto 并将其连接到你的 AI 助手，请进入项目根目录，根据你的环境运行**其中一条**命令：

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

命令执行后，Inspecto 会尝试在你的 IDE 中打开 onboarding 会话。**如果没有自动打开**，请开启一个 AI 助手聊天并发送：

> _"Set up Inspecto in this project"_

需要手动安装？请查看[安装指南](https://inspecto-dev.github.io/inspecto/zh/guide/manual-installation)。

## 开始使用

1. 在浏览器中打开你的应用。
2. 通过 launcher 使用 `Inspect mode` 或 `Annotate mode`。
3. 随时使用 **`Alt` + `点击`** 执行 `Quick jump`。

成功后你应该能看到：

- 页面里的组件可以高亮
- `Inspect mode` 能打开 Inspecto 菜单
- `Quick jump` 可以打开源码位置

如果高亮正常，但编辑器中没有收到任何信息，请检查您的 IDE 配置或使用“复制上下文”操作。如果您正在使用 MCP 或独立模式 (`ide: "none"`)，则不需要安装 IDE 插件，详情请查看 [MCP 集成](https://inspecto-dev.github.io/inspecto/zh/integrations/mcp)。

---

> 需要平台专用命令或结构化 onboarding 细节说明，请查看 **[官方中文文档](https://inspecto-dev.github.io/inspecto/zh/)**。

## 社区

- [GitHub Discussions](https://github.com/inspecto-dev/inspecto/discussions)

## 贡献指南

我们非常欢迎社区贡献！请查阅我们的 [Contributing Guide](CONTRIBUTING.md) 了解如何开始，并确保阅读我们的 [Code of Conduct](CODE_OF_CONDUCT.md)。

## 许可证

[MIT](LICENSE)
