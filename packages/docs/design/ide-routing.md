# Inspecto IDE Routing & Workspace Isolation

本文档详细描述了 Inspecto 在处理前端浏览器、本地 Dev Server 与多个 IDE 实例进行跨进程通信（IPC）时的路由架构，特别是如何解决“多 IDE 并发抢占”以及“隐式探测与显式配置冲突”的问题。

## 背景与痛点

在早期版本中，Inspecto 的 Server 依赖于 IDE 扩展（Extension）启动时上报的 `ideInfo`（包含当前安装的 Provider、以及唤醒当前 IDE 的 URI Scheme 等）。但这种简单的“最后写入者赢（Last Write Wins）”策略会导致以下严重痛点：

1. **多工作区抢占（串台现象）**：
   开发者同时用 Cursor 打开了项目 A，用 VS Code 打开了项目 B。由于两个 IDE 都会向同一个默认端口（由 `inspecto.port` 探测）发送 `ideInfo`，导致项目 A 的浏览器 Server 可能会被错误覆盖，最后点击“Send to AI”时把代码发给了项目 B 的 VS Code。
2. **显式配置的控制权丧失**：
   如果团队共享了 `.inspecto/settings.json` 并强制配置了 `"ide": "vscode"`，但当前开发者碰巧用 Cursor 启动了服务。旧版逻辑会隐式地忽略配置文件，强行使用 Cursor 的 Scheme 唤醒，这打破了“配置即代码”的确定性预期。

## 架构升级：双重防御机制

为了解决上述问题，Inspecto 引入了 **“Workspace 隔离匹配”** 和 **“显式配置严格锁死 (Strict Override)”** 两套机制。

### 一、 Workspace 隔离匹配 (同源项目保护)

当 IDE 扩展向本地 Server 注册自身状态时，必须出示其“项目归属证明”。

1. **IDE 侧采集**：
   在 `packages/ide/src/extension.ts` 中，扩展不仅上报 `scheme`，还会通过 `vscode.workspace.workspaceFolders` 读取并上报当前的 `workspaceRoot`（项目绝对路径）。

2. **Server 侧校验防御**：
   在 `packages/plugin/src/server/index.ts` 的 `/api/v1/ide/info` 接口中，Server 会将 IDE 发来的 `workspaceRoot` 与当前 Server 运行的 `projectRoot` 进行严格匹配。
   - **只放行“自己人”**：只有当 `ideWorkspace === serverProjectRoot` 或属于其父目录（Monorepo 场景）时，Server 才会更新内存中的 `ideInfo`。
   - **默默丢弃“越权者”**：如果不匹配，说明这是另一个项目窗口发来的干扰请求，Server 会在日志中打印一条 Debug 信息并丢弃该请求，从根本上杜绝“串台”。

### 二、 显式配置严格锁死 (Strict Override)

当需要将代码片段派发给 IDE (`dispatchToAi`) 或是打开文件 (`launchIDE`) 时，Server 在决定“使用哪种 URI Scheme”上遵循以下优先级决策树：

```text
判断当前连上来的 IDE (activeIde) 与 用户配置的 IDE (configuredIde)

1. 是否存在显式的 configuredIde? (例如: "ide": "vscode")
   └── [是] -> 检查 activeIde 的 Scheme 是否包含 configuredIde (比如 'cursor' 并不包含 'vscode')
       └── [不包含] -> 触发冲突！
           -> 结论：用户是上帝。拒绝自动探测的魔法，强制锁死使用 configuredIde（即 'vscode'）。
           -> 行为：记录一条 warning 日志，并强行发起 vscode:// 唤醒。

   └── [否 / 包含] -> 正常匹配或未强制配置
       -> 结论：优先使用 activeIde 报上来的精确 Scheme (例如 'vscode-insiders')，如果没连上，则 fallback 到 configuredIde，最后 fallback 到 'code'。
```

#### 核心代码实现切片：

```typescript
const configuredIde = userConfig.ide
const activeIdeScheme = serverState.ideInfo?.scheme
let finalIde = 'vscode'

if (configuredIde && activeIdeScheme && !activeIdeScheme.includes(configuredIde)) {
  // 严格模式：拒绝覆盖
  serverLogger.warn(
    `Active IDE is ${activeIdeScheme}, but config forces ${configuredIde}. Using configured IDE.`,
  )
  finalIde = configuredIde
} else {
  // 魔法模式：智能降级
  finalIde = activeIdeScheme || configuredIde || 'vscode'
}

// 基于 finalIde 生成唤醒链接
const uri = `${finalIde}://inspecto.inspecto/send?${params.toString()}`
```

## 总结

此架构既保证了**零配置用户的极致体验**（只要打开 IDE 就能自动匹配唤醒正确的窗口），又保障了**企业级高阶用户的绝对控制权**（只要写在 `.inspecto/settings.json` 里，配置就是最高准则）。同时彻底解决了单机多开编辑器带来的交叉污染问题。
