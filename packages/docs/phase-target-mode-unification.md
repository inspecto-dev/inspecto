# Phase: Target & Mode Unification

## 1. 问题与目标

### 1.1 当前问题

`Provider` 类型同时混入了工具品牌（`codex`）和交互形态（`codex-cli`），导致：

- `Provider` 枚举里 `codex` 和 `codex-cli` 是平级兄弟，违反单一职责
- `VALID_MODES` / `DEFAULT_PROVIDER_MODE` 需要为每个 `*-cli` 变体重复维护一行
- `getStrategy()` 里有 `mode === 'cli' && STRATEGY_MAP[\`${tool}-cli\`]` 的补丁逻辑
- `dispatchToAi()` 里有 `CLI_NAME_MAP` 强行重命名 + `claude-cli` 遗留别名处理
- 增加新工具时，plugin 版和 CLI 版各占一个枚举值，枚举爆炸

### 1.2 设计目标

将两个正交维度彻底分离：

| 维度     | 含义                  | 类型           |
| -------- | --------------------- | -------------- |
| **Tool** | AI 服务提供方（品牌） | `Provider`     |
| **Mode** | 交互载体（形态）      | `ProviderMode` |

---

## 2. 类型重构

### 2.1 `Provider` — 只表示工具品牌

```typescript
export type Provider =
  | 'copilot' // GitHub Copilot (plugin only)
  | 'claude-code' // Anthropic Claude Code
  | 'gemini' // Google Gemini
  | 'codex' // OpenAI Codex
  | 'coco' // Coco
```

每个值代表一个 AI 产品，与"用什么方式调用它"无关。

### 2.2 `ProviderMode` — 只表示交互形态

```typescript
export type ProviderMode =
  | 'extension' // IDE 扩展 API（vscode.commands）
  | 'cli' // 终端 CLI（terminal.sendText）
  | 'clipboard' // 纯剪贴板兜底（最终降级）
```

> `app`（deeplink 唤起）等形态在有实际实现时再加入，不预占枚举位。

### 2.3 静态映射表

```typescript
/** 每个工具支持哪些 mode（用于验证用户配置） */
export const VALID_MODES: Record<Provider, ProviderMode[]> = {
  copilot: ['extension'],
  'claude-code': ['extension', 'cli'],
  gemini: ['extension', 'cli'],
  codex: ['extension', 'cli'],
  coco: ['cli'],
}

/** 每个工具的默认 mode（无配置时使用） */
export const DEFAULT_PROVIDER_MODE: Record<Provider, ProviderMode> = {
  copilot: 'extension',
  'claude-code': 'extension',
  gemini: 'extension',
  codex: 'extension',
  coco: 'cli',
}
```

---

## 3. 用户配置层

### 3.1 合法工具名一览

| provider.default | 默认 mode   | 支持的 mode        | 说明                                    |
| ---------------- | ----------- | ------------------ | --------------------------------------- |
| `copilot`        | `extension` | `extension`        | GitHub Copilot Chat 扩展                |
| `claude-code`    | `extension` | `extension`, `cli` | Claude Code 扩展 或 `claude` CLI        |
| `gemini`         | `extension` | `extension`, `cli` | Gemini Code Assist 扩展 或 `gemini` CLI |
| `codex`          | `extension` | `extension`, `cli` | Codex 扩展 或 `codex` CLI               |
| `coco`           | `cli`       | `cli`              | Coco CLI                                |

### 3.2 `settings.json` 配置

```jsonc
{
  "provider.default": "claude-code.cli", // 工具品牌名与模式

  // 覆盖特定的工具配置
  "provider.claude-code.cli.bin": "claude",
  "provider.claude-code.cli.cwd": "${workspaceRoot}",
  "provider.claude-code.cli.autoSend": false,

  "provider.codex.extension.autoSend": true,
}
```

**零配置体验：**

```jsonc
{ "provider.default": "codex.extension" }
```

系统自动按 `Extension → CLI → Clipboard` 降级链选择最佳形态，无需额外声明。

### 3.3 provider.default 解析规则

```
provider.default: "claude-code.cli" → tool=claude-code，mode 设定为 cli；
provider.default: "copilot.extension" → tool=copilot，mode 固定为 extension
（未设置）               → 自动探测（Extension 优先）或退回到缺省（copilot.extension）
```

---

## 4. 策略层

### 4.1 Strategy 注册表（一个工具一个策略）

每个 `Provider` 对应一个策略文件，内部的 `channels` 数组按优先级排列，实现 mode 降级：

```typescript
// packages/ide/src/strategies/codex.ts
export const codexStrategy: IAiStrategy = {
  target: 'codex',
  channels: [
    { type: 'extension', execute: executeCodexPlugin }, // 首选：扩展 API
    { type: 'cli', execute: executeCodexCli }, // 次选：终端 CLI
    { type: 'clipboard', execute: executeClipboardFallback }, // 兜底
  ],
}
```

```typescript
// packages/ide/src/strategies/index.ts
const STRATEGY_MAP: Record<Provider, IAiStrategy> = {
  copilot: copilotStrategy,
  'claude-code': claudeStrategy,
  gemini: geminiStrategy,
  codex: codexStrategy,
  coco: cocoStrategy,
}

export function getStrategy(tool: Provider): IAiStrategy {
  const s = STRATEGY_MAP[tool]
  if (!s) throw new Error(`No strategy registered for tool: ${tool}`)
  return { ...s, channels: [...s.channels] }
}
```

`getStrategy` 不再接受 `mode` 参数——mode 的选择由策略内部的 channel 执行顺序 + 用户配置共同决定。

### 4.2 Channel 执行与降级

`executeWithFallback` 按 channels 数组顺序执行：

- 抛出 `RecoverableChannelError`（插件未安装、CLI 不在 PATH）→ 降级到下一个 channel
- 抛出其他错误（执行中途失败）→ 停止降级，报错给用户

```typescript
class RecoverableChannelError extends Error {} // 可降级：环境不满足，尝试下一个
// 其他 Error 子类或原生 Error → 不可降级：执行失败，直接报错

// 示例：plugin channel 里插件未安装时，抛 Recoverable → 自动降级到 cli channel
if (!codexExt) throw new RecoverableChannelError('Codex extension not installed')

// 示例：cli channel 里 CLI 不在 PATH，抛 Recoverable → 自动降级到 clipboard channel
if (!binExists) throw new RecoverableChannelError('codex binary not found in PATH')
```

### 4.3 用户强制 mode

强制 mode 的截断发生在 `filterChannels`，**在 execute 函数之前**完成——execute 内部无需关心 overrides，只需在环境不满足时抛 `RecoverableChannelError`：

```typescript
function filterChannels(channels: ChannelDef[], forcedMode?: ProviderMode): ChannelDef[] {
  if (!forcedMode || forcedMode === 'clipboard') return channels
  // 强制 mode：只保留指定类型 + clipboard 兜底
  return channels.filter(c => c.type === forcedMode || c.type === 'clipboard')
}
```

示例：用户配置 `provider.default: "claude-code.cli"`，`filterChannels` 过滤后只剩 `[cli, clipboard]`，extension channel 直接被排除，无需 execute 内部判断。

---

## 5. Server 端分发（`dispatchToAi`）

移除 `CLI_NAME_MAP`，直接传标准 `Provider` 品牌名：

```typescript
async function dispatchToAi(req: SendToAiRequest): Promise<SendToAiResponse> {
  const userConfig = loadUserConfigSync(...)

  // 解析目标工具（品牌名）
  const resolvedTool = resolveTargetTool(userConfig)  // → 'claude-code' | 'codex' | ...

  // 构建 URI，只传 tool，不传 mode（Extension 自己决定 mode）
  const params = new URLSearchParams()
  params.set('target', resolvedTool)
  params.set('prompt', formattedPrompt)
  params.set('file', location.file)
  params.set('line', String(location.line))
  params.set('col', String(location.column))
  params.set('snippet', snippet)

  // overrides 包含用户配置的 type（mode）、bin、args 等，由 Extension 端消费
  const overrides = extractToolOverrides(ide, userConfig)[resolvedTool]
  if (overrides) params.set('overrides', JSON.stringify(overrides))

  const uri = `${scheme}://inspecto.inspecto/send?${params.toString()}`
  launchURI(uri)
  return { success: true }
}
```

mode 的决策权完全转移到 Extension 端：Extension 根据 `overrides.type` 和本地探测结果决定走哪个 channel。

---

## 6. Extension 端（URI Handler）

```typescript
async handleUri(uri: vscode.Uri): Promise<void> {
  const params   = new URLSearchParams(uri.query)
  const target   = params.get('target') as Provider
  const prompt   = params.get('prompt') || ''
  const overrides = parseOverrides(params.get('overrides'))

  const strategy = getStrategy(target)  // 不再传 mode

  // 根据 overrides.type 过滤可用 channels
  const channels = filterChannels(strategy.channels, overrides?.type)

  const payload: AiPayload = { target, prompt, overrides, ...rest }
  await executeWithFallback(channels, payload)
}
```

---

## 7. 实施步骤

1. **`@inspecto-dev/types`**：更新 `Provider` 枚举（去掉 `*-cli` 变体），更新 `ProviderMode`（加 `clipboard`），重建 `VALID_MODES` / `DEFAULT_PROVIDER_MODE`

2. **策略合并**：将 `claude-code.ts` + `claude-code-cli.ts` 合并为 `claude.ts`，`codex.ts` + `codex-cli.ts` 合并为单一策略（内部 channels 覆盖两种 mode）；`gemini-code-assist.ts` + `gemini-cli.ts` 合并为 `gemini.ts`

3. **`getStrategy` 简化**：移除 `mode` 参数和 `*-cli` key 补丁逻辑

4. **`dispatchToAi` 清理**：移除 `CLI_NAME_MAP`、`IDE_BUILTIN_TOOL`、`claude-cli` 别名处理，改用统一的 `resolveTargetTool()`

5. **URI Handler 更新**：不再从 URI 读取 `mode`，改为在本地用 `filterChannels` 决定

6. **`extension.ts` providers 简化**：`pushIdeInfoToServer` 里只上报品牌名（`claude`、`codex`等）及 installed 状态

7. **`extractToolOverrides` 对齐**：key 改为新 `Provider` 品牌名，不再有 `claude-code-cli` 等 key

8. **文档更新**：`phase-settings.md` 里的示例配置全部改用新品牌名
