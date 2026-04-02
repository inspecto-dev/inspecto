# Inspecto IDE Providers 测试文档

本文档用于指导如何在 IDE（如 VS Code）中测试 `packages/ide` 对不同 AI Providers（如 Copilot、Claude Code、Gemini 等）的支持和集成情况。由于 Inspecto 支持将代码上下文以扩展（Extension）或命令行（CLI）的方式发送给指定的 AI 工具，需要针对不同的 Provider 及其模式进行回归验证。

## 1. 测试前置准备

1. **安装并构建项目**：
   在仓库根目录下执行构建，确保最新的代码和 IDE 插件编译完成。

   ```bash
   pnpm install
   pnpm build
   ```

2. **启动 VS Code 扩展（开发模式）**：
   - 使用 VS Code 打开本项目
   - 按 `F5` 启动“Extension Development Host”
   - 在新打开的 VS Code 窗口（Host 窗口）中，打开并启动一个 `playground`（如 `playground/vue-vite`）

   ```bash
   cd playground/vue-vite
   pnpm install
   pnpm dev
   ```

3. **打开浏览器并定位 Inspecto 工具**：
   - 访问 `http://localhost:5173`（或者终端中提示的其他本地端口）。
   - 按住 `Alt`（或配置的 `hotKey`）并点击页面上的 DOM 元素，即可唤起 Inspecto 面板。
   - 配置测试需要在 `playground/vue-vite` 根目录创建或修改 `.inspecto/settings.json` 文件。

---

## 2. 全局参数测试 (Global Settings)

在正式测试特定 Provider 前，我们应确认全局配置能够正确读取。

### 2.1 自动发送 (`autoSend`)

修改 `.inspecto/settings.json`：

```json
{
  "autoSend": true
}
```

**验证标准**：

- 当点击浏览器页面中的 “Ask AI” 意图时，VS Code 唤起指定的 AI Chat 面板后，输入框内容**应自动提交/发送**给大模型。
- 将 `"autoSend": false` 后重试，内容仅填入输入框，**不应该**自动发送。

---

## 3. Providers 测试用例

目前系统支持的 Providers 包含：`copilot`, `claude-code`, `gemini`, `codex`, `coco`。
各自支持的模式（Mode）包括：

- `extension`：作为 IDE 侧边栏插件启动
- `cli`：作为终端命令行工具启动

### 3.1 GitHub Copilot (`copilot`)

**支持模式**：`extension`

**配置 (`.inspecto/settings.json`)**：

```json
{
  "provider.default": "copilot.extension"
}
```

**测试步骤**：

1. 确保 VS Code Host 中已安装并启用了 **GitHub Copilot Chat** 插件。
2. 在浏览器中选中某个组件，点击面板上的 “Ask AI”。
3. **验证标准**：
   - VS Code 应自动聚焦并打开 Copilot Chat 面板。
   - 输入框中自动填入了包含代码片段、文件路径及行号的 Prompt。
   - 如果开启了 `"autoSend": true`，Prompt 会立即发送并开始对话。

---

### 3.2 Claude Code (`claude-code`)

**支持模式**：`extension`, `cli`

**场景 A：Extension 模式**
**配置**：

```json
{
  "provider.default": "claude-code.extension"
}
```

**测试步骤**：

1. 确保 VS Code 中安装了 Claude Code 官方插件。
2. 浏览器触发 “Ask AI”。
3. **验证标准**：VS Code 的 Claude 面板被激活，Prompt 成功填入。

**场景 B：CLI 模式**
**配置**：

```json
{
  "provider.default": "claude-code.cli",
  "provider.claude-code.cli.bin": "claude"
}
```

**测试步骤**：

1. 确保环境可通过终端执行 `claude` 命令。
2. 浏览器触发 “Ask AI”。
3. **验证标准**：
   - VS Code 应自动打开/创建一个新的集成终端（Terminal），并启动 `claude` 命令。
   - Prompt 上下文已自动粘贴或作为参数传送到了 CLI。

---

### 3.3 Gemini (`gemini`)

**支持模式**：`extension`, `cli`

**场景 A：Extension 模式**
**配置**：

```json
{
  "provider.default": "gemini.extension"
}
```

**测试步骤**：

1. 确保安装并启用了 Google Gemini IDE 插件。
2. 触发 “Ask AI”。
3. **验证标准**：Gemini 面板自动激活并接收到包含文件上下文的 Prompt。

**场景 B：CLI 模式**
**配置**：

```json
{
  "provider.default": "gemini.cli"
}
```

**验证标准**：

- VS Code 新建终端并使用指定的 Gemini CLI 工具加载代码上下文。

---

### 3.4 Codex (`codex`)

**支持模式**：`extension`, `cli`

**配置测试 (`extension`)**：

```json
{
  "provider.default": "codex.extension"
}
```

**验证标准**：

- Codex 插件聊天侧边栏被激活。
- Prompt 内容正确映射。

---

### 3.5 Coco (`coco`)

**支持模式**：`cli` (仅支持 CLI 模式)

**配置**：

```json
{
  "provider.default": "coco.cli"
}
```

**测试步骤**：

1. 环境中需要能运行 Coco 命令行。
2. 浏览器触发 “Ask AI”。
3. **验证标准**：
   - 由于 Coco 不支持 `extension`，插件应创建并聚焦到 Terminal。
   - 终端中执行 Coco 命令并携带代码上下文（或者通过复制/粘贴机制送入终端）。

---

## 4. 边界条件与 Fallback 测试

1. **错误的 Provider 配置**
   如果输入了未知的模式：

   ```json
   {
     "provider.default": "copilot.cli"
   }
   ```

   **验证标准**：`copilot` 并不支持 `cli`，系统应当优雅降级（Fallback）回该工具支持的默认模式（`extension`），并正常打开 Copilot 插件面板。

2. **缺少特定工具或插件**
   如果系统找不到指定的工具（例如配置了 `claude-code.extension` 但未安装 Claude 插件），插件的 Fallback 机制应当退回到将内容复制到剪贴板，并在 IDE 右下角弹出错误或警告提示：“未找到该扩展，内容已复制至剪贴板”（Fallback 到 `clipboard` 策略）。

## 5. IDE 协议参数覆盖验证

在某些情况下，CLI 的启动路径可能被自定义覆盖：

```json
{
  "provider.default": "claude-code.cli",
  "provider.claude-code.cli.bin": "/usr/local/bin/my-claude-cli"
}
```

**验证标准**：IDE 端接到的 payload 中的 `overrides.binaryPath` 应当指向配置的 `/usr/local/bin/my-claude-cli`，而非默认的全局命令。

---

**测试完成确认**：如果上述场景的跳转、面板唤醒、CLI 终端开启以及 fallback 表现与预期一致，则证明 `packages/ide` 中 `fallback-chain.ts` 及各 `strategies/*` 的实现逻辑工作正常。
