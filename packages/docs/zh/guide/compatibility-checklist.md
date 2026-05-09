# 兼容性清单

## 支持的环境

### UI 框架

| 框架   | 支持的版本 | 说明                                                                      |
| :----- | :--------- | :------------------------------------------------------------------------ |
| React  | >= 16.8.0  | 通过 JSX/TSX AST 转换提供支持。                                           |
| Vue    | >= 3.0.0   | 通过 Vue SFC 编译器提供支持。目前暂不支持 Vue 2。                         |
| Svelte | >= 4.0.0   | 通过 Svelte 编译器提供支持（支持 Svelte 4 和 Svelte 5）。                 |
| Solid  | >= 1.0.0   | 通过 JSX/TSX AST 转换提供支持。                                           |
| Astro  | >= 4.0.0   | 通过 Astro 编译转换与 `@inspecto-dev/plugin/astro` integration 提供支持。 |

### 构建工具

| 构建工具 | 支持的版本 | 说明                                         |
| :------- | :--------- | :------------------------------------------- |
| Vite     | >= 2.0.0   | 完全支持，自动注入客户端脚本。               |
| Webpack  | >= 4.0.0   | CLI 可识别，当前仍需手动补充插件注册。       |
| Rspack   | >= 0.1.0   | CLI 可识别，当前仍需手动补充插件注册。       |
| Rsbuild  | >= 0.1.0   | CLI 可识别，当前仍需手动补充插件注册。       |
| Rollup   | >= 2.0.0   | 支持构建时代码注入。客户端脚本需手动初始化。 |
| esbuild  | >= 0.14.0  | 支持构建时代码注入。客户端脚本需手动初始化。 |

### 支持的打包器与框架（快速参考）

- Vite (React, Vue)
- Webpack 5 (React, Vue)
- Webpack 4 (React, Vue) - 通过 legacy plugin 支持
- Rspack / Rsbuild (React, Vue)
- Next.js (基于 Webpack，实验性支持)
- Nuxt.js (基于 Vite)

### macOS

- VS Code
- Cursor
- Trae / Trae CN
- Chrome
- Safari

### Windows

- VS Code
- Cursor
- Chrome
- Edge

### Linux

- VS Code
- Chrome
- 带有 `xdg-open` 的桌面环境
