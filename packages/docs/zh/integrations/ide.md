# IDE 插件 (IDE Extensions)

为了实现从“在浏览器中点击 -> 在 IDE 中打开 AI”的魔法工作流，Inspecto 需要在你的代码编辑器中安装一个小巧的配套插件。这个插件负责注册 `vscode://` 或自定义的 IDE URI scheme，浏览器正是通过这些 scheme 发送上下文数据的。

## 支持的 IDE

- **VS Code**: 完全支持。(`ide: "vscode"`)
- **Cursor**: 完全支持。(`ide: "cursor"`)
- **Trae**: 完全支持。(`ide: "trae"`)
- **Trae CN**: 完全支持。(`ide: "trae-cn"`)
- **CodeBuddy**: 完全支持。(`ide: "codebuddy"`)
- **CodeBuddy CN**: 完全支持。(`ide: "codebuddy-cn"`)
- **None (独立运行 / MCP)**: 完全支持。(`ide: "none"`)

_注意：目前暂不支持将 AI payload 直接注入到 JetBrains IDE 以及其他编辑器中，但你依然可以使用 `none` 选项通过剪贴板和 MCP 来使用 Inspecto。_

## 安装

当你使用助手引导的 onboarding (assistant-first onboarding) 或运行 `npx @inspecto-dev/cli init` 时，只要平台支持，Inspecto 就会尝试在探测到的 IDE 中为你自动安装插件。

如果需要手动安装：

### VS Code & Cursor

1. 打开插件视图 (`Ctrl+Shift+X` 或 `Cmd+Shift+X`)。
2. 搜索 **"Inspecto"**。
3. 点击安装 (Install)。

> **插件市场链接：**
>
> - [VS Code 插件市场](https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto)
> - [Open VSX Registry](https://open-vsx.org/extension/inspecto/inspecto)（适用于 Cursor、VSCodium 及其它衍生编辑器）

你也可以通过命令行安装：

```bash
# 适用于 VS Code
code --install-extension inspecto.inspecto

# 适用于 Cursor
cursor --install-extension inspecto.inspecto
```

### Trae、Trae CN、CodeBuddy 与 CodeBuddy CN

对于这些 IDE，最稳妥的手动安装方式是在内置插件市场里搜索 "Inspecto" 并直接安装。

如果当前 shell 里已经有对应 launcher，也可以通过命令行安装：

```bash
# 适用于 Trae
trae --install-extension inspecto.inspecto

# 适用于 Trae CN
trae-cn --install-extension inspecto.inspecto

# 适用于 CodeBuddy
codebuddy --install-extension inspecto.inspecto

# 适用于 CodeBuddy CN（仅当 launcher 可用时）
codebuddy-cn --install-extension inspecto.inspecto
```

在 macOS 上，部分 CodeBuddy 安装包只会暴露 `.../Contents/Resources/app/bin/code`，而不会把 `codebuddy` 或 `codebuddy-cn` 放进 `PATH`。如果命令不可用，请优先使用内置插件市场，或直接使用 app bundle 里的二进制。

## 它的底层工作原理

该 IDE 插件非常轻量。它唯一的职责是：

1. 注册一个协议处理器（例如 `vscode://inspecto.inspecto/send`、`cursor://inspecto.inspecto/send` 或 `codebuddycn://inspecto.inspecto/send`）。
2. 接收包含文件路径、代码片段和目标 AI 工具的 payload。
3. 自动执行正确的内部 IDE 命令来打开文件，并触发对应的 AI 扩展（或在终端中启动 CLI）。

如果没有这个插件，Inspecto 将无法通过 URI schemes 完成正常的 IDE 握手过程。

### 独立运行 / MCP / 纯浏览器模式 (`ide: "none"`)

如果你正在使用 MCP，或者使用了暂未支持的 IDE，抑或你单纯不想安装 IDE 插件，你可以将 `.inspecto/settings.local.json` 中的 `ide` 设为 `"none"`。

在此模式下：

- **复制上下文**: Inspecto UI 会展示一个显眼的“复制上下文” (Copy Context) 按钮。它可以将选中的元素信息及其对应源码的路径，以 Markdown 格式直接写入你的系统剪贴板。
- **MCP 集成**: Inspecto 可以直接将上下文交付给正在运行的 MCP 服务器。
- 浏览器不会尝试唤起 `vscode://` 等 URI schemes，从而避免弹出“找不到应用程序”的系统弹窗。
