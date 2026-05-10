# MCP 集成 (MCP Integration)

如果你的 AI 助手或 runtime 支持 MCP (Model Context Protocol)，Inspecto 可以通过一个专用的 MCP stdio 入口，将其标注工作流直接暴露给你的 Agent。

如果你正在使用 Inspecto 的**独立运行/纯浏览器模式** (`ide: "none"`)，这会非常有用，因为它能让你的 AI 工具直接以 hands-free（免手动）的方式获取上下文，而不需要依赖任何 IDE 插件。在 MCP 模式下，浏览器也会变成实时 session 界面：标注模式可以展示任务何时入队、何时被 Agent 领取、Agent 回传了哪些进度，以及最终是完成还是关闭。

MCP 还会解锁 Inspecto 的自定义 workflow 按钮。你可以在 `.inspecto/prompts.json` 中定义 `kind: "workflow"` 指令，例如 `Deploy Preview` 或 `Review & PR`。点击后，Inspecto 会把这条指令和项目元信息作为 workflow session 入队，Agent 再利用自身已有的 skill、MCP server 和 tool 完成任务。

## 配置项

为了将 Inspecto 接入到你的 Agent，请将以下 JSON 配置添加到你的 Agent MCP 配置中（例如 Claude Desktop 或 Cursor 的 MCP 设置）：

```json
{
  "mcpServers": {
    "inspecto": {
      "command": "npx",
      "args": ["-y", "@inspecto-dev/cli@latest", "mcp"]
    }
  }
}
```

如果自动发现无法命中正确的本地 dev server（例如同时运行了多个项目），你可以显式传入 URL：

```json
{
  "mcpServers": {
    "inspecto": {
      "command": "npx",
      "args": ["-y", "@inspecto-dev/cli@latest", "mcp", "--server-url", "http://127.0.0.1:5678"]
    }
  }
}
```

如果浏览器或 Agent 访问 Inspecto dev server 时使用的主机名与监听地址不同，请在 `.inspecto/settings.local.json` 中设置 `server.publicUrl`，让浏览器注入和 MCP 发现统一使用可访问的地址。

## 推荐的使用模式

Inspecto 支持两种与 Agent 协作的工作流，你可以根据你使用的 AI 客户端（如 Cursor、Claude Desktop 等）的特性来选择。在开始前，请确保你项目中的 `.inspecto/settings.local.json` 里 `"annotate.channel"` 设为了 `"mcp"`。

### 浏览器侧 Session Timeline

当 `annotate.channel` 设置为 `mcp` 时，点击 `Create Task` 会在本地 Inspecto dev server 上创建一个可持久化的标注 session。标注侧栏会展示最近 session 的 timeline，让你可以在发现问题的同一个浏览器上下文里追踪这次交接。

timeline 包含：

- 任务创建 / 入队状态；
- `inspecto_claim_next` 成功后的 Agent 领取状态；
- Agent 通过 `inspecto_reply` 回传的进度消息；
- 通过 `inspecto_resolve` 完成，或通过 `inspecto_dismiss` 关闭的最终状态。

这让 MCP 模式不再只是一次 prompt handoff：Agent 可以在处理过程中把状态回写到浏览器，你也不需要只依赖 chat 窗口去猜测任务进展。

### 自定义 Workflow 按钮

Workflow 按钮和 inspect 菜单 prompt 一样，通过 `.inspecto/prompts.json` 配置：

```json
[
  {
    "id": "deploy-preview",
    "kind": "workflow",
    "label": "Deploy Preview",
    "prompt": "请使用可用的 deploy skill、MCP server 或 CLI tool，将当前分支部署到预览环境。完成后回复预览链接，并将 Inspecto session 标记为 resolved。",
    "confirm": true
  }
]
```

和普通标注任务相比，workflow session 更像一条项目指令。它可以不依赖任何已选 DOM 批注，Inspecto 会追加项目根目录、当前分支、git status 等项目元信息，帮助 Agent 判断如何执行。Agent 仍然通过 `inspecto_reply` 回写进度，并通过 `inspecto_resolve` 或 `inspecto_dismiss` 结束任务。

你可以按下面的方式区分两类 session：

| Session 类型       | 从哪里开始                       | 适合场景                                     | 是否需要 DOM 批注 |
| :----------------- | :------------------------------- | :------------------------------------------- | :---------------- |
| Annotation session | 选中的元素 + 每个节点的批注意见  | UI 修复、设计走查、组件级重构                | 通常需要          |
| Workflow session   | 配置好的 `kind: "workflow"` 条目 | deploy、PR、release、测试、文档、批量 review | 不需要            |

常用 workflow prompt 模板：

::: code-group

```json [Deploy Preview]
{
  "id": "deploy-preview",
  "kind": "workflow",
  "label": "Deploy Preview",
  "prompt": "请使用可用的 deploy skill、MCP server 或 CLI tool，将当前分支部署到预览环境。不要部署生产环境。完成后回复预览链接，并将 Inspecto session 标记为 resolved。",
  "confirm": true
}
```

```json [Review & PR]
{
  "id": "review-pr",
  "kind": "workflow",
  "label": "Review & PR",
  "prompt": "请审查当前分支，运行合适的检查，汇总变更，并在确认安全后创建 PR。push 或 merge 前必须再次确认。完成后回复 PR 链接，并将 Inspecto session 标记为 resolved。",
  "confirm": true
}
```

```json [Release Notes]
{
  "id": "release-notes",
  "kind": "workflow",
  "label": "Release Notes",
  "prompt": "请检查当前分支和近期提交，按 feature、fix、documentation 分类生成简洁的 release notes。完成后回复 markdown 格式内容，并将 Inspecto session 标记为 resolved。"
}
```

:::

### 模式 1：异步队列模式（推荐大多数客户端使用）

由于大多数对话型 AI 客户端有严格的工具调用超时限制（例如如果 Agent 挂起超过 2 分钟，客户端会强行断开并报错），我们推荐这种异步协作模式：

1. **沉浸式标注**: 在浏览器中开启「标注模式」，自由地收集问题。
2. **提交任务**: 每次点击 `Create Task` 时，任务会安全地存储到本地 dev server 的队列中。你可以连续提交多个任务。
3. **浏览器侧追踪**: 保持标注侧栏打开，你可以看到任务入队，并在之后看到 Agent 进度。
4. **批量处理**: 回到你的 AI 助手，告诉它：“请处理一下我刚才积攒的 UI 标注”。
5. **Agent 执行**: 你的 Agent 会调用 `inspecto_claim_next` 迅速“清空”本地队列中的待办任务。进度回复和最终状态会同步反映在 timeline 中。

### 模式 2：实时监听模式（如果你在后台运行 Agent）

如果你的 Agent 支持在后台长驻运行，或者你的客户端允许长时间挂起工具调用，你可以使用最极致的免手动模式：

1. **启动监听**: 告诉你的 Agent：“请进入持续标注模式，等待我接下来的前端标注（可以设置较长的超时时间，比如 10 分钟）”。
2. **Agent 挂起**: Agent 会调用 `inspecto_claim_next` 并传入较长的 `timeoutMs`，进入等待状态。
3. **实时处理**: 一旦你在前端点击 `Create Task`，Agent 会在几毫秒内自动捕获上下文并直接开始写代码，无需你在两个窗口间来回切换。浏览器侧 timeline 会随着 Agent 领取、回复和完成 session 而更新。

> **重要限制**：大多数对话型 AI 客户端（包括标准聊天界面）对工具调用有严格的超时限制（通常为 1–2 分钟）。如果你在超时到期前没有提交标注，`inspecto_claim_next` 调用会失败，Agent 将回到空闲状态。此时你的标注仍会留在队列中，但需要你明确发送指令（如“请处理我的 UI 标注”）才会被处理。如需真正持续的后台监听，请使用支持常驻 Agent 的客户端（如 Claude Desktop、Cursor Agent Mode）。

## 暴露的 MCP 工具列表

这套 MCP 能力刻意收敛到了免手动的 session 工作流。以下工具会代理到本地的 Inspecto dev server（dev server 是管理标注会话的唯一真相源）：

- `inspecto_claim_next`: 等待下一条未处理的标注任务，并自动领取它。浏览器侧 timeline 会从入队更新为已领取。
- `inspecto_get_session`: 通过 ID 直接获取某个具体的标注会话。
- `inspecto_reply`: Agent 用来向标注任务回传进度或状态信息，这些回复会展示在浏览器侧 timeline 中。
- `inspecto_resolve`: Agent 用来将任务标记为已完成，timeline 会记录完成状态。
- `inspecto_dismiss`: 如果某个标注会话不应该被处理，Agent 会调用此工具将其关闭，timeline 会记录关闭状态。
