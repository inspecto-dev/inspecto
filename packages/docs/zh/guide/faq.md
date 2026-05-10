# 常见问题与排查指南 (FAQ)

如果你在使用 Inspecto 时遇到问题（如没有高亮、发送失败等情况），请优先使用环境诊断工具进行排查。

## 运行一键诊断 (Doctor)

在你的项目根目录下运行以下命令：

```bash
npx @inspecto-dev/cli doctor
```

CLI 会自动检查：

1. 项目依赖和环境是否被支持。
2. Inspecto 核心插件是否安装正确。
3. IDE 和 AI 助手的配置是否有冲突。

如果你正在使用 onboarding 集成，你还可以针对特定的助手和 IDE 运行 doctor：

```bash
npx @inspecto-dev/cli integrations doctor <assistant> --host-ide <ide>
```

- **💡 小提示**：如果需要反馈问题，欢迎一并附上 `doctor` 的完整输出（截图或文本），这样我们能更快定位问题。

---

如果 `doctor` 没发现异常，但 Inspecto 还是不能正常使用，可参考以下常见情况。

## 常见问题排查

### 1. `Alt` + `点击` 的快速跳转或 Inspecto 高亮没有生效？

- **没重新启动 Dev Server**：执行完 onboarding、`init` 或修改构建配置后，要重启开发服务器（比如重新运行 `npm run dev`）。
- **用了不支持的框架版本**：请参考文档，确保项目的构建框架和 UI 框架符合要求。
- **快捷键冲突**：你的系统或者浏览器可能占用了 `Alt` 键。你可以在 Inspecto 配置文件里修改触发键。

### 2. 页面有高亮，但「检查模式」、「标注模式」或源码跳转没有反应？

- **如果只是源码跳转**：不需要安装 Inspecto IDE 插件。请确认本地 dev server 正在运行、编辑器已安装，并且 `.inspecto/settings.local.json` 中的 `ide` 指向你想打开的编辑器。
- **如果是 IDE 助手交接**：需要安装并启用 Inspecto IDE 插件。
- **目标 AI 工具配置错误**：Inspecto 需要知道你要把代码发给哪个 AI 工具。请检查 `.inspecto/settings.local.json` 配置文件中的 `provider.default` 字段，保证它指向你正在使用的 AI 助手（例如 `"copilot.extension"` 或 `"claude-code.cli"`）。这个配置只影响 AI 交接，不影响单纯的源码跳转。
- **跨设备 / 跨环境问题**：目前 Inspecto 依靠本地网络进行浏览器和 IDE 的通信。如果你在远程服务器（如 Remote SSH 或 DevContainer）上运行前端页面，却在本地电脑的浏览器中访问，可能会导致连接失败。

### 3. assistant onboarding 或 `npx @inspecto-dev/cli init` 失败了？

- **需要手动配置**：虽然 CLI 很智能，但有些高度自定义的项目脚手架（比如复杂的 Monorepo 或自定义的 Vite / Webpack 配置）可能会导致代码注入失败。这时请参考官方文档，按照**“手动接入”**的步骤，自己在 `vite.config.ts` 或 `webpack.config.js` 等构建配置文件中引入插件即可。

### 4. 日志里出现 `Failed to launch URI...` 或 “No application knows how to open URL ...”？

- **这通常不是某个 assistant 本身的问题，而是宿主 IDE 配置或 URI scheme 不匹配**：Inspecto 在发送上下文、打开聊天或跳转文件时，会依赖宿主 IDE 的 URI scheme。如果你的机器实际安装的是某个 IDE 变体，但当前配置或安装选择落成了另一个变体，系统就可能拒绝打开对应的 URI。
- **典型例子是 `Trae` 和 `Trae CN` 混用**：如果机器上安装的是 `Trae CN`，但运行时解析成了 `trae`，Inspecto 就会尝试打开 `trae://...`，然后被操作系统拒绝。类似问题也可能发生在 VS Code 和 Cursor 等其他 IDE 变体上。
- **先用 doctor 看当前解析结果**：在项目根目录运行 `npx @inspecto-dev/cli integrations doctor <assistant> --host-ide <ide> --json`，确认 `hostIde` 是否符合你的实际 IDE。
- **显式锁定宿主 IDE**：如果你确认自己使用的是某个特定 IDE，请在 `.inspecto/settings.local.json` 或 `.inspecto/settings.json` 中显式设置 `ide`。例如你使用 `Trae CN` 时，可以写成：

```json
{
  "ide": "trae-cn",
  "provider.default": "coco.cli"
}
```

- **改完后重启 IDE 和 Dev Server**：这样可以确保运行时重新读取配置，并生成符合预期的 URI scheme。
- **如果仍然失败**：请手动执行对应 IDE 的 URI scheme 测试命令（macOS 例如 `open "<scheme>://"`），确认系统是否已经正确注册该 IDE。

### 5. 为什么我的自定义 workflow 按钮没有出现？

- **检查文件位置**：workflow 按钮来自 `.inspecto/prompts.json` 或 `.inspecto/prompts.local.json`。
- **检查配置结构**：workflow 条目必须包含 `"kind": "workflow"`、唯一的 `id`，以及非空 `prompt`。
- **检查是否被隐藏**：`enabled: false` 会隐藏该 workflow。
- **重启或等待配置刷新**：dev server 会监听 `.inspecto/` 目录，但大幅修改配置后，重启 dev server 仍是最稳妥的方式。
- **确认在标注模式中查看**：workflow 按钮显示在 Annotate sidebar 中，不显示在单元素 Inspect 菜单里。

### 6. 普通标注任务和 workflow session 有什么区别？

- **普通标注任务**：从已选中的 DOM 元素和批注意见出发，适合 UI 修复、设计走查意见和组件级修改。
- **Workflow session**：从 `prompts.json` 里配置好的项目指令出发，即使没有选择 DOM 批注也可以运行，适合 deploy、PR、release、测试或文档生成等自动化。

对于通过 MCP 发送的 workflow session，Inspecto 会追加项目根目录、当前分支、git status 等项目元信息，方便 Agent 更安全地调用自己的 skill、MCP server 和 tool。

### 7. 我创建了 MCP 任务，但 Agent 没有领取，应该检查什么？

- 确认 `.inspecto/settings.local.json` 中已经设置 `"annotate.channel": "mcp"`。
- 确认你的 AI 客户端已经配置 Inspecto MCP server，并指向正确的本地 dev server。
- 明确告诉 Agent 领取任务，例如：`Please process my Inspecto tasks`。
- 如果 Agent 之前处于持续监听模式，它的 tool call 可能在你点击 `Create Task` 前已经超时；让它重新 claim 一次即可。
- 如果你想看到实时 timeline 更新，请保持浏览器页面打开。

### 8. Workflow 按钮会不会误触发部署或修改生产环境？

Inspecto 只负责把你配置的指令入队。真正执行什么，取决于 Agent 以及它可用的 tool、skill 和 MCP server。对于敏感动作，请在 workflow 条目里设置 `"confirm": true`，并在 prompt 中写清楚限制，例如“只部署预览环境”或“生产部署前必须再次确认”。

### 9. 生产环境（线上）会受到影响吗？

- **完全不会**。Inspecto 的插件和代码注入逻辑**只在开发环境中起作用**。在打包生产环境产物时，它会自动跳过，不会产生任何运行时开销，也绝对不会影响线上的性能和安全。
