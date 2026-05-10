# Inspecto Workflow Slots — 最终设计方案

## 一、方案概述

**目标**：在 Annotate Sidebar 新增可配置的工作流按钮。用户点击后，系统将配置的 prompt + 当前批注上下文 + 项目元信息投递给 Agent，Agent 借助自身能力（skill / MCP / tool）自主完成执行。

**核心原则**：

1. **配置驱动**：所有工作流行为由 `prompts.json` 中的 `kind: 'workflow'` 条目定义。
2. **Agent 自治**：Inspecto 只投递上下文，Agent 自行决定调用哪个 skill / MCP / tool。
3. **复用现有链路**：Workflow 本质上是预配置 instruction 的 annotation dispatch，完美复用现有 API、SessionStore、MCP adapter 以及 SSE stream。
4. **不新增后端 API**：前端直接调用现有 `POST /ai/dispatch/annotations`。

## 二、核心流程

```mermaid
graph TD
    A[1. 用户完成批注，Agent 已处理（或直接点击 Workflow 按钮）] --> B
    B[2. 用户点击 Workflow 按钮 (如 'Review & PR')<br>按钮来源: prompts.json 中 kind: 'workflow'] --> C
    C[3. 前端复用现有 sendAnnotationsToAi 接口<br>instruction = workflow.prompt<br>annotations = 当前全量批注数据<br>deliveryMode = 'agent'] --> D
    D[4. 后端 dispatchAnnotationsToAi (现有逻辑)<br>→ 组装 prompt = instruction + 批注上下文<br>→ 创建 Session 入队<br>→ 项目元信息注入 (新增)] --> E
    E[5. Agent 通过 inspecto_claim_next 拉取 session<br>→ 阅读 instruction，理解任务<br>→ 用自身能力(skill/MCP/tool)执行<br>→ inspecto_reply / inspecto_resolve 回传结果]
```

## 三、配置定义

### 3.1 用户配置 (`.inspecto/prompts.json`)

```json
[
  {
    "id": "submit-pr",
    "kind": "workflow",
    "label": "Review & PR",
    "prompt": "使用 deploy skill 的完整流程：检查当前批注涉及的修改，执行 git commit，然后创建 PR 到 main 分支。",
    "confirm": true
  },
  {
    "id": "deploy-preview",
    "kind": "workflow",
    "label": "Deploy Preview",
    "prompt": "使用 deploy skill 部署当前分支到预览环境，返回预览链接。"
  },
  {
    "id": "generate-spec",
    "kind": "workflow",
    "label": "生成设计规范",
    "prompt": "基于当前批注内容，生成对应组件的设计规范文档。"
  }
]
```

**字段说明**：

| 字段      | 类型         | 必填 | 说明                             |
| :-------- | :----------- | :--- | :------------------------------- |
| `id`      | `string`     | 是   | 唯一标识                         |
| `kind`    | `'workflow'` | 是   | 标识为工作流条目                 |
| `label`   | `string`     | 否   | 按钮显示名称，默认取 `id`        |
| `prompt`  | `string`     | 是   | 发送给 Agent 的核心指令          |
| `confirm` | `boolean`    | 否   | 执行前是否弹出确认，默认 `false` |
| `enabled` | `boolean`    | 否   | 是否启用，默认 `true`            |

### 3.2 JSON Schema (`schema/prompts.json`)

新增 workflow 条目定义：

```json
{
  "type": "object",
  "description": "工作流触发器：点击按钮将 prompt 投递给 Agent 执行。",
  "properties": {
    "id": { "type": "string", "description": "唯一标识" },
    "kind": { "type": "string", "enum": ["workflow"], "description": "标识为工作流条目" },
    "label": { "type": "string", "description": "按钮显示名称" },
    "prompt": { "type": "string", "description": "发送给 Agent 的指令" },
    "confirm": { "type": "boolean", "description": "执行前是否确认", "default": false },
    "enabled": { "type": "boolean", "description": "是否启用", "default": true }
  },
  "required": ["id", "kind", "prompt"]
}
```

## 四、类型定义扩展

### 4.1 `packages/types/src/prompts.ts`

```typescript
export type IntentKind = 'ai-prompt' | 'workflow'

export type AiIntent = 'ask' | 'fix' | 'review' | 'redesign'

/** AI Prompt（用于 Inspect Menu 和 Annotate 的 AI 问答按钮） */
export interface AiIntentConfig {
  kind?: 'ai-prompt'
  id: string
  label?: string
  aiIntent: AiIntent
  prompt?: string
  prependPrompt?: string
  appendPrompt?: string
  enabled?: boolean
}

/** Workflow（用于 Annotate Sidebar 的工作流按钮） */
export interface WorkflowConfig {
  kind: 'workflow'
  id: string
  label?: string
  prompt: string
  confirm?: boolean
  enabled?: boolean
}

export type IntentConfig = AiIntentConfig | WorkflowConfig

export function isWorkflowConfig(c: IntentConfig): c is WorkflowConfig {
  return c.kind === 'workflow'
}

export function isAiIntentConfig(c: IntentConfig): c is AiIntentConfig {
  return c.kind !== 'workflow'
}
```

### 4.2 `packages/types/src/providers.ts`

```typescript
/** 传递给前端的 Workflow 按钮配置 */
export interface WorkflowSlotOption {
  id: string
  label: string
  confirm: boolean
}

export interface InspectoConfig {
  // ... existing fields ...
  prompts?: AiIntentConfig[]
  workflows?: WorkflowSlotOption[] // 新增
}
```

### 4.3 `packages/types/src/runtime.ts`

```typescript
export interface AnnotationWorkSession {
  // ... existing fields ...
  source?: 'annotation' | 'workflow'
  workflowId?: string
}

export interface CreateAnnotationWorkSessionInput {
  // ... existing fields ...
  source?: 'annotation' | 'workflow'
  workflowId?: string
}

export interface SendAnnotationsToAiRequest {
  // ... existing fields ...
  source?: 'annotation' | 'workflow'
  workflowId?: string
}
```

## 五、后端改动

### 5.1 `packages/plugin/src/config.ts`

在 `resolveIntents` 中按新类型解析 `kind: 'workflow'`：

```typescript
// 解析 Workflow
if (item.kind === 'workflow') {
  if (!item.prompt) {
    configLogger.warn(`Workflow "${item.id}" missing required "prompt", skipping`)
    continue
  }
  result.push({
    kind: 'workflow',
    id: item.id,
    label: item.label ?? item.id,
    prompt: item.prompt,
    confirm: item.confirm ?? false,
    enabled: item.enabled ?? true,
  } as WorkflowConfig)
}
```

新增辅助函数：

```typescript
export function resolveWorkflowSlots(intents: IntentConfig[]): WorkflowSlotOption[] {
  return intents
    .filter(isWorkflowConfig)
    .filter(w => w.enabled !== false)
    .map(w => ({
      id: w.id,
      label: w.label ?? w.id,
      confirm: w.confirm ?? false,
    }))
}
```

### 5.2 `packages/plugin/src/server/client-config.ts`

分离 prompts 和 workflows 返回前端：

```typescript
const allIntents = resolveIntents(promptsConfig)

return {
  // ...
  prompts: allIntents.filter(isAiIntentConfig),
  workflows: resolveWorkflowSlots(allIntents),
}
```

### 5.3 `packages/plugin/src/server/annotation-dispatch.ts`

在 Prompt 末尾追加项目元信息：

```typescript
export async function dispatchAnnotationsToAi(...) {
  // ...
  let prompt = buildAnnotationBatchPrompt(batch)
  prompt = appendProjectMetadata(prompt, state) // 新增注入
  // ...
}

/** 在 prompt 末尾追加项目元信息 */
function appendProjectMetadata(prompt: string, state: Pick<ServerState, 'projectRoot' | 'cwd'>): string {
  const lines = ['\n## Project']
  lines.push(`- Root: ${state.projectRoot}`)
  try {
    // 建议：此处增加 timeout 防止超大仓库阻塞 Node 主线程
    const options = { cwd: state.projectRoot, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 2000 } as const;
    const branch = execSync('git branch --show-current', options).trim()
    lines.push(`- Branch: ${branch}`)

    const statusRaw = execSync('git status --porcelain', options).trim()
    const entries = statusRaw ? statusRaw.split('\n') : []
    const staged = entries.filter(l => l[0] !== ' ' && l[0] !== '?').length
    const untracked = entries.filter(l => l[0] === '?').length
    lines.push(`- Status: ${staged} staged, ${untracked} untracked`)
  } catch {
    lines.push('- Git: unavailable or check timeout')
  }
  return `${prompt}\n\n${lines.join('\n')}`
}
```

### 5.4 SessionStore 与 MCP Adapter (`session-store.ts` & `mcp-adapter.ts`)

- `createSession` 接收 `source` 和 `workflowId`。
- `findNewestMatchingSession` 增加对 `source` 的过滤。
- `mcp-adapter.ts` 的 `claimNext` 接口支持 `source?: 'annotation' | 'workflow'`。

**MCP 工具描述更新**：
明确告知 LLM，使用 `source='workflow'` 拉取带有全局上下文（Git 状态、项目根目录）的宏观自动化任务，使用 `source='annotation'` 处理带 DOM 上下文的局部审查/修复任务。

## 六、前端改动

### 6.1 Sidebar UI 扩展 (`packages/core/src/annotate-sidebar-dom.ts` & `annotate-sidebar.ts`)

在侧边栏底部新建 `workflowRow` 容器，并根据 `workflows` 配置动态渲染按钮：

```typescript
for (const wf of workflows) {
  const btn = createSidebarButton(wf.label, annotateSidebarButtonClass)
  btn.dataset.workflowId = wf.id
  // ... 样式设置
  btn.addEventListener('click', () => {
    if (wf.confirm && !confirm(`确认执行「${wf.label}」？`)) return
    next.onWorkflow?.(wf.id)
  })
  workflowRow.appendChild(btn)
}
```

### 6.2 触发逻辑 (`packages/core/src/component-annotate-ui.ts`)

复用 `sendAnnotationBatch` 发送请求：

```typescript
export async function triggerWorkflow(ctx: unknown, workflowId: string): Promise<void> {
  const state = asAnnotateContext(ctx)
  if (state.annotateSendState.isSending) return // 考虑只锁定 workflow 自身

  const transports = collectCurrentTransports(state)
  const workflow = state.annotateWorkflows.find(w => w.id === workflowId)
  if (!workflow) return

  await sendAnnotationBatch(
    state,
    transports,
    'create-task',
    workflow.prompt, // workflow 配置的指令
    'agent', // 锁定给 Agent 处理，废弃 both
    () => {
      /* 成功回调 */
    },
    { source: 'workflow', workflowId }, // 额外 Payload
  )
}
```

## 七、端到端流程示例

### 场景：代码提交 + 创建 PR

1. **配置**：存在 `submit-pr` 工作流。
2. **触发**：用户在侧边栏点击 "Review & PR"。
3. **前端发送**：将配置的 prompt (`使用 deploy skill 的完整流程...`) 作为 payload；链路仅由 `annotate.channel` 决定。
4. **后端组装**：拼接 Prompt、标注内容以及动态获取的 Git 状态，创建 `source='workflow'` 的 Session。
5. **Agent 拉取**：通过 `inspecto_claim_next({ source: 'workflow' })` 拉取任务。
6. **Agent 执行**：阅读完整指令和项目元信息，自主调用挂载的 Git/GitHub MCP 工具提交代码并提 PR。
7. **反馈**：Agent 通过 `inspecto_reply` 实时更新进度，用户在侧边栏可实时看到反馈。

---

_本文档沉淀自 2026-05-09 架构设计讨论。_
