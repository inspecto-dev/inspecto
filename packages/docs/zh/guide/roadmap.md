# 迭代计划 (Roadmap)

Inspecto 正在积极演进中。我们的终极目标是将其打造为可视化 UI 开发与 AI Agent 之间最完美的桥梁。以下是我们为未来版本规划的部分核心特性。

## 第一阶段：上下文强化 (Context Enrichment) - 进行中

既然现在自动化 onboarding 流程和核心 CLI 架构已经稳定，我们的重心转向让 AI 获取更丰富的视觉与架构上下文，而不仅仅是孤立的代码片段。

- **Props 来源追踪 (P0)**：追踪 Props 的来源与传递路径，让 Agent 明确知道应该在哪里进行修改，这将是我们的下一个重点特性。
- **条件与循环渲染上下文 (P0)**：提取组件的条件渲染（`if`/`else`）与循环渲染（`map`）上下文信息，帮助 AI 更好地理解代码结构。
- **Import 链解析 (P1)**：解析并区分当前组件是来自项目自身的自有组件还是第三方库的组件。
- **表达式 Span 精准替换 (P1)**：通过 MagicString 的行列号信息，支持更精准的代码和表达式级别的替换。
- **多组件组合圈选**：允许开发者按住修饰键（例如 `Shift`），在浏览器中同时框选多个 React/Vue 组件，并将它们的源码上下文合并后一次性发送给 AI。
- **运行时状态与样式捕捉**：除了静态源码，我们还计划提取组件在浏览器中的实时状态（Props / State）以及计算后的最终 CSS 样式（Computed Styles），帮助 AI 更精确地定位样式和逻辑 Bug。
- **自动截图附带 (Screenshot)**：在点击选中组件的瞬间，自动截取该元素在浏览器中的渲染状态（UI 截图），并随同源代码一起作为多模态 Prompt 发送给 AI 助手，让 AI 做到“图文结合”的理解。

## 第二阶段：面向 Agent 的未来 (MCP 双向通信)

我们正在设计 Inspecto 的 Model Context Protocol (MCP) Server，以建立 AI Agent 与浏览器前端之间标准的双向通信桥梁。核心任务包括：

- **核心状态机与存储**：实现内存 Store 与 EventBus，管理检视 (Inspection) 和页面 (Page) 的完整生命周期及状态流转。
- **HTTP 与实时事件 API**：构建用于检视管理的 RESTful API，以及基于 SSE (Server-Sent Events) 的实时事件流，实现端到端状态同步。
- **MCP Server 与核心 Tools**：提供核心 MCP Tools（如 `inspecto_watch`, `inspecto_resolve`, `inspecto_reply` 等），赋予 Agent 阻塞监听新检视、读取上下文详情、标记完成以及与开发者提问回复的能力。
- **浏览器端双向交互 UI**：在浏览器目标元素旁注入可视化的状态指示器与 Thread Panel 对话面板，允许开发者直接在页面上与 AI Agent 进行多轮对话与信息补充。
- **自动化诊断与自愈 (Self-Driving Mode)**：支持闭环修复，让 AI Agent 自动读取报错或 UI 异常，通过 MCP 定位源码并修改、刷新验证。

## 第三阶段：底层架构升级

为了支撑多 Agent、更复杂、更实时的人机交互，我们将升级 Inspecto 的通信层和 IDE 桥接。

- **WebSocket 双向通信**：主要解决 IDE 扩展（插件）与本地开发服务器 (DevServer) 之间的双向通信问题。抛弃现有的 URI Scheme 单向唤起方案，改为建立持久化连接，允许 IDE 与浏览器之间进行复杂的指令互传与实时状态同步。
  - **Agent 对话日志 (Agent Journaling)**：持久化存储 浏览器 → MCP → IDE 之间的对话，以便在多步骤任务中回放相同的上下文。

---

_你有其他想要的功能吗？欢迎在我们的 [GitHub Discussions](https://github.com/inspecto-dev/inspecto/discussions) 中提出你的想法！_
