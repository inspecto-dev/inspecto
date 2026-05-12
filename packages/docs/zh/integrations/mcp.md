# MCP 集成

MCP 模式可以让 AI Agent 从 Inspecto 领取 Annotate 任务、处理代码修改，并把进度回写到浏览器。你不需要手动复制 DOM 路径、截图或备注：在浏览器里点击组件、创建任务，然后让 Agent 处理队列即可。

如果你希望 Inspecto 和支持 MCP 的 Agent 协作，尤其是使用**独立运行 / 纯浏览器模式** (`ide: "none"`) 时，请使用本页流程。

## 最简单的使用流程

1. **启动已接入 Inspecto 的应用。** 保持本地 dev server 运行。
2. **安装 Inspecto agent skill**，让 Agent 知道如何领取和结束任务。
3. **把 Inspecto 配成 MCP server**，接入你的 AI 客户端。最省事的方式是用 `add-mcp`；手动 JSON 配置作为兜底。
4. **在浏览器打开 Annotate mode**，点击一个或多个组件，写备注，然后点击 **Create Task**。
5. **把下面的 prompt 复制给 Agent。** Agent 会领取队列里的任务、处理代码、回写进度，并在完成后关闭 session。

<CopyPrompt
  eyebrow="Agent Prompt"
  title="处理 Inspecto 队列任务"
  description="在 Annotate mode 点击 Create Task 后，把这段内容发给支持 MCP 的 Agent。"
  copy-label="复制 Prompt"
  copied-label="已复制"
  prompt="请处理我的 Inspecto 待办任务。使用 Inspecto MCP tools 领取下一条 session，完成修改，运行检查，并在结束后 resolve。"
/>

## 1. 安装 agent skill

如果你的 Agent 支持 [skills](https://www.npmjs.com/package/skills) CLI，可以用一条命令安装 Inspecto 的 Agent skill：

```bash
npx skills add inspecto-dev/inspecto --skill inspecto-agent
```

这会把 `inspecto-agent` 指令安装到 `skills` 自动识别到的 Agent 目录。如果你想指定某个 Agent 并全局安装，可以使用非交互命令：

```bash
npx skills add inspecto-dev/inspecto --skill inspecto-agent --agent claude-code --global --yes
```

把 `claude-code` 替换成你正在使用的 Agent，例如 `codex`、`cursor`、`trae` 或 `codebuddy`。

## 2. 添加 MCP server

推荐使用 [`add-mcp`](https://www.npmjs.com/package/add-mcp) 自动写入对应 Agent 的 MCP 配置：

::: code-group

```bash [Cursor]
npx -y add-mcp@latest "npx -y @inspecto-dev/cli@latest mcp" --name inspecto -a cursor -y
```

```bash [Claude Code]
npx -y add-mcp@latest "npx -y @inspecto-dev/cli@latest mcp" --name inspecto -a claude-code -y
```

```bash [Codex]
npx -y add-mcp@latest "npx -y @inspecto-dev/cli@latest mcp" --name inspecto -a codex -y
```

```bash [VS Code]
npx -y add-mcp@latest "npx -y @inspecto-dev/cli@latest mcp" --name inspecto -a vscode -y
```

:::

`add-mcp` 比较适合这里，因为它会处理 Cursor、Claude Code、Codex、VS Code、OpenCode 等不同客户端的 MCP 配置文件位置。建议始终传 `-a <agent>`，这样只会更新你想配置的客户端。如果不传 `-a`，`add-mcp -y` 在没有检测到客户端时可能会安装到所有支持项目级配置的 Agent。

如果你更想手动配置，并且客户端使用 `mcpServers` JSON 格式（例如 Cursor 或 Claude Code 项目配置），可以加入下面这段：

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

如果你同时运行多个本地项目，Agent 可能连到错误的 Inspecto server。此时可以显式指定 URL。使用 `add-mcp` 时，把额外参数放进引号里的 MCP 命令；手动配置时，把它加到 `args` 里：

```bash
npx -y add-mcp@latest "npx -y @inspecto-dev/cli@latest mcp --server-url http://127.0.0.1:5678" --name inspecto -a cursor -y
```

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

如果浏览器和 Agent 需要通过不同 hostname 访问 dev server，请在 `.inspecto/settings.local.json` 里设置 `server.publicUrl`，保证两边使用同一个可访问地址。

## 3. 从 Annotate 创建 MCP 任务

确认 Annotate 使用 MCP 通道：

```json
{
  "annotate.channel": "mcp"
}
```

然后在浏览器里操作：

1. 打开 **Annotate mode**。
2. 点击和问题相关的 UI 元素。
3. 写简短备注，例如“按钮改成主按钮”或“卡片和标题左对齐”。
4. 点击 **Create Task**。
5. 回到 Agent，把上面的可复制 prompt 发给它。

Annotate 侧边栏会变成任务时间线：你可以看到任务入队、Agent 领取、进度回复，以及最终完成或关闭状态。

## 4. 可选：让 Agent 持续监听

如果你的 AI 客户端支持长时间运行或后台 Agent，可以让它等待下一条任务，而不是每次点击 **Create Task** 后都手动发消息。

<CopyPrompt
  eyebrow="Agent Prompt"
  title="等待下一条 Inspecto 任务"
  description="仅推荐在支持长时间 tool call 或后台 Agent 的客户端中使用。"
  copy-label="复制 Prompt"
  copied-label="已复制"
  prompt="请监听 Inspecto 任务。任务出现后领取、修改、运行检查并 resolve。持续处理，直到我让你停止。"
/>

大多数聊天型客户端会限制 tool call 时长。如果 Agent 等待超时，任务仍会安全保留在 Inspecto 队列里；创建任务后重新发送第一段 prompt 即可。

## Workflow 按钮

MCP 还支持项目级 workflow 按钮。你可以在 `.inspecto/prompts.json` 中添加 `kind: "workflow"` 配置，然后在 Annotate mode 中点击执行。这类任务不需要选择 DOM 元素；Inspecto 会追加项目根目录、当前分支、git status 等元信息。

```json
[
  {
    "id": "deploy-preview",
    "kind": "workflow",
    "label": "Deploy Preview",
    "prompt": "请使用可用的 deploy skill、MCP server 或 CLI tool，将当前分支部署到预览环境。不要部署生产环境。完成后回复预览链接，并将 Inspecto session 标记为 resolved。",
    "confirm": true
  }
]
```

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

## 暴露的 MCP tools

通常你不需要手动调用这些工具。把 prompt 发给 Agent 后，它会自己使用。

- `inspecto_claim_next`: 领取下一条 annotation 或 workflow session。
- `inspecto_get_session`: 通过 ID 获取指定 session。
- `inspecto_reply`: 将进度消息回写到浏览器时间线。
- `inspecto_resolve`: 标记任务已完成。
- `inspecto_dismiss`: 不处理代码修改，直接关闭任务。

<script setup>
import CopyPrompt from '../../components/CopyPrompt.vue'
</script>
