# 简介

## 什么是 Inspecto？

Inspecto 缩短了浏览器、编辑器、DevTools 和 AI chat 之间的往返链路。先从页面开始，再把正确的上下文直接带去源码或 AI。

它为你提供三种基于浏览器的核心工作流：

### 1. Inspect Mode (单点审查模式)

**点击单个组件，立即 Ask AI。**
<img src="/inspect-mode.gif" alt="Inspect mode workflow" style="border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin: 16px 0;" />
当你发现某个 UI 组件有问题，或者想要修改它的特定行为时，可以直接进入 Inspect mode。点击该组件，Inspecto 会瞬间收集它的 DOM 结构和源代码上下文，并直接发送给你连接好的 AI 助手。

### 2. Annotate Mode (批注模式)

**跨多个组件记录批注，最后打包一次发送。**
<img src="/annotate-mode.gif" alt="Annotate mode workflow" style="border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin: 16px 0;" />
非常适合设计走查（Design Review）或复杂的重构。进入 Annotate mode 后，你可以依次圈选页面上的多个元素，为每个元素填写具体的修改意见，最后再补充一个整体目标。Inspecto 会将所有的批注及其各自的源码上下文打包成一个结构清晰的完整 Prompt 交给 AI 处理。

**快速批注工作流**
<img src="/annotate-quick-mode.gif" alt="Annotate quick mode workflow" style="border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin: 16px 0;" />
如果你当前已经处于 `Inspect mode`，只要点击菜单上的 `+` 按钮，就可以无缝切换并开始将当前元素加入批注队列，而不需要打断你当前的审查思路。

### 3. Quick Jump (源码直达)

**用 `Alt` + `点击` 直接打开准确的源码位置。**
<img src="/quick-jump.gif" alt="Quick jump workflow" style="border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin: 16px 0;" />
彻底告别在编辑器中按类名全局搜索或肉眼翻代码。只需在浏览器中按住键盘上的 `Alt` 键（Mac 为 `Option` 键），然后点击任意元素，Inspecto 就会在你的 IDE 中瞬间打开该组件对应的源文件，并精确定位到具体的行与列。

过去你往往要在浏览器、DevTools、编辑器和 AI chat 之间来回切换；现在，Inspecto 把这条链路尽量压缩在浏览器和 IDE 之间。你可以先在页面里定位组件，再把正确的上下文带去源码或 AI。

在设置阶段，Inspecto 现在支持自动化的 onboarding 集成。在 Codex、Claude Code、Coco、Copilot、Cursor、Gemini 或 Trae 等环境中，最快的路径是在终端中安装匹配的 onboarding 集成。Inspecto 将在你的 IDE 内直接打开设置指南，让助手完成设置，并为你应用配置。

## 为什么需要 Inspecto？

<img src="/inspecto-workflow.png" alt="Traditional vs Inspecto Workflow" style="width: 100%; border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05); margin: 16px 0 24px;" />

在传统的开发工作流中，当你需要在页面上调试或修改某个组件并寻求 AI 帮助时，你通常需要经历以下繁琐的步骤，而 Inspecto 将这一切全自动化了：

| 痛点            | 传统 Debug 流程 ❌                                     | Inspecto 工作流 🚀                                                        |
| :-------------- | :----------------------------------------------------- | :------------------------------------------------------------------------ |
| 🔍 **定位源码** | 按 `F12` 审查元素后，在编辑器中全局搜索或肉眼定位源码  | 用 `Quick jump` 或 `Inspect mode` 更快打开对应源码位置                    |
| ✂️ **复制代码** | 手动圈选、复制所需的上下文代码片段                     | Inspecto 从页面和源码里自动组织更相关的上下文                             |
| 🤖 **唤起 AI**  | 手动打开/聚焦 AI 聊天框，输入“请帮我解释/修改这段代码” | 直接在 `Inspect mode` 里发起，或在 `Annotate mode` 里把一批 note 一次发出 |
| ⏱️ **综合成本** | 频繁切换上下文，开发思路很容易被打断                   | 浏览器成为定位源码和交给 AI 的起点，链路更短、更稳                        |

## 工作原理

Inspecto 在你开发环境的三个不同层面上协同工作：

### 1. 编译时注入 (The Plugin)

在开发阶段，`@inspecto-dev/plugin` 会拦截框架的编译过程（通过 Vite、Webpack 或 Rspack 插件）。它会解析你的 React JSX 或 Vue SFC 文件，并将隐藏的 `data-inspecto="file:line:col"` 属性注入到每一个 DOM 元素中。

### 2. 运行时捕获 (The Core Client)

`@inspecto-dev/core` 作为一层框架无关的 Web Component 运行在你的浏览器中。它负责提供 launcher、`Inspect mode`、`Annotate mode` 和 `Quick jump`。你和组件交互后，它会读取 `data-inspecto` 属性，在浏览器端组装 prompt，并在需要时请求 snippet 上下文。

### 3. 动作分发 (The Dispatcher)

当代码上下文准备好后，本地 HTTP 服务器会中继这个 payload；若启用了 snippet 上下文，服务器会读取对应源码并返回片段。根据你的配置，它要么触发 URI Scheme 唤起你的 IDE 扩展，要么直接将内容粘贴到正在终端中运行的 CLI 进程里。

## 核心特性

- **生产环境零开销**：AST 注入仅在 `NODE_ENV !== 'production'` 时发生。这些属性会在你的生产构建中被完全剥离，不会增加任何包体积。
- **框架无关的遮罩层**：浏览器中的高亮遮罩层使用标准的 Web Components 和 Shadow DOM 构建，这意味着它绝对不会干扰或污染你应用程序自身的 CSS 样式。
- **高度可配置**：你可以自定义热键、主题，并且无需修改任何业务代码即可随时切换你要发送给的 AI 厂商。
