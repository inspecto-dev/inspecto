# IDE 扩展

为了实现“浏览器中点击 -> 在 IDE 中唤起 AI”这种极具魔法感的工作流，Inspecto 需要在你的代码编辑器中安装一个非常轻量级的配套扩展（Companion Extension）。这个扩展的唯一作用是注册特殊的 URI 协议（如 `vscode://`），用来接收浏览器发送过来的代码载荷。

## 支持的 IDE

- **VS Code**: 完全支持。 (`ide: "vscode"`)
- **Cursor**: 完全支持。 (`ide: "cursor"`)
- **Trae**: 完全支持。 (`ide: "trae"`)

_注意：目前暂不支持在 JetBrains 系列等其他编辑器中实现直接的 AI 载荷注入。_

## 安装方法

当你在终端运行 `npx @inspecto-dev/cli init` 时，CLI 会尝试为你自动安装适用于当前 IDE 的扩展。

如果你需要手动安装：

### VS Code & Cursor

1. 在侧边栏打开扩展视图 (`Ctrl+Shift+X` 或 `Cmd+Shift+X`)。
2. 搜索 **"Inspecto"**。
3. 点击安装 (Install)。

> **插件市场链接:**
>
> - [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto)
> - [Open VSX Registry](https://open-vsx.org/extension/inspecto/inspecto) (适用于 Cursor、VSCodium 等衍生版本)

或者，你可以通过命令行一键安装：

```bash
code --install-extension inspecto.inspecto
```

### Trae

对于 Trae 用户，可以直接在 Trae 的内置插件市场中搜索 "Inspecto" 并点击安装。

## 它的底层工作原理是什么？

这个 IDE 扩展极其轻量级，没有多余的 UI 和后台常驻进程。它的职责仅有：

1. 注册协议处理器 (例如 `vscode://inspecto.inspecto/ai-dispatch`)。
2. 接收包含目标文件路径、代码片段以及用户选择的 AI 工具的参数载荷。
3. 根据不同的目标 AI 工具，自动执行 VS Code 内部命令（打开文件，聚焦行号，并触发对应 AI 插件的聊天面板或启动终端进程）。

**如果没有安装此扩展**：当你在浏览器中按住热键点击元素时，系统将触发降级策略 (Fallback) —— 仅将提取到的源码和 prompt 复制到你的剪贴板中。
