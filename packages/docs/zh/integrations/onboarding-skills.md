# Onboarding 集成

Inspecto 为常见的 AI 编码助手提供了 onboarding 集成，以自动化完成你在项目中的设置。在你的项目根目录安装对应的集成，CLI 将尝试自动在你的宿主 IDE 中拉起 onboarding 流程。

## 快速开始

最快的使用路径：

1. **进入你的项目根目录**（大多数集成是基于项目的）。
2. **复制并运行匹配的安装命令**：

`--host-ide` 的可选值有：`vscode`, `cursor`, `trae`, `trae-cn`。

::: code-group

```bash [Codex]
npx @inspecto-dev/cli integrations install codex --host-ide vscode
```

```bash [Claude Code]
npx @inspecto-dev/cli integrations install claude-code --scope project --host-ide vscode
```

```bash [Copilot]
npx @inspecto-dev/cli integrations install copilot --host-ide vscode
```

```bash [Cursor]
npx @inspecto-dev/cli integrations install cursor --host-ide cursor
```

```bash [Gemini]
npx @inspecto-dev/cli integrations install gemini --host-ide vscode
```

```bash [Trae]
npx @inspecto-dev/cli integrations install trae --host-ide trae-cn
```

```bash [Coco]
npx @inspecto-dev/cli integrations install coco --host-ide trae-cn
```

:::

3. **跟随 CLI 拉起的 onboarding 流程**。

当你已经确定宿主 IDE 时，请始终优先显式传递 `--host-ide`。它能避免在纯终端会话中模糊的 IDE 探测。

如果 onboarding 流程没有自动打开，请手动向 assistant 说：

```text
Set up Inspecto in this project
```

## 安装作用域

根据不同的助手，集成的安装位置可能是你的用户全局目录，或者是当前的项目本地目录。

- **项目级**（在目标项目根目录执行）：`Copilot`、`Cursor`、`Gemini`、`Trae`、`Coco`，以及 `Claude Code --scope project`。
- **用户级**（可在任意目录执行）：`Codex --scope user`，`Claude Code --scope user`。

> **重要提示：** 如果你在错误的目录中运行了项目级的安装命令，当你向助手寻求帮助时，它是找不到该集成的！

## 支持的集成列表

这里列出了所有支持的助手及其安装目标。

| 助手        | 类型         | 安装目标                                 | 说明                             |
| :---------- | :----------- | :--------------------------------------- | :------------------------------- |
| Codex       | Native skill | `.agents/skills/` 或 `~/.agents/skills/` | 用户级或项目级。                 |
| Claude Code | Native skill | `.claude/skills/` 或 `~/.claude/skills/` | 用户级或项目级。                 |
| Copilot     | Native skill | `.github/skills/inspecto-onboarding/`    | 项目级。请在目标项目根目录执行。 |
| Cursor      | Native skill | `.cursor/skills/inspecto-onboarding/`    | 项目级。请在目标项目根目录执行。 |
| Gemini      | Native skill | `.gemini/skills/inspecto-onboarding/`    | 项目级。请在目标项目根目录执行。 |
| Trae        | Native skill | `.trae/skills/inspecto-onboarding/`      | 项目级。请在目标项目根目录执行。 |
| Coco        | Native skill | `.trae/skills/inspecto-onboarding/`      | 项目级。请在目标项目根目录执行。 |

默认情况下，所有的 onboarding 集成都会将配置写入纯本地的文件（`.inspecto/settings.local.json` 和 `.inspecto/prompts.local.json`），保持你的代码仓库干净整洁。

常见安装命令示例：

::: code-group

```bash [Codex]
npx @inspecto-dev/cli integrations install codex --host-ide vscode
```

```bash [Claude Code]
# 项目级
npx @inspecto-dev/cli integrations install claude-code --scope project --host-ide vscode

# 用户级
npx @inspecto-dev/cli integrations install claude-code --scope user --host-ide vscode
```

```bash [Copilot]
npx @inspecto-dev/cli integrations install copilot --host-ide vscode
```

```bash [Cursor]
npx @inspecto-dev/cli integrations install cursor --host-ide cursor
```

```bash [Gemini]
npx @inspecto-dev/cli integrations install gemini --host-ide vscode
```

```bash [Trae]
npx @inspecto-dev/cli integrations install trae --host-ide trae-cn
```

```bash [Coco]
npx @inspecto-dev/cli integrations install coco --host-ide trae-cn
```

:::

仅当你想在运行安装之前检查阻止项，或者需要排查问题时，才使用 `inspecto integrations doctor <assistant> --host-ide <ide> --compact`。

## 它的底层工作原理

这些集成的工作原理，是将 Inspecto 的结构化 CLI onboarding 协议（contract）暴露给你的助手。当你请求它设置 Inspecto 时，它将执行：

1. `onboard --json`：分析项目并返回结构化的计划。
2. `onboard --json --target <candidateId>`：如果需要选择目标，先说明这一步是在选择要接入 Inspecto 的本地开发构建目标，再使用上一次返回中的某个 candidate id 重新运行。CLI 也兼容接受返回里的 `configPath` 作为兜底值。
3. `onboard --json --yes`：在获得你的确认后，应用代码变更。
4. 引导你安装 IDE 插件（这是一个必选步骤）。
5. 确认启动 dev server 的命令。

这可以保证实际的文件修改，始终由 Inspecto CLI 的解析器安全地完成，而不是依赖助手来手动修改你的配置文件。

> 关于 JSON 字段语义和自动化规则，请参阅 [Onboarding Contract](./onboarding-contract.md)。
>
> 关于 `inspecto integrations doctor --json` 的字段语义和退出状态码，请参阅 `packages/cli/README.md`。
