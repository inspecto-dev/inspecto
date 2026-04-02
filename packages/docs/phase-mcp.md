# Inspecto MCP + 状态管理 — 完整设计文档（双向通信完整版）

> 本文档是 Inspecto MCP Server 双向通信系统的**最终开发参考**。所有类型定义、接口、路由、Tool 描述均为可直接落地的代码级规格。

---

## 目录

1. [产品术语重定义](#1-产品术语重定义)
2. [类型定义](#2-类型定义)
3. [Store 接口](#3-store-接口)
4. [EventBus](#4-eventbus)
5. [HTTP API](#5-http-api)
6. [MCP Server & Tools](#6-mcp-server--tools)
7. [浏览器端变更](#7-浏览器端变更)
8. [MCP 配置集成](#8-mcp-配置集成)
9. [Hands-Free 工作流（含双向对话）](#9-hands-free-工作流含双向对话)
10. [完整术语对照表](#10-完整术语对照表)
11. [ID 命名规范](#11-id-命名规范)
12. [实现计划](#12-实现计划)

---

## 1. 产品核心术语

### 1.1 核心概念定义

Inspecto 的产品语言围绕 **inspect（检视）** 构建。用户的核心动作是 **检视一个 UI 元素并将其派发给 AI**。核心术语体系从 Inspecto 自身语义出发：

| Inspecto 术语                     | 语义说明                                                                 |
| --------------------------------- | ------------------------------------------------------------------------ |
| **`Inspection`**                  | 用户对一个 UI 元素的一次检视+派发行为。包含源码坐标、用户意图、AI prompt |
| **`Page`**                        | 一个浏览器页面上下文（与页面 URL 一一对应）                              |
| **`InspectionStatus`**            | 检视的处理状态                                                           |
| **`Intent`**                      | 已有概念，直接复用。对齐 `DEFAULT_INTENTS` 中的 id                       |
| **`Message`** (InspectionMessage) | 检视的对话消息（Agent 回复/提问）                                        |
| **`inspection.created`**          | 事件命名                                                                 |
| **`inspecto_watch`**              | MCP Tool 命名，以产品名为前缀                                            |

### 1.2 命名规范

```
MCP Tools:      inspecto_<verb>           → inspecto_watch, inspecto_resolve, inspecto_reply
HTTP 路由:      /inspecto/api/v1/<noun>   → /inspecto/api/v1/inspections
事件类型:       inspection.<verb>          → inspection.created, inspection.updated
类型名:         Inspecto<Noun>            → InspectoPage, InspectoEvent
Store 方法:     <verb>Inspection()        → createInspection(), resolveInspection()
```

### 1.3 与现有代码的术语映射

| 现有代码中的概念                                | 文件                            | 新增概念对应                               |
| ----------------------------------------------- | ------------------------------- | ------------------------------------------ |
| `SourceLocation { file, line, column }`         | `packages/types/src/index.ts`   | `Inspection.source` — 直接复用             |
| `IntentConfig { id, label, prompt }`            | `packages/types/src/intents.ts` | `Inspection.intent` — 对齐 IntentConfig.id |
| `SendToAiRequest { location, snippet, prompt }` | `packages/types/src/index.ts`   | `CreateInspectionRequest` 的子集           |
| `AiPayload { ide, target, prompt, ... }`        | `packages/types/src/index.ts`   | 不变，IDE Extension 侧的派发载体           |
| `showIntentMenu()`                              | `packages/core/src/menu.ts`     | 触发 Inspection 创建的入口函数             |
| `handleSend()`                                  | `packages/core/src/menu.ts`     | 同时触发 `sendToAi` + `createInspection`   |

---

## 2. 类型定义

### 2.1 新增文件 `packages/types/src/inspection.ts`

```typescript
import type { SourceLocation } from './index.js'

// ─────────────────────────────────────────────────────────────────────────────
// Inspection Status — 状态机
// ─────────────────────────────────────────────────────────────────────────────
//
//     ┌───────────┐
//     │  pending   │◀── 创建
//     └─────┬─────┘
//           │
//    ┌──────┼──────────────────────┐
//    ▼      ▼                      ▼
//  ┌────────────┐  ┌──────────┐  ┌───────────┐
//  │ in_progress│  │ resolved │  │ dismissed │
//  └──┬───┬─────┘  └──────────┘  └───────────┘
//     │   │
//     │   ├────────────┐
//     │   ▼            ▼
//     │ ┌──────────┐ ┌───────────┐
//     │ │ resolved │ │ dismissed │
//     │ └──────────┘ └───────────┘
//     │
//     ▼
//  ┌────────────┐
//  │ needs_info │◀── Agent 提问，等待用户回复
//  └─────┬──────┘
//        │ 用户回复
//        ▼
//  ┌────────────┐
//  │ in_progress│── 自动恢复
//  └────────────┘
//

export type InspectionStatus =
  | 'pending' // 刚创建，Agent 尚未接收
  | 'in_progress' // Agent 已接收，正在处理
  | 'needs_info' // Agent 已提问，等待用户补充信息
  | 'resolved' // Agent 已完成
  | 'dismissed' // Agent 已驳回

// ─────────────────────────────────────────────────────────────────────────────
// Intent — 对齐 DEFAULT_INTENTS 中的 id
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 与 intents.ts DEFAULT_INTENTS 的 id 字段对齐。
 * 'ask' 对应用户在 AI Menu 顶部 input 中输入的自由文本。
 */
export type InspectionIntent =
  | 'explain' // Explain Component
  | 'fix-bug' // Fix Bug
  | 'fix-styles' // Fix Styles
  | 'refactor' // Refactor Component
  | 'ask' // 自由文本（AI Menu input）

// ─────────────────────────────────────────────────────────────────────────────
// Message — 检视对话线程中的消息
// ─────────────────────────────────────────────────────────────────────────────

export interface InspectionMessage {
  id: string
  /** 所属 Inspection ID（用于 watch 返回时关联上下文） */
  inspectionId: string
  role: 'human' | 'agent'
  content: string
  createdAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Inspection — 一次检视记录，以编译时源码坐标为核心
// ─────────────────────────────────────────────────────────────────────────────

export interface Inspection {
  /** 唯一 ID */
  id: string

  /** 所属 Page ID */
  pageId: string

  /** 编译时源码坐标（来自 data-inspecto 属性，Inspecto 核心） */
  source: SourceLocation

  /** 代码片段（当 includeSnippet=true 时由 fetchSnippet 返回） */
  snippet?: string

  /** 用户输入的文本（AI Menu input 内容或 Intent label） */
  userInput: string

  /** 用户选择的 Intent */
  intent: InspectionIntent

  /** 发送给 AI 的完整 prompt（含模板渲染结果） */
  prompt: string

  /** 处理状态 */
  status: InspectionStatus

  /** 对话线程 */
  messages: InspectionMessage[]

  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt?: string
  /** 完成时间（resolved 或 dismissed） */
  completedAt?: string
  /** 完成方 */
  completedBy?: 'human' | 'agent'
}

// ─────────────────────────────────────────────────────────────────────────────
// Page — 一个页面上下文（与浏览器页面 URL 一一对应）
// ─────────────────────────────────────────────────────────────────────────────

export type PageStatus = 'active' | 'closed'

export interface InspectoPage {
  id: string
  /** 页面 URL */
  url: string
  /** 项目根路径 */
  projectRoot: string
  status: PageStatus
  createdAt: string
  updatedAt?: string
}

export interface PageWithInspections extends InspectoPage {
  inspections: Inspection[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Event — 实时事件
// ─────────────────────────────────────────────────────────────────────────────

export type InspectoEventType =
  | 'inspection.created'
  | 'inspection.updated'
  | 'inspection.deleted'
  | 'page.created'
  | 'page.closed'
  | 'message.created'

export interface InspectoEvent {
  type: InspectoEventType
  timestamp: string
  pageId: string
  /** 单调递增序列号 */
  sequence: number
  payload: Inspection | InspectoPage | InspectionMessage
}

// ─────────────────────────────────────────────────────────────────────────────
// Request / Response — HTTP API 交互类型
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateInspectionRequest {
  /** 页面 URL（自动创建/匹配 Page） */
  url: string
  /** 编译时源码坐标 */
  source: SourceLocation
  /** 代码片段 */
  snippet?: string
  /** 用户输入文本 */
  userInput: string
  /** Intent ID */
  intent: InspectionIntent
  /** 完整 prompt */
  prompt: string
}

export interface CreateInspectionResponse {
  inspection: Inspection
  page: InspectoPage
}

export interface UpdateInspectionRequest {
  status: InspectionStatus
  completedBy?: 'human' | 'agent'
}

export interface AddMessageRequest {
  role: 'human' | 'agent'
  content: string
}

export interface PendingInspectionsResponse {
  count: number
  inspections: Inspection[]
}

/** inspecto_list_inspections 的查询参数 */
export interface ListInspectionsQuery {
  pageId?: string
  status?: InspectionStatus | InspectionStatus[]
}

/** inspecto_watch 的返回结构 */
export interface WatchResult {
  timeout: boolean
  newInspections: Inspection[]
  newReplies: {
    inspectionId: string
    message: InspectionMessage
  }[]
}
```

### 2.2 `packages/types/src/index.ts` 扩展

```typescript
// 在文件末尾新增
export * from './inspection.js'
```

---

## 3. Store 接口

### 3.1 类型定义 `packages/core/src/store/types.ts`

```typescript
import type {
  Inspection,
  InspectoPage,
  PageWithInspections,
  InspectionStatus,
  InspectionIntent,
  InspectoEvent,
  SourceLocation,
} from '@inspecto-dev/types'

export interface CreateInspectionInput {
  source: SourceLocation
  snippet?: string
  userInput: string
  intent: InspectionIntent
  prompt: string
}

export interface InspectoStore {
  // ── Page ──
  createPage(url: string, projectRoot: string): InspectoPage
  getPage(id: string): InspectoPage | undefined
  getPageByUrl(url: string): InspectoPage | undefined
  getPageWithInspections(id: string): PageWithInspections | undefined
  listPages(): InspectoPage[]
  closePage(id: string): InspectoPage | undefined

  // ── Inspection ──
  createInspection(pageId: string, data: CreateInspectionInput): Inspection | undefined
  getInspection(id: string): Inspection | undefined
  listInspections(filter?: {
    pageId?: string
    status?: InspectionStatus | InspectionStatus[]
  }): Inspection[]
  updateInspectionStatus(
    id: string,
    status: InspectionStatus,
    completedBy?: 'human' | 'agent',
  ): Inspection | undefined
  addMessage(inspectionId: string, role: 'human' | 'agent', content: string): Inspection | undefined
  getPendingInspections(pageId?: string): Inspection[]
  getPageInspections(pageId: string): Inspection[]

  // ── Event ──
  getEventsSince(pageId: string, sequence: number): InspectoEvent[]
}
```

### 3.2 内存实现 `packages/core/src/store/memory-store.ts`

```typescript
import type { CreateInspectionInput, InspectoStore } from './types.js'
import type {
  Inspection,
  InspectoPage,
  PageWithInspections,
  InspectionStatus,
  InspectoEvent,
  InspectoEventType,
  InspectionMessage,
} from '@inspecto-dev/types'
import { generateId } from '../utils/id.js'
import { eventBus } from '../events/event-bus.js'

/**
 * 内存 Store — 与 dev server 共享生命周期，无需持久化。
 *
 * 设计选型说明：
 * - 不使用 SQLite：Inspections 的生命周期与 dev server 一致，重启后全部失效
 * - Map 结构 O(1) 查找，满足低频写入 + 高频读取场景
 */
export class MemoryStore implements InspectoStore {
  private pages = new Map<string, InspectoPage>()
  private inspections = new Map<string, Inspection>()
  private events: InspectoEvent[] = []
  private sequence = 0

  // ─── 内部工具 ───

  private now(): string {
    return new Date().toISOString()
  }

  private emit(type: InspectoEventType, pageId: string, payload: unknown): void {
    const event: InspectoEvent = {
      type,
      timestamp: this.now(),
      pageId,
      sequence: ++this.sequence,
      payload: payload as Inspection | InspectoPage | InspectionMessage,
    }
    this.events.push(event)
    eventBus.emit(type, event)
  }

  // ─── 状态转换校验 ───

  private static VALID_TRANSITIONS: Record<InspectionStatus, InspectionStatus[]> = {
    pending: ['in_progress', 'resolved', 'dismissed'],
    in_progress: ['needs_info', 'resolved', 'dismissed'],
    needs_info: ['in_progress', 'resolved', 'dismissed'],
    resolved: [], // 终态
    dismissed: [], // 终态
  }

  private canTransition(from: InspectionStatus, to: InspectionStatus): boolean {
    return MemoryStore.VALID_TRANSITIONS[from]?.includes(to) ?? false
  }

  // ─── Page ───

  createPage(url: string, projectRoot: string): InspectoPage {
    const page: InspectoPage = {
      id: generateId('page'),
      url,
      projectRoot,
      status: 'active',
      createdAt: this.now(),
    }
    this.pages.set(page.id, page)
    this.emit('page.created', page.id, page)
    return page
  }

  getPage(id: string): InspectoPage | undefined {
    return this.pages.get(id)
  }

  getPageByUrl(url: string): InspectoPage | undefined {
    for (const page of this.pages.values()) {
      if (page.url === url && page.status === 'active') return page
    }
    return undefined
  }

  getPageWithInspections(id: string): PageWithInspections | undefined {
    const page = this.pages.get(id)
    if (!page) return undefined
    return {
      ...page,
      inspections: this.getPageInspections(id),
    }
  }

  listPages(): InspectoPage[] {
    return Array.from(this.pages.values())
  }

  closePage(id: string): InspectoPage | undefined {
    const page = this.pages.get(id)
    if (!page) return undefined
    page.status = 'closed'
    page.updatedAt = this.now()
    this.emit('page.closed', id, page)
    return page
  }

  // ─── Inspection ───

  createInspection(pageId: string, data: CreateInspectionInput): Inspection | undefined {
    const page = this.pages.get(pageId)
    if (!page) return undefined

    const inspection: Inspection = {
      id: generateId('insp'),
      pageId,
      source: data.source,
      snippet: data.snippet,
      userInput: data.userInput,
      intent: data.intent,
      prompt: data.prompt,
      status: 'pending',
      messages: [],
      createdAt: this.now(),
    }
    this.inspections.set(inspection.id, inspection)
    this.emit('inspection.created', pageId, inspection)
    return inspection
  }

  getInspection(id: string): Inspection | undefined {
    return this.inspections.get(id)
  }

  /** 支持多条件筛选 */
  listInspections(filter?: {
    pageId?: string
    status?: InspectionStatus | InspectionStatus[]
  }): Inspection[] {
    let result = Array.from(this.inspections.values())

    if (filter?.pageId) {
      result = result.filter(i => i.pageId === filter.pageId)
    }

    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
      result = result.filter(i => statuses.includes(i.status))
    }

    return result
  }

  updateInspectionStatus(
    id: string,
    status: InspectionStatus,
    completedBy?: 'human' | 'agent',
  ): Inspection | undefined {
    const inspection = this.inspections.get(id)
    if (!inspection) return undefined
    if (!this.canTransition(inspection.status, status)) return undefined

    inspection.status = status
    inspection.updatedAt = this.now()

    if (status === 'resolved' || status === 'dismissed') {
      inspection.completedAt = this.now()
      inspection.completedBy = completedBy
    }

    this.emit('inspection.updated', inspection.pageId, inspection)
    return inspection
  }

  addMessage(
    inspectionId: string,
    role: 'human' | 'agent',
    content: string,
  ): Inspection | undefined {
    const inspection = this.inspections.get(inspectionId)
    if (!inspection) return undefined

    const message: InspectionMessage = {
      id: generateId('msg'),
      inspectionId, // 关联 inspectionId
      role,
      content,
      createdAt: this.now(),
    }
    inspection.messages.push(message)
    inspection.updatedAt = this.now()

    // ── 自动状态转换 ──
    // Agent 提问 → needs_info；用户回复 → in_progress
    if (role === 'agent' && inspection.status === 'in_progress') {
      // inspecto_reply 调用时，如果传 needsInfo=true 则由 handler 处理
      // 这里不自动转换，让 handler 控制
    }
    if (role === 'human' && inspection.status === 'needs_info') {
      // 用户回复后自动恢复 in_progress
      inspection.status = 'in_progress'
    }

    // 无论状态是否改变，只要有新消息，Inspection 自身的数据(messages/updatedAt)就变了
    // 统一派发更新事件，让前端可以无脑使用最新 payload 覆盖 UI
    this.emit('inspection.updated', inspection.pageId, inspection)
    this.emit('message.created', inspection.pageId, message)
    return inspection
  }

  getPendingInspections(pageId?: string): Inspection[] {
    const all = Array.from(this.inspections.values())
    return all.filter(i => i.status === 'pending' && (!pageId || i.pageId === pageId))
  }

  getPageInspections(pageId: string): Inspection[] {
    return Array.from(this.inspections.values()).filter(i => i.pageId === pageId)
  }

  // ─── Event ───

  getEventsSince(pageId: string, sequence: number): InspectoEvent[] {
    return this.events.filter(e => e.pageId === pageId && e.sequence > sequence)
  }
}
```

### 3.3 ID 生成器 `packages/core/src/utils/id.ts`

```typescript
/**
 * 生成 Inspecto 资源 ID
 * 格式: <prefix>_<timestamp36>-<random6>
 * 示例: insp_m5x2k-a8b3f1
 */
export function generateId(prefix: 'page' | 'insp' | 'msg'): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${timestamp}-${random}`
}
```

---

## 4. EventBus

### 4.1 实现 `packages/core/src/events/event-bus.ts`

```typescript
import type { InspectoEvent, InspectoEventType } from '@inspecto-dev/types'

type Listener = (event: InspectoEvent) => void

/**
 * EventBus — 进程内事件发布/订阅
 *
 * 支持两种订阅模式：
 * 1. 全局订阅：接收所有事件（用于 SSE /events 端点）
 * 2. 按类型订阅：接收特定类型的事件
 *
 * 因为 Inspecto 是单用户本地开发工具，所以不需要多租户隔离。
 */
class EventBus {
  private globalListeners = new Set<Listener>()
  private typedListeners = new Map<InspectoEventType, Set<Listener>>()

  /** 订阅所有事件 */
  onAll(listener: Listener): () => void {
    this.globalListeners.add(listener)
    return () => this.globalListeners.delete(listener)
  }

  /** 订阅特定类型事件 */
  on(type: InspectoEventType, listener: Listener): () => void {
    if (!this.typedListeners.has(type)) {
      this.typedListeners.set(type, new Set())
    }
    this.typedListeners.get(type)!.add(listener)
    return () => this.typedListeners.get(type)?.delete(listener)
  }

  /** 发布事件 */
  emit(type: InspectoEventType, event: InspectoEvent): void {
    for (const listener of this.globalListeners) {
      try {
        listener(event)
      } catch {}
    }
    const typed = this.typedListeners.get(type)
    if (typed) {
      for (const listener of typed) {
        try {
          listener(event)
        } catch {}
      }
    }
  }

  /** 清理所有监听器 */
  clear(): void {
    this.globalListeners.clear()
    this.typedListeners.clear()
  }
}

/** 单例 EventBus */
export const eventBus = new EventBus()
```

---

## 5. HTTP API

### 5.1 路由常量 — 扩展 `INSPECTO_API_PATHS`

```typescript
// packages/types/src/index.ts — 扩展 INSPECTO_API_PATHS

export const INSPECTO_API_PATHS = {
  // ── 现有路由（不变）──
  HEALTH: '/inspecto/api/v1/health',
  CLIENT_CONFIG: '/inspecto/api/v1/client/config',
  IDE_INFO: '/inspecto/api/v1/ide/info',
  IDE_OPEN: '/inspecto/api/v1/ide/open',
  PROJECT_SNIPPET: '/inspecto/api/v1/project/snippet',
  AI_DISPATCH: '/inspecto/api/v1/ai/dispatch',
  AI_TICKET: '/inspecto/api/v1/ai/ticket',

  // ── 新增：Inspection 管理 ──
  INSPECTIONS: '/inspecto/api/v1/inspections',
  INSPECTIONS_PENDING: '/inspecto/api/v1/inspections/pending',
  INSPECTION_BY_ID: '/inspecto/api/v1/inspections/:id',
  INSPECTION_MESSAGES: '/inspecto/api/v1/inspections/:id/messages',

  // ── 新增：Page 管理 ──
  PAGES: '/inspecto/api/v1/pages',
  PAGE_BY_ID: '/inspecto/api/v1/pages/:id',
  PAGE_INSPECTIONS: '/inspecto/api/v1/pages/:id/inspections',
  PAGE_PENDING: '/inspecto/api/v1/pages/:id/pending',

  // ── 新增：事件流 ──
  EVENTS: '/inspecto/api/v1/events',
  PAGE_EVENTS: '/inspecto/api/v1/pages/:id/events',
} as const
```

### 5.2 API 详情

#### `POST /inspecto/api/v1/inspections` — 创建检视

```typescript
// Request Body
interface CreateInspectionRequest {
  url: string // 页面 URL（自动创建/匹配 Page）
  source: SourceLocation // 编译时源码坐标
  snippet?: string // 代码片段
  userInput: string // 用户输入文本
  intent: InspectionIntent // Intent ID
  prompt: string // 完整 prompt
}

// Response: 201
interface CreateInspectionResponse {
  inspection: Inspection
  page: InspectoPage
}
```

**Handler 逻辑：**

1. 用 `url` 查找现有 active Page → 找不到则自动创建
2. 在该 Page 下创建 Inspection（status: `pending`）
3. Store 内部自动触发 `inspection.created` 事件
4. 返回 Inspection + Page

#### `GET /inspecto/api/v1/inspections` — 列出检视

```typescript
// Query: ?pageId=xxx&status=in_progress&status=needs_info
// Response: 200
Inspection[]
```

#### `GET /inspecto/api/v1/inspections/pending` — 获取所有 pending 检视

```typescript
// Query: ?pageId=xxx （可选）
// Response: 200
interface PendingInspectionsResponse {
  count: number
  inspections: Inspection[]
}
```

#### `GET /inspecto/api/v1/inspections/:id` — 获取单个检视详情

```typescript
// Response: 200 — 返回 Inspection（含完整 messages 数组）
// Response: 404 — Inspection 不存在
```

#### `PATCH /inspecto/api/v1/inspections/:id` — 更新检视状态

```typescript
// Request Body
interface UpdateInspectionRequest {
  status: InspectionStatus
  completedBy?: 'human' | 'agent'
}

// Response: 200 — 返回更新后的 Inspection
// Response: 400 — 非法状态转换
// Response: 404 — Inspection 不存在
```

**状态转换校验：**

```
合法转换:
  pending      → in_progress, resolved, dismissed
  in_progress  → needs_info, resolved, dismissed
  needs_info   → in_progress, resolved, dismissed
  resolved     → (终态，不可变)
  dismissed    → (终态，不可变)

自动转换（由 Store 内部触发）:
  needs_info + 用户发消息 → 自动恢复 in_progress
```

#### `POST /inspecto/api/v1/inspections/:id/messages` — 添加对话消息

```typescript
// Request Body
interface AddMessageRequest {
  role: 'human' | 'agent'
  content: string
}

// Response: 200 — 返回更新后的 Inspection（含新消息）
```

**行为变更说明：**

- 当 `role: 'human'` 且当前状态为 `needs_info` → Store 自动将状态恢复为 `in_progress`，并触发 `inspection.updated` 事件（这会唤醒正在阻塞的 `inspecto_watch`）

#### `GET /inspecto/api/v1/events` — SSE 事件流

```
GET /inspecto/api/v1/events
Accept: text/event-stream

data: {"type":"inspection.created","pageId":"page_abc","sequence":1,"payload":{...}}
data: {"type":"inspection.updated","pageId":"page_abc","sequence":2,"payload":{...}}
data: {"type":"message.created","pageId":"page_abc","sequence":3,"payload":{...}}
```

**实现要点：**

- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`
- 每 30s 发送 `: keepalive\n\n` 心跳
- 通过 `eventBus.onAll()` 订阅并转发

#### `GET /inspecto/api/v1/pages` — 列出所有 Page

```typescript
// Response: 200
InspectoPage[]
```

#### `GET /inspecto/api/v1/pages/:id` — 获取 Page 详情（含 Inspections）

```typescript
// Response: 200
PageWithInspections
```

#### `GET /inspecto/api/v1/pages/:id/pending` — 获取 Page 内 pending 检视

```typescript
// Response: 200
PendingInspectionsResponse
```

### 5.3 SSE 端点实现参考

```typescript
// packages/core/src/server/routes/events.ts

import { eventBus } from '../../events/event-bus.js'
import type { IncomingMessage, ServerResponse } from 'node:http'

export function handleSSE(_req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })

  // 心跳
  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n')
  }, 30_000)

  // 订阅所有事件
  const unsubscribe = eventBus.onAll(event => {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  })

  // 清理
  res.on('close', () => {
    clearInterval(heartbeat)
    unsubscribe()
  })
}
```

---

## 6. MCP Server & Tools

### 6.1 包结构

```
packages/mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # CLI 入口
│   ├── server.ts             # MCP Server 实例 + Tool 注册
│   ├── http-client.ts        # HTTP Client（连接 dev server）
│   └── tools/
│       ├── watch.ts          # [P0] 阻塞等待（监听新检视+用户回复）
│       ├── get-pending.ts    # [P0] 获取待处理
│       ├── get-inspection.ts # [P0] 获取单个检视详情
│       ├── start.ts          # [P0] 开始处理
│       ├── resolve.ts        # [P0] 标记完成
│       ├── dismiss.ts        # [P1] 标记驳回
│       ├── reply.ts          # [P1] 回复/提问（支持 needsInfo）
│       ├── list-inspections.ts # [P1] 列出检视
│       ├── list-pages.ts     # [P2] 列出 Page
│       └── get-page.ts       # [P2] 获取 Page 详情
```

### 6.2 CLI 入口 `packages/mcp/src/index.ts`

```typescript
#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { createMcpServer } from './server.js'

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '5678' },
    verbose: { type: 'boolean', default: false },
  },
})

const baseUrl = `http://127.0.0.1:${values.port}`

createMcpServer({ baseUrl, verbose: values.verbose ?? false })
```

### 6.3 HTTP Client `packages/mcp/src/http-client.ts`

```typescript
interface HttpClientOptions {
  baseUrl: string
  verbose?: boolean
}

export function createHttpClient({ baseUrl, verbose }: HttpClientOptions) {
  const log = verbose ? console.error.bind(console, '[inspecto-mcp]') : () => {}

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${baseUrl}${path}`
    log(`${method} ${url}`)

    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${text}`)
    }

    return res.json() as Promise<T>
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  }
}
```

### 6.4 MCP Server `packages/mcp/src/server.ts`

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createHttpClient } from './http-client.js'
import type {
  Inspection,
  InspectionMessage,
  PendingInspectionsResponse,
  InspectoPage,
  PageWithInspections,
  WatchResult,
} from '@inspecto-dev/types'

interface McpServerOptions {
  baseUrl: string
  verbose: boolean
}

export async function createMcpServer({ baseUrl, verbose }: McpServerOptions) {
  const http = createHttpClient({ baseUrl, verbose })
  const server = new Server({ name: 'inspecto', version: '0.1.0' }, { capabilities: { tools: {} } })

  // ── Tool 列表 ──
  server.setRequestHandler('tools/list', async () => ({
    tools: [
      // 10 个 Tool 定义，见下方 6.5 节
    ],
  }))

  // ── Tool 调用 ──
  server.setRequestHandler('tools/call', async request => {
    const { name, arguments: args } = request.params
    try {
      const result = await handleTool(name, args ?? {})
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }],
        isError: true,
      }
    }
  })

  // ── Tool Handler ──
  async function handleTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      // 各 Tool 的 handler 实现见 6.5 节
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  }

  // ── 启动 ──
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
```

### 6.5 Tool 定义与 Handler（10 个）

---

#### `inspecto_watch` [P0] — 阻塞等待检视和用户回复

> **核心机制**：同时监听 `inspection.created` 和 `message.created`（role=human），返回结构区分新检视和新回复。

```typescript
// ── Tool 定义 ──
{
  name: 'inspecto_watch',
  description:
    'Block and wait for new inspections OR user replies to your questions. ' +
    'Returns when either event occurs:\n' +
    '1. User inspects a new UI element → appears in newInspections[]\n' +
    '2. User replies to your question (after inspecto_reply) → appears in newReplies[]\n\n' +
    'Recommended loop:\n' +
    '1. Call inspecto_watch (blocks until activity)\n' +
    '2. For each newInspection: call inspecto_start → edit file → inspecto_resolve\n' +
    '3. For each newReply: call inspecto_get_inspection to read context → continue work\n' +
    '4. If you need clarification: call inspecto_reply with needsInfo=true\n' +
    '5. Loop back to step 1',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'string',
        description: 'Optional page ID to filter. Omit to watch all pages.',
      },
      batchWindowSeconds: {
        type: 'number',
        description: 'Seconds to collect more events after the first arrives (default: 5, max: 30)',
      },
      timeoutSeconds: {
        type: 'number',
        description: 'Max seconds to wait before returning empty (default: 120, max: 300)',
      },
    },
  },
}

// ── Handler ──
case 'inspecto_watch': {
  const {
    pageId,
    batchWindowSeconds = 5,
    timeoutSeconds = 120,
  } = args as {
    pageId?: string
    batchWindowSeconds?: number
    timeoutSeconds?: number
  }

  const batchWindow = Math.min(batchWindowSeconds, 30) * 1000
  const timeout = Math.min(timeoutSeconds, 300) * 1000

  // 先检查是否已有 pending
  const existing = await http.get<PendingInspectionsResponse>(
    pageId
      ? `/inspecto/api/v1/pages/${pageId}/pending`
      : '/inspecto/api/v1/inspections/pending',
  )
  if (existing.count > 0) {
    return {
      timeout: false,
      newInspections: existing.inspections,
      newReplies: [],
    } satisfies WatchResult
  }

  // SSE 订阅等待新的 inspection 或用户回复
  return new Promise<WatchResult>((resolve) => {
    const newInspections: Inspection[] = []
    const newReplies: { inspectionId: string; message: InspectionMessage }[] = []
    let batchTimer: NodeJS.Timeout | null = null
    let settled = false

    function finish() {
      if (settled) return
      settled = true
      controller.abort()
      clearTimeout(timeoutTimer)
      if (batchTimer) clearTimeout(batchTimer)
      resolve({
        timeout: newInspections.length === 0 && newReplies.length === 0,
        newInspections,
        newReplies,
      })
    }

    function startBatchWindow() {
      if (!batchTimer) {
        batchTimer = setTimeout(finish, batchWindow)
      }
    }

    // 总超时
    const timeoutTimer = setTimeout(finish, timeout)

    // SSE 连接
    const controller = new AbortController()
    const eventUrl = pageId
      ? `${baseUrl}/inspecto/api/v1/pages/${pageId}/events`
      : `${baseUrl}/inspecto/api/v1/events`

    fetch(eventUrl, {
      signal: controller.signal,
      headers: { Accept: 'text/event-stream' },
    }).then(async (res) => {
      if (!res.ok || !res.body) { finish(); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (!settled) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            // ── 监听两种事件 ──
            if (event.type === 'inspection.created') {
              newInspections.push(event.payload as Inspection)
              startBatchWindow()
            }
            else if (event.type === 'message.created') {
              const msg = event.payload as InspectionMessage
              if (msg.role === 'human') {
                newReplies.push({
                  inspectionId: msg.inspectionId,
                  message: msg,
                })
                startBatchWindow()
              }
            }
          } catch {}
        }
      }
    }).catch(() => {
      if (!settled) finish()
    })
  })
}
```

**返回格式示例（新检视）：**

```json
{
  "timeout": false,
  "newInspections": [
    {
      "id": "insp_m5x2k-a8b3f",
      "source": {
        "file": "src/components/Sidebar.tsx",
        "line": 42,
        "column": 8,
        "name": "Button"
      },
      "snippet": "<Button variant=\"primary\" onClick={handleSubmit}>\n  Submit\n</Button>",
      "userInput": "把这个按钮颜色改成蓝色",
      "intent": "fix-styles",
      "status": "pending",
      "messages": [],
      "pageId": "page_m5x1k-b3c8f2",
      "createdAt": "2026-04-01T07:30:00.000Z"
    }
  ],
  "newReplies": []
}
```

**返回格式示例（用户回复）：**

```json
{
  "timeout": false,
  "newInspections": [],
  "newReplies": [
    {
      "inspectionId": "insp_m5x2k-a8b3f",
      "message": {
        "id": "msg_m5x4k-f1a2b3",
        "inspectionId": "insp_m5x2k-a8b3f",
        "role": "human",
        "content": "不是深蓝色，是天蓝色 sky-500",
        "createdAt": "2026-04-01T07:32:00.000Z"
      }
    }
  ]
}
```

---

#### `inspecto_get_pending` [P0] — 获取待处理检视

```typescript
// ── Tool 定义 ──
{
  name: 'inspecto_get_pending',
  description:
    'Get all pending inspections that need attention. ' +
    'Each inspection includes the exact source file path, line, and column ' +
    'from compile-time injection — open and edit the file directly, no searching needed.',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'string',
        description: 'Optional page ID. Omit to get pending from all pages.',
      },
    },
  },
}

// ── Handler ──
case 'inspecto_get_pending': {
  const { pageId } = args as { pageId?: string }
  return http.get<PendingInspectionsResponse>(
    pageId
      ? `/inspecto/api/v1/pages/${pageId}/pending`
      : '/inspecto/api/v1/inspections/pending',
  )
}
```

---

#### `inspecto_get_inspection` [P0] — 获取单个检视详情

```typescript
// ── Tool 定义 ──
{
  name: 'inspecto_get_inspection',
  description:
    'Get a single inspection with its full conversation thread. ' +
    'Use this after inspecto_watch returns a newReply to read the complete context ' +
    '(all messages, source location, current status) before continuing your work.',
  inputSchema: {
    type: 'object',
    properties: {
      inspectionId: { type: 'string', description: 'Inspection ID' },
    },
    required: ['inspectionId'],
  },
}

// ── Handler ──
case 'inspecto_get_inspection': {
  const { inspectionId } = args as { inspectionId: string }
  return http.get<Inspection>(`/inspecto/api/v1/inspections/${inspectionId}`)
}
```

---

#### `inspecto_start` [P0] — 开始处理

```typescript
// ── Tool 定义 ──
{
  name: 'inspecto_start',
  description:
    'Signal that you\'re working on an inspection. ' +
    'The user\'s browser shows a spinning indicator on the inspected element.',
  inputSchema: {
    type: 'object',
    properties: {
      inspectionId: { type: 'string', description: 'Inspection ID' },
    },
    required: ['inspectionId'],
  },
}

// ── Handler ──
case 'inspecto_start': {
  const { inspectionId } = args as { inspectionId: string }
  const inspection = await http.patch<Inspection>(
    `/inspecto/api/v1/inspections/${inspectionId}`,
    { status: 'in_progress' },
  )
  return { started: true, inspectionId, inspection }
}
```

---

#### `inspecto_resolve` [P0] — 标记完成

```typescript
// ── Tool 定义 ──
{
  name: 'inspecto_resolve',
  description:
    'Mark an inspection as resolved after making the code change. ' +
    'Include a summary of what you changed. ' +
    'The browser shows a green checkmark on the element.',
  inputSchema: {
    type: 'object',
    properties: {
      inspectionId: { type: 'string', description: 'Inspection ID' },
      summary: { type: 'string', description: 'Brief description of the change' },
    },
    required: ['inspectionId'],
  },
}

// ── Handler ──
case 'inspecto_resolve': {
  const { inspectionId, summary } = args as { inspectionId: string; summary?: string }
  const inspection = await http.patch<Inspection>(
    `/inspecto/api/v1/inspections/${inspectionId}`,
    { status: 'resolved', completedBy: 'agent' },
  )
  if (summary) {
    await http.post(`/inspecto/api/v1/inspections/${inspectionId}/messages`, {
      role: 'agent',
      content: summary,
    })
  }
  return { resolved: true, inspectionId, summary }
}
```

---

#### `inspecto_dismiss` [P1] — 标记驳回

```typescript
// ── Tool 定义 ──
{
  name: 'inspecto_dismiss',
  description:
    'Dismiss an inspection when the feedback cannot or should not be addressed.',
  inputSchema: {
    type: 'object',
    properties: {
      inspectionId: { type: 'string', description: 'Inspection ID' },
      reason: { type: 'string', description: 'Reason for dismissing' },
    },
    required: ['inspectionId', 'reason'],
  },
}

// ── Handler ──
case 'inspecto_dismiss': {
  const { inspectionId, reason } = args as { inspectionId: string; reason: string }
  await http.patch<Inspection>(
    `/inspecto/api/v1/inspections/${inspectionId}`,
    { status: 'dismissed', completedBy: 'agent' },
  )
  await http.post(`/inspecto/api/v1/inspections/${inspectionId}/messages`, {
    role: 'agent',
    content: `Dismissed: ${reason}`,
  })
  return { dismissed: true, inspectionId, reason }
}
```

---

#### `inspecto_reply` [P1] — 回复/提问

> **行为说明**：通过 `needsInfo` 参数，当 Agent 提问时自动将状态转为 `needs_info`，从而等待用户回复。

```typescript
// ── Tool 定义 ──
{
  name: 'inspecto_reply',
  description:
    'Reply to an inspection to ask a clarifying question or give a status update.\n' +
    'Set needsInfo=true when asking a question — this changes the status to needs_info,\n' +
    'shows an orange pulsing indicator in the browser, and prompts the user to reply.\n' +
    'When the user replies, inspecto_watch will wake up with the response in newReplies[].',
  inputSchema: {
    type: 'object',
    properties: {
      inspectionId: { type: 'string', description: 'Inspection ID' },
      message: { type: 'string', description: 'Your reply or question' },
      needsInfo: {
        type: 'boolean',
        description: 'Set true when asking a question. Changes status to needs_info and shows input prompt in browser. (default: false)',
      },
    },
    required: ['inspectionId', 'message'],
  },
}

// ── Handler ──
case 'inspecto_reply': {
  const { inspectionId, message, needsInfo = false } = args as {
    inspectionId: string
    message: string
    needsInfo?: boolean
  }

  // 发送消息
  await http.post(`/inspecto/api/v1/inspections/${inspectionId}/messages`, {
    role: 'agent',
    content: message,
  })

  // 如果是提问，切换到 needs_info 状态
  if (needsInfo) {
    await http.patch(`/inspecto/api/v1/inspections/${inspectionId}`, {
      status: 'needs_info',
    })
  }

  return { replied: true, inspectionId, message, needsInfo }
}
```

---

#### `inspecto_list_inspections` [P1] — 列出检视

```typescript
// ── Tool 定义 ──
{
  name: 'inspecto_list_inspections',
  description:
    'List inspections with optional filters.\n' +
    'Use this to get an overview of all work — not just pending.\n' +
    'Useful for reviewing in_progress or needs_info items you may have lost track of.',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'string',
        description: 'Optional page ID to filter.',
      },
      status: {
        oneOf: [
          { type: 'string', enum: ['pending', 'in_progress', 'needs_info', 'resolved', 'dismissed'] },
          {
            type: 'array',
            items: { type: 'string', enum: ['pending', 'in_progress', 'needs_info', 'resolved', 'dismissed'] },
          },
        ],
        description: 'Filter by status. Pass a single status or an array. Omit for all.',
      },
    },
  },
}

// ── Handler ──
case 'inspecto_list_inspections': {
  const { pageId, status } = args as {
    pageId?: string
    status?: string | string[]
  }
  const params = new URLSearchParams()
  if (pageId) params.set('pageId', pageId)
  if (status) {
    const statuses = Array.isArray(status) ? status : [status]
    statuses.forEach((s) => params.append('status', s))
  }
  const query = params.toString()
  return http.get<Inspection[]>(
    `/inspecto/api/v1/inspections${query ? `?${query}` : ''}`,
  )
}
```

---

#### `inspecto_list_pages` [P2] — 列出 Page

```typescript
// ── Tool 定义 ──
{
  name: 'inspecto_list_pages',
  description: 'List all active pages. Each page corresponds to a browser tab URL.',
  inputSchema: { type: 'object', properties: {} },
}

// ── Handler ──
case 'inspecto_list_pages': {
  return http.get<InspectoPage[]>('/inspecto/api/v1/pages')
}
```

---

#### `inspecto_get_page` [P2] — 获取 Page 详情

```typescript
// ── Tool 定义 ──
{
  name: 'inspecto_get_page',
  description: 'Get a page with all its inspections.',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: { type: 'string', description: 'Page ID' },
    },
    required: ['pageId'],
  },
}

// ── Handler ──
case 'inspecto_get_page': {
  const { pageId } = args as { pageId: string }
  return http.get<PageWithInspections>(`/inspecto/api/v1/pages/${pageId}`)
}
```

---

### 6.6 MCP Tool 总览（10 个）

| #   | Tool                        | 优先级 | HTTP 路由                                        | 说明                          |
| --- | --------------------------- | ------ | ------------------------------------------------ | ----------------------------- |
| 1   | `inspecto_watch`            | P0     | `GET /events` (SSE) + `GET /inspections/pending` | 阻塞等待新检视 **和用户回复** |
| 2   | `inspecto_get_pending`      | P0     | `GET /inspections/pending`                       | 获取待处理检视                |
| 3   | `inspecto_get_inspection`   | P0     | `GET /inspections/:id`                           | **获取单个检视含完整对话**    |
| 4   | `inspecto_start`            | P0     | `PATCH /inspections/:id` → `in_progress`         | 开始处理                      |
| 5   | `inspecto_resolve`          | P0     | `PATCH /inspections/:id` → `resolved`            | 标记完成                      |
| 6   | `inspecto_dismiss`          | P1     | `PATCH /inspections/:id` → `dismissed`           | 标记驳回                      |
| 7   | `inspecto_reply`            | P1     | `POST /inspections/:id/messages` + `PATCH`       | 回复/提问 **支持 needsInfo**  |
| 8   | `inspecto_list_inspections` | P1     | `GET /inspections`                               | **多条件筛选检视列表**        |
| 9   | `inspecto_list_pages`       | P2     | `GET /pages`                                     | 列出 Page                     |
| 10  | `inspecto_get_page`         | P2     | `GET /pages/:id`                                 | 获取 Page 详情                |

---

## 7. 浏览器端变更

### 7.1 `menu.ts` — Inspection 创建集成点

在 `handleSend` 中增加 `createInspection` 调用（fire-and-forget）：

```typescript
// packages/core/src/menu.ts — handleSend 函数

const handleSend = async (promptText, snippetText, disable, restore) => {
  disable()
  await openFile(location)
  await new Promise(r => setTimeout(r, 100))

  const result = await sendToAi({ location, snippet: snippetText, prompt: promptText })

  if (result.success) {
    // ── 新增：创建 Inspection（fire-and-forget） ──
    createInspection({
      url: window.location.href,
      source: location,
      snippet: snippetText || undefined,
      userInput: currentInputValue || currentIntentLabel,
      intent: (currentIntentId as InspectionIntent) || 'ask',
      prompt: promptText,
    }).catch(() => {}) // 静默失败，不影响现有 sendToAi 流程

    if (result.fallbackPayload?.prompt) {
      try {
        await navigator.clipboard.writeText(result.fallbackPayload.prompt)
      } catch {}
    }
    cleanup()
  } else {
    restore()
    showError(menu, result.error ?? 'Unknown error', result.errorCode)
  }
}
```

同理在 `submitAsk`（AI Menu input 提交）中也触发 `createInspection`，`intent: 'ask'`。

### 7.2 `http.ts` — 新增 API 函数

```typescript
// packages/core/src/http.ts — 新增

import type {
  Inspection,
  InspectoPage,
  InspectoEvent,
  CreateInspectionRequest,
  CreateInspectionResponse,
  AddMessageRequest,
} from '@inspecto-dev/types'

export async function createInspection(
  req: CreateInspectionRequest,
): Promise<CreateInspectionResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/inspecto/api/v1/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/** 用户在 Thread Panel 中回复 Agent */
export async function replyToInspection(
  inspectionId: string,
  content: string,
): Promise<Inspection | null> {
  try {
    const res = await fetch(`${BASE_URL}/inspecto/api/v1/inspections/${inspectionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'human', content } satisfies AddMessageRequest),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export function subscribeEvents(onEvent: (event: InspectoEvent) => void): () => void {
  const controller = new AbortController()

  fetch(`${BASE_URL}/inspecto/api/v1/events`, {
    signal: controller.signal,
    headers: { Accept: 'text/event-stream' },
  })
    .then(async res => {
      if (!res.ok || !res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              onEvent(JSON.parse(line.slice(6)))
            } catch {}
          }
        }
      }
    })
    .catch(() => {})

  return () => controller.abort()
}
```

### 7.3 `component.ts` — 状态指示器 + Thread Panel

> **交互机制**：指示器为可交互面板。点击指示器展开 Thread Panel，包含对话历史和回复输入框。

```typescript
// packages/core/src/component.ts — 新增部分

import { subscribeEvents, replyToInspection } from './http.js'
import type {
  InspectoEvent,
  Inspection,
  InspectionMessage,
  InspectionStatus,
} from '@inspecto-dev/types'

// ─── 状态指示器样式 ───

const STATUS_INDICATORS: Record<
  InspectionStatus,
  {
    color: string
    animation: string
    icon: string
    label: string
  }
> = {
  pending: {
    color: '#EAB308',
    animation: 'pulse 1.5s ease-in-out infinite',
    icon: '●',
    label: 'Waiting for AI...',
  },
  in_progress: {
    color: '#3B82F6',
    animation: 'spin 1s linear infinite',
    icon: '●',
    label: 'AI is working...',
  },
  needs_info: {
    color: '#F97316',
    animation: 'pulse 0.8s ease-in-out infinite',
    icon: '?',
    label: 'AI needs your input',
  },
  resolved: {
    color: '#22C55E',
    animation: 'fadeOut 2s ease-out forwards',
    icon: '✓',
    label: 'Done',
  },
  dismissed: {
    color: '#9CA3AF',
    animation: 'fadeOut 2s ease-out forwards',
    icon: '✕',
    label: 'Dismissed',
  },
}

// ─── 元素定位 ───

function findElementBySource(source: {
  file: string
  line: number
  column: number
}): Element | null {
  const attrValue = `${source.file}:${source.line}:${source.column}`
  return document.querySelector(`[data-inspecto="${attrValue}"]`)
}

// ─── Thread Panel ───
//
// Thread Panel 是一个可展开的气泡面板，固定在指示器旁：
//
//  ┌───────────────────────────────┐
//  │  Fix Styles · Sidebar.tsx:42  │  ← 标题栏
//  ├───────────────────────────────┤
//  │  👤 把这个按钮颜色改成蓝色    │  ← 用户原始输入
//  │  🤖 你想要哪种蓝色？深蓝还是  │  ← Agent 回复
//  │     天蓝？                    │
//  │  👤 天蓝色 sky-500            │  ← 用户回复
//  │  🤖 ✅ Changed to bg-sky-500  │  ← Agent 完成
//  ├───────────────────────────────┤
//  │  [ 输入回复...        ] [⏎]  │  ← 回复输入框（needs_info 时高亮）
//  └───────────────────────────────┘
//

interface ThreadPanelState {
  inspection: Inspection
  element: HTMLElement
  panel: HTMLElement | null
  indicator: HTMLElement
}

class InspectionOverlayManager {
  private active = new Map<string, ThreadPanelState>()

  /** 显示/更新指示器 */
  showIndicator(inspection: Inspection): void {
    const el = findElementBySource(inspection.source)
    if (!el) return

    let state = this.active.get(inspection.id)

    if (!state) {
      // 创建指示器
      const indicator = document.createElement('div')
      indicator.className = 'inspecto-indicator'
      indicator.dataset.inspectionId = inspection.id
      indicator.addEventListener('click', () => this.togglePanel(inspection.id))
      document.body.appendChild(indicator)

      state = { inspection, element: el as HTMLElement, panel: null, indicator }
      this.active.set(inspection.id, state)
    }

    // 更新状态
    state.inspection = inspection
    const config = STATUS_INDICATORS[inspection.status]
    const rect = (el as HTMLElement).getBoundingClientRect()

    Object.assign(state.indicator.style, {
      position: 'fixed',
      left: `${rect.right + 4}px`,
      top: `${rect.top - 4}px`,
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: config.color,
      color: 'white',
      fontSize: '12px',
      lineHeight: '20px',
      textAlign: 'center',
      cursor: 'pointer',
      zIndex: '99999',
      animation: config.animation,
      boxShadow: `0 0 0 2px white, 0 0 0 3px ${config.color}40`,
    })
    state.indicator.textContent = config.icon
    state.indicator.title = config.label

    // needs_info 时添加额外视觉提示
    if (inspection.status === 'needs_info') {
      state.indicator.style.boxShadow = `0 0 0 2px white, 0 0 8px ${config.color}`
    }

    // 终态时 2s 后移除
    if (inspection.status === 'resolved' || inspection.status === 'dismissed') {
      setTimeout(() => this.remove(inspection.id), 2000)
    }

    // 更新已打开的 Panel
    if (state.panel) {
      this.renderPanelContent(state)
    }
  }

  /** 切换 Thread Panel 显示 */
  togglePanel(inspectionId: string): void {
    const state = this.active.get(inspectionId)
    if (!state) return

    if (state.panel) {
      state.panel.remove()
      state.panel = null
      return
    }

    const panel = document.createElement('div')
    panel.className = 'inspecto-thread-panel'
    Object.assign(panel.style, {
      position: 'fixed',
      width: '320px',
      maxHeight: '400px',
      backgroundColor: '#1a1a2e',
      border: '1px solid #333',
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      zIndex: '100000',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '13px',
      color: '#e0e0e0',
    })

    // 定位在指示器旁
    const rect = state.indicator.getBoundingClientRect()
    panel.style.left = `${rect.right + 8}px`
    panel.style.top = `${Math.max(8, rect.top - 100)}px`

    document.body.appendChild(panel)
    state.panel = panel
    this.renderPanelContent(state)
  }

  /** 渲染 Panel 内容 */
  private renderPanelContent(state: ThreadPanelState): void {
    if (!state.panel) return
    const { inspection } = state
    const config = STATUS_INDICATORS[inspection.status]

    state.panel.innerHTML = ''

    // ── 标题栏 ──
    const header = document.createElement('div')
    Object.assign(header.style, {
      padding: '10px 12px',
      borderBottom: '1px solid #333',
      fontWeight: '600',
      fontSize: '12px',
      color: config.color,
    })
    header.textContent = `${inspection.intent} · ${inspection.source.file}:${inspection.source.line}`
    state.panel.appendChild(header)

    // ── 消息列表 ──
    const messagesContainer = document.createElement('div')
    Object.assign(messagesContainer.style, {
      flex: '1',
      overflowY: 'auto',
      padding: '8px 12px',
    })

    // 首条：用户原始输入
    this.appendMessage(messagesContainer, 'human', inspection.userInput, true)

    // 对话线程
    for (const msg of inspection.messages) {
      this.appendMessage(messagesContainer, msg.role, msg.content)
    }

    state.panel.appendChild(messagesContainer)
    messagesContainer.scrollTop = messagesContainer.scrollHeight

    // ── 回复输入框（非终态时显示） ──
    if (inspection.status !== 'resolved' && inspection.status !== 'dismissed') {
      const inputRow = document.createElement('div')
      Object.assign(inputRow.style, {
        display: 'flex',
        padding: '8px',
        borderTop: '1px solid #333',
        gap: '6px',
      })

      const input = document.createElement('input')
      Object.assign(input.style, {
        flex: '1',
        backgroundColor: '#2a2a3e',
        border: inspection.status === 'needs_info' ? '1px solid #F97316' : '1px solid #444',
        borderRadius: '4px',
        padding: '6px 10px',
        color: '#e0e0e0',
        fontSize: '13px',
        outline: 'none',
      })
      input.placeholder =
        inspection.status === 'needs_info' ? 'AI is waiting for your reply...' : 'Reply to AI...'

      // needs_info 时自动聚焦
      if (inspection.status === 'needs_info') {
        setTimeout(() => input.focus(), 100)
      }

      const sendBtn = document.createElement('button')
      Object.assign(sendBtn.style, {
        backgroundColor: '#3B82F6',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '6px 10px',
        cursor: 'pointer',
        fontSize: '13px',
      })
      sendBtn.textContent = '⏎'

      const doSend = async () => {
        const text = input.value.trim()
        if (!text) return
        input.value = ''
        input.disabled = true
        sendBtn.disabled = true
        await replyToInspection(inspection.id, text)
        input.disabled = false
        sendBtn.disabled = false
        // Panel 会通过 SSE 事件自动刷新
      }

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          doSend()
        }
      })
      sendBtn.addEventListener('click', doSend)

      inputRow.appendChild(input)
      inputRow.appendChild(sendBtn)
      state.panel.appendChild(inputRow)
    }
  }

  /** 渲染单条消息 */
  private appendMessage(
    container: HTMLElement,
    role: 'human' | 'agent',
    content: string,
    isOriginal = false,
  ): void {
    const row = document.createElement('div')
    Object.assign(row.style, {
      padding: '4px 0',
      display: 'flex',
      gap: '6px',
      alignItems: 'flex-start',
    })

    const icon = document.createElement('span')
    icon.style.flexShrink = '0'
    icon.textContent = role === 'human' ? '👤' : '🤖'

    const text = document.createElement('span')
    text.style.opacity = isOriginal ? '0.7' : '1'
    text.style.lineHeight = '1.4'
    text.textContent = content

    row.appendChild(icon)
    row.appendChild(text)
    container.appendChild(row)
  }

  /** 移除指示器和 Panel */
  remove(inspectionId: string): void {
    const state = this.active.get(inspectionId)
    if (!state) return
    state.indicator.remove()
    state.panel?.remove()
    this.active.delete(inspectionId)
  }
}

// ── 在 InspectoElement connectedCallback 中初始化 ──
//
// const overlayManager = new InspectionOverlayManager()
//
// this.unsubscribeEvents = subscribeEvents((event) => {
//   if (event.type === 'inspection.created' || event.type === 'inspection.updated') {
//     overlayManager.showIndicator(event.payload as Inspection)
//   }
//   if (event.type === 'message.created') {
//     const msg = event.payload as InspectionMessage
//     // 刷新对应 Inspection 的 Panel
//     // 需要通过 inspectionId 获取最新 Inspection 来更新
//     if (msg.role === 'agent') {
//       showToast(msg.content, 3000) // 同时保留 Toast 通知
//     }
//   }
// })
```

**状态指示器对应表：**

| 状态          | 视觉                     | 可交互                             | 说明                       |
| ------------- | ------------------------ | ---------------------------------- | -------------------------- |
| `pending`     | 🟡 黄色脉冲点            | 点击可展开 Panel                   | 刚创建，等待 Agent         |
| `in_progress` | 🔵 蓝色旋转点            | 点击可展开 Panel                   | Agent 正在处理             |
| `needs_info`  | 🟠 橙色脉冲点 + 光晕     | 点击展开 Panel，**输入框自动聚焦** | **Agent 在等你回复**       |
| `resolved`    | ✅ 绿勾（2s 淡出）       | 点击可查看对话历史                 | Agent 已完成               |
| `dismissed`   | ⚪ 灰叉（2s 淡出）       | 点击可查看原因                     | Agent 已驳回               |
| Agent reply   | 💬 Toast 通知（3s 淡出） | —                                  | Agent 发来消息（始终显示） |

---

## 8. MCP 配置集成

### 8.1 CLI `init` 自动配置

```json
// .mcp.json（项目级，由 npx @inspecto-dev/cli init 生成）
{
  "mcpServers": {
    "inspecto": {
      "command": "npx",
      "args": ["@inspecto-dev/mcp@latest", "--port", "5678"]
    }
  }
}
```

### 8.2 MCP CLI 参数

```bash
npx @inspecto-dev/mcp --port 5678          # 默认
npx @inspecto-dev/mcp --port 5679          # 自定义端口
npx @inspecto-dev/mcp --port 5678 --verbose # 调试模式
```

`--port` 而非 `--http-url`，因为 MCP 连接的永远是本地 HTTP Server，只需端口号。内部拼接为 `http://127.0.0.1:${port}`。

### 8.3 `package.json` 配置

```json
{
  "name": "@inspecto-dev/mcp",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "inspecto-mcp": "./dist/index.js"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@inspecto-dev/types": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.5.0"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "dev": "tsup src/index.ts --format esm --watch"
  }
}
```

---

## 9. Hands-Free 工作流（含双向对话）

### 9.1 基础流程：Agent 直接完成

```
> Claude: 正在监听浏览器中的 UI 检视...

[调用 inspecto_watch, 阻塞]

# 用户 Alt+Click 按钮 → 输入 "改成蓝色" → 选择 Fix Styles

[inspecto_watch 返回:]
{
  "timeout": false,
  "newInspections": [{ "id": "insp_001", "intent": "fix-styles", ... }],
  "newReplies": []
}

> Claude: 收到！正在处理 src/components/Sidebar.tsx:42 ...

[调用 inspecto_start("insp_001")]           → 浏览器 🟡→🔵
[修改文件]
[调用 inspecto_resolve("insp_001", "Changed to bg-blue-500")]  → 浏览器 🔵→✅

> Claude: ✅ 已完成。继续监听...
[再次调用 inspecto_watch]
```

### 9.2 双向对话流程：Agent 需要澄清

```
> Claude: 正在监听...

[调用 inspecto_watch, 阻塞]

# 用户 Alt+Click 按钮 → 输入 "改颜色" → Fix Styles

[inspecto_watch 返回:]
{
  "newInspections": [{ "id": "insp_002", "userInput": "改颜色", ... }],
  "newReplies": []
}

> Claude: 用户说"改颜色"但没指定颜色，我需要问清楚。

[调用 inspecto_start("insp_002")]           → 浏览器 🟡→🔵
[调用 inspecto_reply("insp_002",
  "你想改成什么颜色？比如蓝色、红色？",
  needsInfo=true)]                           → 浏览器 🔵→🟠
                                               Thread Panel 自动弹出，输入框高亮

> Claude: 等待用户回复...
[调用 inspecto_watch, 阻塞]

# 用户在 Thread Panel 输入 "天蓝色 sky-500" → 回车
# → POST /inspections/insp_002/messages { role: 'human', content: '天蓝色 sky-500' }
# → Store 自动 needs_info → in_progress
# → SSE 触发 message.created + inspection.updated

[inspecto_watch 返回:]
{
  "newInspections": [],
  "newReplies": [{
    "inspectionId": "insp_002",
    "message": { "role": "human", "content": "天蓝色 sky-500" }
  }]
}

> Claude: 用户说天蓝色 sky-500，让我读一下完整上下文...

[调用 inspecto_get_inspection("insp_002")]   → 获取含完整 messages 的 Inspection
[修改文件: bg-sky-500]
[调用 inspecto_resolve("insp_002", "Changed to bg-sky-500")]  → 浏览器 🟠→✅

> Claude: ✅ 已完成。继续监听...
[再次调用 inspecto_watch]
```

### 9.3 用户浏览器视角（双向对话场景）

```
1. Alt+Click 按钮 → AI Menu → 输入 "改颜色" → Fix Styles
2. AI Menu 关闭 → 按钮旁出现 🟡（pending）
3. Agent inspecto_start → 🟡 变 🔵（in_progress）
4. Agent inspecto_reply(needsInfo=true) → 🔵 变 🟠（needs_info）
5. Thread Panel 自动弹出:
   ┌───────────────────────────┐
   │  fix-styles · Button:42   │
   ├───────────────────────────┤
   │  👤 改颜色                │
   │  🤖 你想改成什么颜色？     │
   ├───────────────────────────┤
   │  [天蓝色 sky-500    ] [⏎]│  ← 输入框高亮，自动聚焦
   └───────────────────────────┘
6. 用户输入 "天蓝色 sky-500" → 回车
7. 🟠 变 🔵（in_progress，自动恢复）
8. Agent 修改代码 → inspecto_resolve → 🔵 变 ✅（resolved）
9. Toast: "Changed to bg-sky-500"
10. HMR → 按钮变天蓝
```

### 9.4 完整时序图

```
User Browser          HTTP Server (Dev Server)         MCP Server (stdio)         AI Agent
     │                        │                              │                        │
     │  Alt+Click + "改颜色"  │                              │                        │
     ├───── POST /inspections ─►                             │                        │
     │                        ├── SSE: inspection.created ──►│                        │
     │                        │                              ├─ inspecto_watch return ►│
     │                        │                              │                        │
     │                        │◄── PATCH status:in_progress ─┤◄── inspecto_start ─────┤
     │  🟡→🔵                 │                              │                        │
     │                        │                              │                        │
     │                        │◄── POST message(agent) ──────┤◄── inspecto_reply ─────┤
     │                        │◄── PATCH status:needs_info ──┤    (needsInfo=true)    │
     │  🔵→🟠                 │                              │                        │
     │  Panel 弹出             │                              ├─ inspecto_watch(block) ►│
     │                        │                              │                        │
     │  用户输入 "sky-500"     │                              │                        │
     ├── POST message(human) ─►                              │                        │
     │                        │  [Store: needs_info→in_progress]                      │
     │  🟠→🔵                 │── SSE: message.created ─────►│                        │
     │                        │── SSE: inspection.updated ──►│                        │
     │                        │                              ├─ inspecto_watch return ►│
     │                        │                              │                        │
     │                        │                              │◄─ inspecto_get_inspection│
     │                        │◄── GET /inspections/002 ─────┤   (读取完整上下文)      │
     │                        ├── Inspection + messages ─────►                        │
     │                        │                              │                        │
     │                        │                              │   [修改文件 bg-sky-500]  │
     │                        │                              │                        │
     │                        │◄── PATCH status:resolved ────┤◄── inspecto_resolve ───┤
     │  🔵→✅ + Toast          │                              │                        │
     │  HMR → UI 更新          │                              │                        │
```

---

## 10. 完整术语清单

| Inspecto 命名                                         | 对应概念 / 理由                                             |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| **Inspection**                                        | 一次用户操作（核心动作是 inspect）                          |
| **pending/in_progress/needs_info/resolved/dismissed** | 操作状态；in_progress 表示正在处理；needs_info 支持双向对话 |
| **Page**                                              | 页面上下文，更直观：一个浏览器页面                          |
| **Message** (InspectionMessage)                       | 对话消息，简洁，thread 在 Inspection.messages 中隐含        |
| **completedAt/completedBy**                           | 解决字段，覆盖 resolved 和 dismissed 两种完成状态           |
| **inspecto_start**                                    | MCP "开始处理"                                              |
| **inspecto_watch**                                    | MCP "监听"；同时监听新检视与回复                            |
| **inspecto_reply(needsInfo)**                         | MCP "提问"，支持双向对话能力                                |
| **inspecto_get_inspection**                           | MCP "读上下文"，读取完整对话线程                            |
| **inspecto_list_inspections**                         | MCP "筛选列表"，多状态筛选                                  |
| **/inspections, /pages**                              | HTTP 路由                                                   |
| **insp*, page*, msg\_**                               | ID 前缀                                                     |
| **inspection.created**                                | 事件类型                                                    |
| **userInput**                                         | 用户输入，更精确：不是简单的评论，而是用户对 AI 的输入      |
| **--port**                                            | CLI 参数，永远是 localhost，只需端口号                      |
| **Thread Panel**                                      | 浏览器回复 UI，点击指示器展开对话面板                       |

---

## 11. ID 命名规范

| 实体       | ID 前缀 | 格式                           | 示例                |
| ---------- | ------- | ------------------------------ | ------------------- |
| Page       | `page_` | `page_<timestamp36>-<random6>` | `page_m5x1k-b3c8f2` |
| Inspection | `insp_` | `insp_<timestamp36>-<random6>` | `insp_m5x2k-a8b3f1` |
| Message    | `msg_`  | `msg_<timestamp36>-<random6>`  | `msg_m5x3k-d9e2f3`  |

---

## 12. 实现计划

| Step     | 任务                                                                                     | 改动范围                                         | 预估   |
| -------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------ | ------ |
| 1        | 类型：`Inspection`, `InspectoPage`, `InspectoEvent`, Request/Response, `WatchResult`     | `packages/types` 新增 `inspection.ts`            | 0.5d   |
| 2        | 内存 Store + EventBus（含 `needs_info` 状态转换 + `listInspections`）                    | `packages/core` 新增 `src/store/`, `src/events/` | 1d     |
| 3        | HTTP 路由（`/inspections` 含筛选, `/pages`, `/events` SSE, `GET /:id`）                  | `packages/core` Server                           | 1.5d   |
| 4        | MCP Server 包 + **10 个** Tools（含 `get_inspection`, `list_inspections`, `reply` 重构） | `packages/mcp` 新包                              | 2d     |
| 5        | 浏览器端：menu.ts + http.ts + 状态指示器 + **Thread Panel** + `replyToInspection`        | `packages/core` 客户端                           | 1.5d   |
| 6        | CLI init/doctor 集成                                                                     | `packages/cli`                                   | 0.5d   |
| 7        | 测试 + 文档（覆盖双向对话场景）                                                          | vitest + README + CLAUDE.md                      | 1d     |
| **总计** |                                                                                          |                                                  | **8d** |

### 实施建议

1. **Step 1 → Step 2 → Step 3** 必须串行，后者依赖前者
2. **Step 4 和 Step 5** 可并行开发（一人做 MCP，一人做浏览器端 Thread Panel）
3. **Step 6** 在 Step 4 完成后即可开始
4. 每个 Step 完成后跑一轮 `vitest`，不要留到最后
5. **Thread Panel 建议单独 PR**，因为 UI 复杂度较高，需要独立 review

### 关键文件清单

```
packages/types/src/inspection.ts                  ← Step 1: 所有类型定义（含 WatchResult）
packages/types/src/index.ts                       ← Step 1: 导出扩展
packages/core/src/utils/id.ts                     ← Step 2: ID 生成器
packages/core/src/events/event-bus.ts             ← Step 2: EventBus
packages/core/src/store/types.ts                  ← Step 2: Store 接口（含 listInspections）
packages/core/src/store/memory-store.ts           ← Step 2: 内存实现（含 needs_info 自动转换）
packages/core/src/server/routes/events.ts         ← Step 3: SSE 端点
packages/core/src/server/routes/inspections.ts    ← Step 3: Inspection 路由（含 GET /:id, GET /）
packages/core/src/server/routes/pages.ts          ← Step 3: Page 路由
packages/mcp/package.json                         ← Step 4: 包配置
packages/mcp/src/index.ts                         ← Step 4: CLI 入口
packages/mcp/src/server.ts                        ← Step 4: MCP Server（10 个 Tools）
packages/mcp/src/http-client.ts                   ← Step 4: HTTP Client
packages/core/src/http.ts                         ← Step 5: 浏览器端 API（含 replyToInspection）
packages/core/src/menu.ts                         ← Step 5: 集成 createInspection
packages/core/src/component.ts                    ← Step 5: InspectionOverlayManager + Thread Panel
```
