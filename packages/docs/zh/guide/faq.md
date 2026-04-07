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

### 1. `Alt` + `点击` 的 `Quick jump` 或 Inspecto 高亮没有生效？

- **没重新启动 Dev Server**：执行完 onboarding、`init` 或修改构建配置后，要重启开发服务器（比如重新运行 `npm run dev`）。
- **用了不支持的框架版本**：请参考文档，确保项目的构建框架和 UI 框架符合要求。
- **快捷键冲突**：你的系统或者浏览器可能占用了 `Alt` 键。你可以在 Inspecto 配置文件里修改触发键。

### 2. 页面有高亮，但 `Inspect mode`、`Annotate mode` 或源码跳转没有反应？

- **未安装或未启用 IDE 插件**：请确认你的编辑器中已经安装了 Inspecto 插件，并且该插件处于**启用状态**。
- **目标 AI 工具配置错误**：Inspecto 需要知道你要把代码发给哪个 AI 工具。请检查 `.inspecto/settings.local.json` 配置文件中的 `provider.default` 字段，保证它指向你正在使用的 AI 助手（例如 `"copilot.extension"` 或 `"claude-code.cli"`）。
- **跨设备 / 跨环境问题**：目前 Inspecto 依靠本地网络进行浏览器和 IDE 的通信。如果你在远程服务器（如 Remote SSH 或 DevContainer）上运行前端页面，却在本地电脑的浏览器中访问，可能会导致连接失败。

### 3. assistant onboarding 或 `inspecto init` 失败了？

- **需要手动配置**：虽然 CLI 很智能，但有些高度自定义的项目脚手架（比如复杂的 Monorepo 或自定义的 Vite / Webpack 配置）可能会导致代码注入失败。这时请参考官方文档，按照**“手动接入”**的步骤，自己在 `vite.config.ts` 或 `webpack.config.js` 等构建配置文件中引入插件即可。

### 4. 生产环境（线上）会受到影响吗？

- **完全不会**。Inspecto 的插件和代码注入逻辑**只在开发环境中起作用**。在打包生产环境产物时，它会自动跳过，不会产生任何运行时开销，也绝对不会影响线上的性能和安全。
