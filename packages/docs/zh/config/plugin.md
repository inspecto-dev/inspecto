# 构建插件配置

构建插件的配置选项会传递给 unplugin 包装器（例如在 `vite.config.ts`, `webpack.config.js` 或 `rspack.config.js` 中），用于控制代码在编译时如何被注入和处理。

## 配置示例

::: code-group

```typescript [Vite]
// vite.config.ts
import { defineConfig } from 'vite'
import { vitePlugin as inspecto } from '@inspecto-dev/plugin'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    inspecto({
      pathType: 'absolute',
      escapeTags: ['template', 'script', 'style', 'Fragment'],
      attributeName: 'data-inspecto',
      include: ['**/*.{js,jsx,ts,tsx,vue}'],
      exclude: ['node_modules/**', 'dist/**'],
    }),
  ],
})
```

```javascript [Webpack]
// webpack.config.js
const { webpackPlugin: inspecto } = require('@inspecto-dev/plugin')

module.exports = {
  plugins: [
    inspecto({
      pathType: 'absolute',
      // ...其他选项
    }),
  ],
}
```

```typescript [Rspack]
// rspack.config.ts
import { rspackPlugin as inspecto } from '@inspecto-dev/plugin'

export default {
  plugins: [
    inspecto({
      pathType: 'absolute',
      // ...其他选项
    }),
  ],
}
```

:::

## 选项参考

### `pathType`

- **类型:** `'absolute' | 'relative'`
- **默认值:** `'absolute'`
- **描述:** 注入到 `data-inspecto` 属性中的路径类型。`'absolute'` (绝对路径) 对于 monorepo 和含有软链接依赖（如 pnpm 的 virtual store）的项目来说更安全。

### `escapeTags`

- **类型:** `string[]`
- **默认值:** `['template', 'script', 'style', 'Transition', 'TransitionGroup', 'KeepAlive', 'Teleport', 'Suspense', 'Fragment', ...]`
- **描述:** 不需要注入源码位置信息的 HTML/组件标签名。这对于排除框架内置的特殊标签非常有用。

### `attributeName`

- **类型:** `string`
- **默认值:** `'data-inspecto'`
- **描述:** 用于存储源码坐标的 DOM 属性名。只有当 `'data-inspecto'` 与你项目中的其他工具冲突时才需要修改。

### `include`

- **类型:** `string[]`
- **默认值:** `[]`
- **描述:** 需要进行 AST 转换的文件匹配模式 (基于 picomatch)。默认已包含 `.jsx, .tsx, .js, .ts, .vue` 等常见文件后缀。

### `exclude`

- **类型:** `string[]`
- **默认值:** `[]`
- **描述:** 排除不进行转换的文件匹配模式。`node_modules` 和 `dist` 目录会被默认自动排除。

### `logLevel`

- **类型:** `'info' | 'warn' | 'error' | 'silent'`
- **默认值:** `'warn'`
- **描述:** 控制控制台打印的日志级别。
