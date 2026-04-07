# Inspecto Onboarding 自动化接入体验优化设计

## 背景与现状

当前 integration 安装链路已经能完成两件关键事情：

1. 用户在终端执行 `npx @inspecto-dev/cli integrations install <assistant>`。
2. CLI 将对应 assistant 的 skill 或规则文件写入项目目录。

但接入体验仍然存在明显断层：

1. 用户通常还需要自己打开或切回 IDE。
2. 用户需要自己打开 AI Chat 面板。
3. 用户需要自己输入或粘贴触发口令 `Set up Inspecto in this project`。
4. IDE 扩展的安装路径在不同 IDE 上能力不一致，失败时缺少统一降级体验。

因此，这个设计的目标不是承诺“所有 IDE 一键零交互闭环”，而是在现有能力之上，把手动步骤尽可能压缩，优先消除最机械、最容易中断的那几步。

## 设计目标

- 用户仍然只执行一条 `npx` 命令作为入口。
- 在能力允许时，CLI 自动安装或引导安装 `inspecto.inspecto` 扩展。
- 在能力允许时，CLI 自动唤起 IDE 并通过现有 URI 路由把 onboarding prompt 送入 assistant 面板。
- 对不支持自动发送、无 GUI、或插件市场隔离的场景，提供明确且稳定的降级路径。
- 设计描述必须严格对齐仓库现有实现，不把未来能力写成已具备能力。

## 现有能力基线

在设计实现前，需要先明确仓库中已经存在的能力边界：

- `packages/ide/src/uri-handler.ts` 已支持 `/send` 路由，并能解析 `target`、`prompt`、`ticket`、`autoSend` 等参数。
- `packages/ide` 内各 assistant strategy 已支持 focus chat panel、paste prompt，以及部分场景下的 `autoSend`。
- `packages/plugin/src/server/dispatch-runtime.ts` 已在浏览器侧复用 `ide://inspecto.inspecto/send?...` 协议。
- `packages/cli/src/inject/extension.ts` 已实现 VS Code 扩展安装的 waterfall 降级。
- macOS 下已确认可使用 `cursor --install-extension inspecto.inspecto --force` 安装 Cursor 扩展，但仓库中尚未沉淀为统一 installer 能力。
- 对 Trae、Trae CN 等 IDE，仓库内仍未提供同等级别的自动安装能力。

这意味着该方案应优先复用现有 `/send`、`autoSend`、clipboard fallback 和 extension installer，而不是重新定义一套新协议。

## 支持矩阵

下面的矩阵描述的是当前仓库能力，不是目标愿景：

| 目标                 | 自动安装扩展                                                                                        | 自动拉起 IDE URI                     | 自动聚焦并填充 Prompt | 自动发送                   |
| -------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------- | -------------------------- |
| Codex 扩展模式       | 依赖 VS Code 扩展安装链路                                                                           | 可行                                 | 可行                  | 可行                       |
| Codex CLI 模式       | 不适用                                                                                              | 不适用                               | 不适用                | 由 CLI strategy 处理       |
| VS Code + Copilot    | 较强。CLI 已有 installer waterfall                                                                  | 可行                                 | 可行                  | 可行                       |
| Cursor               | macOS 已确认可用 `cursor --install-extension inspecto.inspecto --force`；CLI 尚未封装统一 installer | 可行                                 | 可行                  | 当前未实现                 |
| Trae / Trae CN       | 弱。当前没有专用 installer waterfall                                                                | 可行，但受 scheme 与市场隔离影响更大 | 可行                  | 当前未实现                 |
| Claude Code 扩展模式 | 依赖 VS Code 扩展安装链路                                                                           | 可行                                 | 可行                  | 当前未实现                 |
| CLI 型 assistant     | 不适用                                                                                              | 不适用                               | 不适用                | 由各 CLI strategy 自行处理 |

结论是：v1 可以把“自动安装 + 自动唤起 + 自动填充”作为主目标，但不能把“自动发送”写成通用能力。

## 方案设计

### 总体思路

核心思路仍然是 `CLI -> IDE URI Handler -> assistant strategy`，但要调整承诺边界：

1. CLI 完成 integration 文件写入。
2. CLI 尝试安装或引导安装 IDE 扩展。
3. CLI 通过操作系统打开 `ide://inspecto.inspecto/send?...`。
4. IDE 插件复用现有 `InspectoUriHandler` 和 strategy，把 prompt 放入目标 assistant 面板。
5. 如果当前 assistant 支持 `autoSend`，则直接发送；否则停留在“已自动填充，用户手动回车”。

这条链路的价值在于显著减少记忆和切换成本，而不是在所有环境下做到完全无人参与。

### 先决策 assistant runtime，再发 URI

仅仅知道 `assistant=codex` 还不够，CLI 在发 URI 前还必须决定这次应该走哪个 runtime mode。

对于同时支持 `extension` 和 `cli` 的 assistant，v1 不应再盲目依赖默认 mode，而应按宿主 IDE 的真实能力动态解析 runtime：

1. 优先使用宿主 IDE 内已经安装的 assistant 插件。
2. 如果插件不存在，则降级到对应 CLI。
3. 如果插件和 CLI 都不存在，则停止自动发 URI，并明确提示用户安装缺失的 runtime。

当前已经落地这套规则的 assistant 包括：

- `codex`
- `claude-code`
- `gemini`

它们的统一策略是：

```text
extension > cli > guidance
```

例如：

- `integrations install codex --host-ide cursor`
  会按 `Cursor Codex extension > codex CLI > guidance` 解析。
- `integrations install claude-code --host-ide cursor`
  会按 `Cursor Claude extension > claude CLI > guidance` 解析。
- `integrations install gemini --host-ide vscode`
  会按 `VS Code Gemini extension > gemini CLI > guidance` 解析。

这个步骤的关键意义是：在进入 IDE 之前，就把“这次到底走 extension 还是 cli”决定清楚，并通过 URI 参数显式传给 IDE 扩展，而不是等 IDE 侧按默认值误撞后再 fallback。

### 先决策宿主 IDE，再执行自动化

`integrations install codex` 里的 `codex` 表示目标 assistant，不等于宿主 IDE。

自动安装扩展、打开窗口、发送 URI，这三件事都依赖宿主 IDE，因此流程上必须先 resolve `host ide`，再决定后续动作。也就是说：

1. 先确定这次 onboarding 要落到 `vscode`、`cursor`、`trae` 还是其他 IDE。
1. 先确定这次 onboarding 要落到 `vscode`、`cursor`、`trae`、`trae-cn` 还是其他 IDE。
1. 再选择对应的扩展安装命令。
1. 再选择对应的 URI scheme。
1. 最后才把 prompt 送入该 IDE 中承载的 assistant 面板。

这个顺序比“先看 assistant，再猜 IDE”更合理，因为同一个 assistant 可能运行在不同 IDE 宿主里。

### 宿主 IDE 的解析优先级

v1 建议采用“高置信优先、低置信停止自动化”的规则，而不是无条件猜一个 IDE。

优先级从高到低如下：

1. 显式参数，例如 `--host-ide cursor`。
2. 项目或用户配置中的显式 `ide` 设置。
3. 当前运行环境中的高置信 IDE 终端特征。
4. 项目目录痕迹，例如 `.cursor`、`.vscode`、`.trae`。
5. 项目目录痕迹，例如 `.cursor`、`.vscode`、`.trae`、`.trae-cn`。

这套规则的关键点不是“尽量猜中”，而是“在不确定时不要做错”。

### 非 IDE Terminal 场景的处理

如果命令不是在 IDE terminal 里执行，环境变量这条高置信信号通常不存在，此时不能简单回退成“默认装 VS Code 插件”。

更合理的处理是按置信度分档：

1. 高置信度  
   例如传入了 `--host-ide`，或者配置里已经写明 `ide`。  
   直接继续自动化流程。

2. 中置信度  
   例如项目里只有单一 IDE 痕迹，且没有冲突信号。  
   可以继续，但 CLI 应明确打印“按某 IDE 处理”的提示。

3. 低置信度  
   例如同时存在 `.cursor` 和 `.vscode`，或者完全没有任何 IDE 线索。  
   CLI 不应自动安装插件，也不应自动发 URI；只完成 integration 文件安装，并提示用户补充 `--host-ide` 或先在目标 IDE 中执行该命令。

这个降级策略比“始终回退到 VS Code”更稳妥，因为装错 IDE 插件比不自动化的体验更差。

### `integrations doctor --json` 契约

当前 CLI 已提供面向外部工具和 CI 的 `inspecto integrations doctor <assistant> --json` 预检接口。字段语义、状态枚举和退出码约定以 CLI 文档为准，避免在设计文档里维护第二份副本：

- `packages/cli/README.md` 中的 `inspecto integrations doctor` 章节

### 第一步：CLI 安装或引导安装扩展

此步骤必须和当前仓库实现保持一致。

#### v1 主路径

对 VS Code 生态，直接复用 `packages/cli/src/inject/extension.ts` 现有能力：

```bash
code --install-extension inspecto.inspecto
```

当前实现已经覆盖以下 waterfall：

1. 使用 `code --install-extension inspecto.inspecto`。
2. 尝试已知的 VS Code 二进制路径。
3. 打开 `vscode:extension/inspecto.inspecto`。
4. 输出 marketplace / Open VSX 的手动安装指引。

#### Cursor 的处理原则

Cursor 不应再被描述为“能力未知”。当前已确认在 macOS 下可通过以下命令安装扩展：

```bash
cursor --install-extension inspecto.inspecto --force
```

因此 v1 文档应把它视为已验证路径，但同时说明两点：

1. 这是当前已确认的平台能力，不等于仓库里已经存在统一的 Cursor installer 封装。
2. 在 CLI 正式接入前，仍需要补充平台检测、失败处理和回退文案。

#### 其他非 VS Code IDE 的处理原则

对于 Trae、Trae CN 等其他目标，当前仓库尚未提供和 VS Code 同等级的安装器能力，因此文档不应假设 `trae --install-extension` 或 `trae-cn --install-extension` 已经可靠可用。

v1 应采用更保守的描述：

1. 如果后续验证证明某个 IDE 的 CLI 安装命令稳定可用，可以增加针对该 IDE 的专用 installer。
2. 在此之前，CLI 只负责输出精确安装入口和手动步骤。
3. 手动安装完成后，再继续 URI 唤起流程。

这能避免把“可能可用的命令”误写成产品承诺。

### 第二步：CLI 发射 URI 唤起协议

这一层应复用现有 `/send` 路由，不新增协议形态。

协议格式保持为：

```text
<ide-scheme>://inspecto.inspecto/send?target=<assistant>&prompt=Set+up+Inspecto+in+this+project
```

如果当前链路已经能使用 ticket 模式，则优先复用 ticket，避免在 URI 中塞更多上下文。

#### 跨平台执行

CLI 不应硬编码 macOS 的 `open`。应统一走跨平台打开逻辑：

- macOS: `open`
- Linux: `xdg-open`
- Windows: `start`

这部分仓库里已经存在近似能力，`packages/cli/src/inject/extension.ts` 的 `tryOpenURI()` 可以直接复用或抽离成公共工具。

### 第三步：IDE 插件接管 prompt 注入

此步骤基于现有 `packages/ide` 能力，主要依赖两层：

1. `InspectoUriHandler` 解析 `/send`。
2. 对应 assistant strategy 执行 focus、paste、fallback。

当前可依赖的事实包括：

- `codex.ts` 同时支持 `extension` 和 `cli` 两种模式；其中 `extension` 模式支持 `autoSend=true`。
- `claude.ts`、`gemini.ts` 也支持 `extension` 和 `cli` 双模式。
- `cursor.ts`、`trae.ts` 会尝试聚焦聊天面板并粘贴 prompt。
- `copilot.ts` 在 `autoSend=true` 时可以直接调用 `workbench.action.chat.open` 发送 query。
- `claude.ts` 当前只支持 focus + paste，不支持真正的 auto-send。

因此文档应明确区分两类结果：

1. `autoSend` 已实现：直接发送 prompt。
2. `autoSend` 未实现：自动聚焦并填充，用户手动按一次回车。

这依然能明显提升 onboarding 体验，但不是“零操作”。

## 边缘情况与降级策略

### 多窗口路由问题

这是当前方案里最容易被高估的一环。

现有 `uri-handler.ts` 还没有 workspace 校验能力，因此 v1 不能声称“已经解决多窗口精准路由”。当前更现实的处理是：

1. 在发送 URI 前，CLI 先尝试用当前目录打开目标 IDE 窗口，例如 `code .`。
2. 将该步骤视为 best effort，而不是正确性保证。
3. 文档里明确标注：多窗口精准路由仍是后续增强项，需要未来补充 `workspace` 参数与 handler 校验后才能作为稳定能力对外承诺。

### 插件激活竞态

扩展刚安装完成时，URI handler 可能尚未注册完成。固定 sleep 只能作为启发式缓冲，不能当作可靠机制。

因此 v1 的描述应为：

1. 安装完成后允许一个短暂等待窗口。
2. 若 URI 打开失败，不阻塞整体流程。
3. 降级为终端提示用户手动切回 IDE，并提供可直接复制的 prompt。

### 无 GUI、SSH、WSL

远程环境下往往既不能可靠打开本地 IDE，也不能可靠访问本地剪贴板。因此保底策略不应建立在 clipboard 之上。

v1 的保底路径应为：

1. 在终端直接打印 prompt。
2. 明确提示用户回到本地 IDE 后执行下一步。
3. 如果 clipboard 可用，则作为附加增强，而不是唯一降级手段。

### 插件市场隔离

对于 Trae CN 之类可能使用独立插件市场的产品，v1 的处理应保持务实：

1. 输出对应的安装入口或 VSIX 安装指引。
2. 允许用户手动确认“已安装完成”后再继续。
3. 不把市场可用性写成 CLI 可自动兜底的事实。

## 建议的版本边界

### v1

v1 聚焦“减少接入摩擦”，而不是追求完全自动化：

1. 写入 integration 文件。
2. 增加宿主 IDE 解析逻辑，并按置信度决定是否继续自动化。
3. 复用现有 VS Code extension installer，并接入已确认的 Cursor 安装路径。
4. 为双模 assistant 增加 runtime resolution，按 `extension > cli > guidance` 选择实际运行模式。
5. 增加一个统一的“打开 IDE 并发送 onboarding prompt”流程。
6. 明确 `autoSend` 仅对已支持的 assistant 生效。
7. 提供统一的终端降级文案。

### 后续增强

以下内容适合放入后续版本，而不是写进 v1 已交付能力：

1. 针对 Cursor / Trae 的专用 installer waterfall。
2. `workspace` 参数与 URI handler 校验，解决多窗口精准路由。
3. 更可靠的“扩展已激活”握手机制，替代固定 sleep。
4. 将当前已实现的 runtime resolution 从 `codex / claude-code / gemini` 扩展到更多 assistant / host IDE 组合。
5. 更完整的 assistant 能力探测，用于在 CLI 侧提前决定是否开启 `autoSend`。

## 结论

这项设计值得推进，因为它能够把当前 onboarding 中最割裂的步骤压缩掉，尤其是“用户自己切 IDE、开面板、输入固定口令”这一段。

但文档必须准确表达它的真实收益：

- 它能显著提升 integration 接入体验。
- 它能在部分 IDE / assistant 组合上接近一键体验。
- 它当前还不能稳定保证跨 IDE 自动安装、多窗口精准路由、以及通用 auto-send。

只要按这个边界推进，方案就是稳健的；如果继续把未来能力写成现有能力，最终会因为预期落差伤害接入体验本身。
