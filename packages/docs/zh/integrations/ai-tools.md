# 支持的 AI 工具

Inspecto 负责在你进行前端开发的浏览器和你最喜欢的 AI 助手之间架起一座桥梁。根据你使用的 AI 工具架构的不同，Inspecto 支持多种底层通信模式。

## Onboarding

在支持 agent/skill 的环境里，推荐让助手直接执行结构化 onboarding 流程：

1. `inspecto detect --json`
2. `inspecto plan --json`
3. `inspecto apply`
4. `inspecto doctor --json`

如果你想直接使用面向特定助手的入口，而不是自己拼接 CLI 流程，请查看 [Onboarding 集成](./onboarding-skills.md)。

## 交互模式分类

### 1. 扩展模式 (Extension Mode)

这类 AI 工具通常作为 IDE（如 VS Code）的插件存在。Inspecto 会利用 IDE 提供的高级 URI Scheme 直接将上下文路由并粘贴到 AI 的聊天侧边栏中。

**支持列表：**

- GitHub Copilot (`copilot.extension`)
- Claude Code 扩展 (`claude-code.extension`)
- Gemini Code Assist (`gemini.extension`)
- CodeX (`codex.extension`)

### 2. 内置模式 (Built-in Mode)

这类 AI 工具通常是基于 VS Code Fork 而来的独立原生 IDE，AI 能力被深度植入在了编辑器底层，不需要安装任何额外插件。Inspecto 能够直接定位并唤起其原生的 AI 聊天面板。

**支持列表：**

- Cursor (`cursor.builtin`)
- Trae (`trae.builtin`)

### 3. CLI 终端模式 (CLI Mode)

这类 AI 工具完全运行在命令行终端中。Inspecto 会在你的 IDE 中自动打开一个新的集成终端窗口，启动（或重用已有的）CLI 进程，并将提示词粘贴进去。

**支持列表：**

- Claude Code 终端版 (`claude-code.cli`)
- Trae CLI / Coco (`coco.cli`)
- Gemini CLI (`gemini.cli`)
- CodeX CLI (`codex.cli`)

## 切换你的 AI 驱动

结构化 onboarding 流程和 `npx @inspecto-dev/cli init` 都会自动扫描你本地环境变量和路径中已安装的 AI 工具，并为你推荐最佳选项。

如果你想在以后切换默认的 AI 工具，只需简单地修改你项目中的 `.inspecto/settings.local.json`：

```json
{
  "provider.default": "claude-code.cli"
}
```

## 为 CLI 工具添加自定义启动参数

如果你正在使用 CLI 终端模式，并且希望在启动 AI 助手时带上一些特定的命令行参数（例如关闭权限确认等），你可以在设置文件中进行如下配置：

```json
{
  "provider.claude-code.cli.args": ["--dangerously-skip-permissions"]
}
```
