# IDE 插件 (IDE Extensions)

为了实现从“在浏览器中点击 -> 在 IDE 中打开 AI”的魔法工作流，Inspecto 需要在你的代码编辑器中安装一个小巧的配套插件。这个插件负责注册 `vscode://` 或自定义的 IDE URI scheme，浏览器正是通过这些 scheme 发送上下文数据的。

## 支持的 IDE

- **VS Code**: 完全支持。(`ide: "vscode"`)
- **Cursor**: 完全支持。(`ide: "cursor"`)
- **Trae**: 完全支持。(`ide: "trae"`)
- **Trae CN**: 完全支持。(`ide: "trae-cn"`)

_注意：目前暂不支持将 AI payload 直接注入到 JetBrains IDE 以及其他编辑器中。_

## 安装

当你使用助手引导的 onboarding (assistant-first onboarding) 或运行 `inspecto init` 时，只要平台支持，Inspecto 就会尝试在探测到的 IDE 中为你自动安装插件。

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

### Trae & Trae CN

对于 Trae 和 Trae CN，你可以在内置的插件市场搜索 "Inspecto" 并直接安装。你也可以通过命令行安装：

```bash
# 适用于 Trae
trae --install-extension inspecto.inspecto

# 适用于 Trae CN
trae-cn --install-extension inspecto.inspecto
```

## 它的底层工作原理

该 IDE 插件非常轻量。它唯一的职责是：

1. 注册一个协议处理器（例如 `vscode://inspecto.inspecto/send` 或 `cursor://inspecto.inspecto/send`）。
2. 接收包含文件路径、代码片段和目标 AI 工具的 payload。
3. 自动执行正确的内部 IDE 命令来打开文件，并触发对应的 AI 扩展（或在终端中启动 CLI）。

如果没有这个插件，Inspecto 将无法完成正常的 IDE 握手过程。根据选择的 Provider 以及回退机制，它可能会降级为剪贴板复制，而不是直接拉起目标 IDE。
