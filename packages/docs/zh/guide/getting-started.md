# 快速开始

Inspecto 适合这样一种场景：你已经在浏览器里看到了问题，现在想立刻定位源码，或者把正确上下文交给 AI。

## 快速接入

对大多数用户：

1. **进入你的项目根目录**。
2. **复制并运行匹配的安装命令**：

`--host-ide` 的可选值有：`vscode`, `cursor`, `trae`, `trae-cn`。

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

如果你不用 npm，可以把 `npx` 替换成 `pnpm dlx`、`yarn dlx` 或 `bunx`。

> **关于作用域**：请在你的项目根目录执行这些命令。Codex 和 `claude-code --scope user` 是特例，它们会安装在用户级目录。

3. **在你的 IDE 中查看结果**：
   - 如果 onboarding 流程自动打开，请在那里继续。
   - 如果它没有打开，请开启一个聊天会话并发送：`Set up Inspecto in this project`。

然后在浏览器中打开应用，使用 `Inspect mode`、`Annotate mode` 或 `Quick jump`。

如果你只记两条规则，就记这两条：

- 项目级安装命令一定要在目标项目根目录执行
- 当你不是在目标 IDE 的终端里执行命令时，显式传递 `--host-ide` 参数

如果你需要不同 assistant 的特定提示词、文件位置或安装目标，请参考 [Onboarding 集成](../integrations/onboarding-skills.md)。

## 终端回退入口

如果你不走 assistant 集成，请在 **项目根目录** 运行：

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

## 接入完成后

接入完成后：

1. 先确认 Inspecto IDE 插件已经安装并启用。
2. 启动或重启开发服务器（如 `npm run dev`）。
3. 在浏览器中打开你的应用。
4. 通过 launcher 选择模式：
   - `Inspect mode`：点击单个组件，立即查看或 Ask AI
   - `Annotate mode`：跨多个组件记录 note，最后统一 `Ask AI`
5. 也可以随时使用 **`Alt` + `点击`** 执行 `Quick jump`。

成功后的表现应该是：

- 页面里的组件可以高亮
- `Inspect mode` 能打开 Inspecto 菜单
- `Annotate mode` 能把 note 收进 sidebar
- `Quick jump` 可以打开源码位置

如果页面已经能高亮，但 IDE 里没有收到代码，请优先确认 Inspecto IDE 插件已经安装并启用。

::: tip 结构化 onboarding
如果你在开发自己的 skill、规则文件或 agent runtime，请优先使用单入口命令：

1. `inspecto onboard --json`
2. 如果 `status` 是 `needs_target_selection`，先说明这一步是在选择要接入 Inspecto 的本地开发构建目标，再使用返回结果中的某个 candidate id 带上 `--target <candidateId>` 重试。CLI 也兼容接受返回里的 `configPath` 作为兜底值。
3. 如果 `status` 是 `needs_confirmation`，确认计划内容后，用 `--yes` 重试
4. 将 `ideExtension` 视为必选步骤：可自动安装就自动安装，失败则在验证 dev server 前给出命令/链接引导
5. IDE 插件设置完成后，再根据 `verification` 载荷自动重启 dev server，或提示用户手动验证
6. 只有在 `status` 为 `error` 或仍有未解决诊断项时，才运行 `inspecto doctor --json`
   :::

如果设置完成后发现有异常，请在重新运行 onboarding 之前执行 `npx @inspecto-dev/cli doctor --json`。

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
| Webpack  | >= 4.0.0   | CLI 可识别，当前仍需手动补充插件注册。       |
| Rspack   | >= 0.1.0   | CLI 可识别，当前仍需手动补充插件注册。       |
| Rsbuild  | >= 0.1.0   | CLI 可识别，当前仍需手动补充插件注册。       |
| Rollup   | >= 2.0.0   | 支持构建时代码注入。客户端脚本需手动初始化。 |
| esbuild  | >= 0.14.0  | 支持构建时代码注入。客户端脚本需手动初始化。 |

## 支持的 AI 工具

Inspecto 连接浏览器和本地 AI 助手。在设置期间，CLI 会探测 CLI 工具与 IDE 扩展；内置型 IDE 目标仍可在运行时使用，也可以通过手动配置启用：

- **插件模式 (IDE 扩展)**: GitHub Copilot, Claude Code Extension, Gemini Plugin, CodeX.
- **CLI 模式 (终端)**: Claude CLI (`claude`), Coco CLI (`coco`), CodeX CLI, Gemini CLI.
- **内置模式 (原生 IDE)**: Trae, Cursor (无需额外安装扩展的原生 AI 集成).

## 遇到问题？

如果在初始化或使用过程中遇到没有高亮、发送失败等情况，请优先运行环境诊断工具：

```bash
npx @inspecto-dev/cli doctor
```

更多常见问题排查（如快捷键冲突、IDE 插件无响应等），请参考 [常见问题与排查指南 (FAQ)](./faq.md)。
