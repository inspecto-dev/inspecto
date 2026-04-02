# 用户设置

运行时行为、热键、AI 目标和其他首选项通过 JSON 设置文件进行配置。这些文件允许你自定义浏览器端审查器的行为，以及它需要与哪个 AI 工具进行通信，而完全不需要修改你的构建或打包配置。

## 文件解析顺序

Inspecto 会按照以下优先级（从高到低）在你的项目中查找并合并配置文件：

1. `<cwd>/.inspecto/settings.local.json`
2. `<cwd>/.inspecto/settings.json`
3. ... 向上遍历所有父目录直至 git 根目录 ...
4. `<gitRoot>/.inspecto/settings.local.json`
5. `<gitRoot>/.inspecto/settings.json`
6. `~/.inspecto/settings.json` (全局用户目录)

**最佳实践：**

- 使用 `settings.json` 存放团队共享配置，并将其提交到 Git 仓库。
- 使用 `settings.local.json` 存放个人覆盖配置。CLI 会自动将此文件加入你的 `.gitignore`。

## 配置示例

```json
{
  "inspector.hotKey": "alt",
  "inspector.theme": "auto",
  "ide": "vscode",
  "provider.default": "copilot.extension",
  "prompt.includeSnippet": false,
  "prompt.autoSend": false,
  "provider.claude-code.cli.bin": "claude",
  "provider.coco.cli.bin": "coco"
}
```

## 配置项参考

### `inspector.hotKey`

- **类型:** `string | false`
- **默认值:** `"alt"`
- **描述:** 唤起热键字符串。可以是组合键例如 `"cmd+shift"`, `"ctrl"`, `"metaKey"`。设为 `false` 可完全禁用热键触发功能。

### `inspector.theme`

- **类型:** `"light" | "dark" | "auto"`
- **默认值:** `"auto"`
- **描述:** 浏览器端面板的颜色主题。`"auto"` 会自动跟随操作系统偏好。

### `ide`

- **类型:** `"vscode" | "cursor" | "trae"`
- **默认值:** 自动探测
- **描述:** 强制指定 IDE 上下文。如果省略，Inspecto 会基于当前环境变量（如 `TERM_PROGRAM` 等）自动探测。

### `provider.default`

- **类型:** `string`
- **示例:** `"copilot.extension"`, `"claude-code.cli"`, `"trae.builtin"`
- **描述:** 默认将提取出的代码上下文发送给哪个 AI 工具及通过何种模式。

### `prompt.includeSnippet`

- **类型:** `boolean`
- **默认值:** `false`
- **描述:** 是否将原始代码片段以字符串形式注入到发给 AI 的 prompt 中。当使用诸如 Copilot/Cursor/Trae 等原生集成了 IDE 的 AI 工具时，将此项设置为 `false`（默认）可以为你节省大量 Token，因为 AI 本身已经可以直接读取到本地文件了。

### `prompt.autoSend`

- **类型:** `boolean`
- **默认值:** `false`
- **描述:** 是否在发送上下文后自动按下回车提交，无需等待用户确认。（目前仅有特定的几个扩展实现了此支持）。

### 意图菜单自定义 (`prompts.json`)

为了保持配置的整洁，我们将弹出菜单（意图菜单）的配置独立放在了 `.inspecto/prompts.json` 和 `.inspecto/prompts.local.json` 文件中。

- **类型:** `Array<string | IntentConfig> | { $replace: true, items: Array<string | IntentConfig> }`
- **默认值:** 预设的内置常见 Prompt 选项
- **描述:** 自定义在浏览器中按住热键点击元素后，右下角弹出的“意图菜单 (Intent Menu)”里的快捷选项卡。

**IntentConfig 结构:**

- `id` (string): 唯一标识符。如果设为 `open-in-editor`，则特殊处理为仅打开文件而不发给 AI（内置功能）。
- `label` (string): 菜单按钮上显示的文本。
- `prompt` (string): 完整的基础 Prompt 模板。
- `prependPrompt` (string, 可选): 在基础 prompt 最前面追加的文本（会自动换行拼接）。
- `appendPrompt` (string, 可选): 在基础 prompt 最后面追加的文本。
- `enabled` (boolean, 可选): 设为 `false` 可在不删除配置的情况下隐藏该项。

**数组语法（追加模式，默认）：**
在 `prompts.json` 中直接导出一个数组。你的配置会追加或覆盖到内置的同名 Prompt 上。

```json
[
  {
    "id": "add-i18n",
    "label": "添加国际化",
    "prompt": "请帮我提取 {{file}} 这个文件中的中文硬编码，并使用 i18next 进行替换。"
  },
  {
    "id": "explain",
    "label": "中文解释",
    "prependPrompt": "你是一个前端专家，请用中文回答。"
  }
]
```

**对象语法（完全替换模式）：**
在 `prompts.json` 中导出一个带有 `$replace: true` 的对象，将彻底丢弃所有内置的菜单项，只渲染你提供的 `items`。

```json
{
  "$replace": true,
  "items": [
    {
      "id": "open-in-editor",
      "label": "在编辑器中打开",
      "isAction": true
    },
    {
      "id": "refactor",
      "label": "重构代码",
      "prompt": "请帮我重构 {{file}} 中的代码，提升其可读性。"
    }
  ]
}
```

> **兼容性提示:** 在早期版本中，这些配置可能被写在 `settings.json` 的 `"prompts"` 字段下。Inspecto 依然兼容读取包含 `{"prompts": [...]}` 的 `prompts.json` 文件，但推荐直接在顶层导出数组或对象。

**Prompt 模板支持的内置变量：**

- `{{file}}`: 当前组件的文件路径
- `{{line}}`: 源码行号
- `{{column}}`: 源码列号
- `{{name}}`: 组件名 (例如 `Button.tsx` 的 Button 或代码片段内解析到的名称)
- `{{ext}}`: 文件后缀名 (如 `tsx`, `vue`)
- `{{framework}}`: 自动推断的框架名称 (如 `React`, `Vue`, `Svelte`)

---

### 工具层级覆盖 (`provider.<name>.<mode>.<option>`)

使用扁平的点符号结构对单一工具的属性进行精细控制。`<name>` 是工具的核心品牌名（如 `copilot`, `claude-code`），`<mode>` 可以是 `extension`, `cli` 或 `builtin`。

- **`bin`**: CLI 可执行文件名称或绝对路径（仅限 CLI 模式）。
- **`args`**: 传递给命令行的额外启动参数数组（仅限 CLI 模式）。
- **`cwd`**: CLI 进程运行的工作目录（仅限 CLI 模式）。
- **`coldStartDelay`**: 毫秒级别的等待延迟时间（仅限 CLI 模式）。

## CLI 冷启动延迟

当在终端集成模式下使用 `claude-code` 或 `coco` 这样的 CLI 工具时，IDE 扩展必须等待该 CLI 工具彻底初始化其交互式的 REPL（等待它准备好接收输入），然后才能将初始的 Prompt 粘贴进去。

由于初始化的速度极大地受限于你的机器性能、网络速度、甚至鉴权校验状态，**首次执行的安全延迟默认被设置为 5秒 (5000ms)**。

你可以通过调整此延迟来匹配你机器的真实性能，从而获得更快的响应：

```json
{
  "provider.claude-code.cli.coldStartDelay": 2000
}
```

> **注意：** 如果你把这个数值设得太低，CLI 工具可能会在它的启动清屏动作中，将你发过去的上下文意外清除。该延迟 **仅** 发生在第一次唤起 CLI 终端时，后续的会话请求都将瞬间完成。
