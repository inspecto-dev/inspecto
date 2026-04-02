# Inspecto 日志系统设计文档 (Logger Design)

> **目标**：在“保持对用户零打扰 (Silence by Default)”与“提供充足的排障线索 (Debuggability)”之间取得完美平衡。

## 1. 架构理念

借鉴 Vite、Next.js 和 ESLint 等前端工程化工具的最佳实践，Inspecto 的日志系统采用 **“三级日志控制架构”**。

1. **核心原则**：在默认情况下，Inspecto 插件在控制台中应当是完全静默的，或者仅仅打印极其克制的单行初始化状态。所有的 AST 转换细节、服务器心跳等一律隐藏。
2. **多层级过滤**：引入基于 `logLevel` 的粗粒度过滤。
3. **Debug 命名空间**：引入基于 `DEBUG` 环境变量的细粒度命名空间日志，供维护者和高级用户在提交 Issue 时抓取底层堆栈。

---

## 2. 设计规范

### 2.1 粗粒度控制：`logLevel`

在 `@inspecto-dev/plugin` 的入口 Options 中新增 `logLevel` 参数。

```typescript
export interface InspectoPluginOptions {
  // ... existing options ...
  /**
   * 控制控制台的日志输出级别。
   * - 'info': 打印启动信息、错误和警告
   * - 'warn': 只打印错误和警告（默认推荐）
   * - 'error': 只打印致命错误
   * - 'silent': 完全静默
   * @default 'warn'
   */
  logLevel?: 'info' | 'warn' | 'error' | 'silent'
}
```

**默认行为：**
为了尽量不干扰用户自身项目的业务 Log，Inspecto 的默认级别被定为 `'warn'`。即：只在发生配置文件解析失败、端口被占用等异常时才在终端发声。

### 2.2 细粒度排障：`DEBUG` 环境变量

受 `debug` NPM 包的启发，Inspecto 在内部实现轻量级的基于环境变量的打印器。
当用户在命令行带上环境变量启动时，无论 `logLevel` 是什么，被激活的 Namespace 都会绕过拦截打印出来。

**使用示例：**

```bash
# 打印所有 Inspecto 相关的底层日志
DEBUG=inspecto:* npm run dev

# 仅打印 AST 转换阶段的日志
DEBUG=inspecto:ast npm run dev
```

**定义的 Namespaces：**

- `inspecto:server`: 本地 Node HTTP Server 的启动、端口、跨域拦截。
- `inspecto:config`: 解析 `settings.json` 和 `prompts.json` 的过程。
- `inspecto:ast`: 每一个 Vue/React 文件被编译注入行列号的过程（量极大）。
- `inspecto:api`: 处理浏览器传来的 `/open` 和 `/config` 请求载荷。

---

## 3. 实现方案

由于 Inspecto 是一个轻量级工具，为了避免不必要的 `node_modules` 依赖膨胀，我们**不引入第三方的 `debug` 库**，而是自己用不到 50 行代码实现一个兼容 `DEBUG=inspecto:*` 语法的轻量级 Logger 模块。

### 3.1 `createLogger` 工具类抽象

提供统一的 `logger.info`, `logger.warn`, `logger.error`, 以及 `logger.debug` API。

```typescript
// 伪代码演示
const logger = createLogger('inspecto:server', { logLevel: 'warn' })

// 会被拦截（因为默认是 warn）
logger.info('Server listening on port 3000')

// 会被打印
logger.warn('Failed to parse settings.json')

// 当运行 DEBUG=inspecto:server 时会被打印
logger.debug('Received open payload:', req.body)
```

### 3.2 颜色与格式 (Colors & Formatting)

为了在终端中更容易辨识：

- Error: 🔴 使用红字前缀 `[inspecto] ERROR:`
- Warn: 🟡 使用黄字前缀 `[inspecto] WARN:`
- Info: 🔵 绿字/蓝字前缀 `[inspecto]`
- Debug: 🟤 灰字输出，带命名空间如 `[inspecto:ast]`

---

## 4. 实施清单

1. 扩展 `InspectoPluginOptions` 类型。
2. 在 `packages/plugin/src/utils/logger.ts` 中实现 `Logger` 工具。
3. 重构现有代码（搜索全局的 `console.log`）：
   - `packages/plugin/src/server/index.ts` 及其 router -> 替换为 `logger.debug` 或 `info`
   - `packages/plugin/src/index.ts` (Vite/Webpack hook) -> 清理冗余打印
   - `packages/plugin/src/config.ts` -> 替换掉警告信息为 `logger.warn`
4. 测试覆盖和验证。
