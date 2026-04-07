# 支持的 AI 工具

Inspecto 负责连接你的浏览器和 AI 助手。根据你的 AI 工具架构的不同，它支持多种交互模式。

当你使用结构化的 onboarding 流程或 `inspecto init` 时，CLI 目前会自动探测两个安装面：CLI 工具和 IDE 插件。内置型 IDE 目标（Built-in IDE targets）在运行时仍受支持，但目前暂不会被 CLI 的 onboarding 探测功能自动识别。

## 接入向导 (Onboarding)

对于大多数用户，默认路径是**由助手引导的接入流程 (assistant-first onboarding)**：

1. 在目标项目根目录运行 `inspecto integrations install <assistant> --host-ide <ide>`。
2. 跟随 CLI 拉起的 onboarding 流程，并敲击回车键发送自动填充的提示词。
3. 如果 onboarding 流程没有自动打开，请开启一个新的 assistant 会话并要求其在这个项目中设置 Inspecto。
4. 仅当你想在运行安装之前检查阻止项，或者需要排查问题时，才使用 `inspecto integrations doctor <assistant> --host-ide <ide> --compact`。

然后在浏览器中打开应用，使用 launcher 体验 `Inspect mode`（检查模式）或 `Annotate mode`（标注模式），也可以随时使用 `Alt` + `点击` 来触发 `Quick jump`（快速跳转）。

如果你是在终端里手动设置 Inspecto，请使用 `inspecto init` 作为引导回退方案。

如果你在开发自己的 agent/runtime 集成，请直接使用结构化的 onboarding 流程：

1. 运行 `inspecto onboard --json`
2. 如果 `status` 是 `needs_target_selection`，带上 `--target <packagePath>` 重新运行
3. 如果 `status` 是 `needs_confirmation`，确认计划的变更后带上 `--yes` 重新运行
4. 首先完成必选的 `ideExtension` 步骤（如果可能就自动安装，否则展示安装链接/命令）
5. 然后遵循 `verification` 指导来重启 dev-server，或提示用户手动验证
6. 如果 `status` 是 `error`，运行 `inspecto doctor --json`

关于字段级的响应语义和状态处理，请参阅 [Onboarding 集成](./onboarding-skills.md) 以及 onboarding 命令文档。

## 交互模式

### 1. 插件模式 (Extension Mode)

AI 工具作为 IDE 插件安装（例如在 VS Code 中）。Inspecto 将使用 IDE 自定义的 URI scheme 将提示词分发到 AI 聊天面板。

**支持的工具：**

- GitHub Copilot (`copilot.extension`)
- Claude Code (`claude-code.extension`)
- Gemini Code Assist (`gemini.extension`)
- CodeX (`codex.extension`)

### 2. 内置模式 (Built-in Mode)

AI 工具原生集成在修改版的 IDE 中。不需要安装任何插件。Inspecto 将打开本地文件并触发原生的 AI 聊天面板。

**支持的工具：**

- Cursor (`cursor.builtin`)
- Trae (`trae.builtin`)

### 3. CLI 模式 (CLI Mode)

AI 工具完全在终端内运行。Inspecto 将在你的 IDE 中打开一个新的终端面板，启动 CLI 工具（如果尚未运行），并粘贴提示词。

**支持的工具：**

- Claude Code CLI (`claude-code.cli`)
- Trae CLI / Coco (`coco.cli`)
- Gemini CLI (`gemini.cli`)
- CodeX CLI (`codex.cli`)

## 切换 Provider

结构化的 onboarding 流程和 `init` 命令将探测可用的 CLI 工具和兼容 VS Code 的插件，然后提示你选择默认目标。工作区推荐的插件也可能出现在该探测结果中，因此最好将结果视为“可用的集成候选项”，而不是本地已安装 AI 工具的严格列表。

如果之后想要更改，只需更新你的 `.inspecto/settings.local.json`：

```json
{
  "provider.default": "claude-code.cli"
}
```

## 添加自定义 CLI 参数

如果你正在使用 CLI 模式，并希望在启动时向你的 AI 工具传递特定参数（例如，向 Claude 传递特定 flag），你可以通过 settings 文件进行配置：

```json
{
  "provider.claude-code.cli.args": ["--dangerously-skip-permissions"]
}
```
