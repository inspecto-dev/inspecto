# Compatibility Checklist

## Supported Environments

### UI Frameworks

| Framework | Supported Versions | Notes                                                                                      |
| :-------- | :----------------- | :----------------------------------------------------------------------------------------- |
| React     | >= 16.8.0          | Supported via JSX/TSX AST transformation.                                                  |
| Vue       | >= 3.0.0           | Supported via Vue SFC compiler. Vue 2 is currently not supported.                          |
| Svelte    | >= 4.0.0           | Supported via Svelte compiler (Svelte 4 & Svelte 5).                                       |
| Solid     | >= 1.0.0           | Supported via JSX/TSX AST transformation.                                                  |
| Astro     | >= 4.0.0           | Supported via Astro compiler transforms plus the `@inspecto-dev/plugin/astro` integration. |

### Build Tools

| Build Tool | Supported Versions | Notes                                                                           |
| :--------- | :----------------- | :------------------------------------------------------------------------------ |
| Vite       | >= 2.0.0           | Full support with automatic client injection.                                   |
| Webpack    | >= 4.0.0           | Recognized by the CLI. Plugin registration currently requires manual follow-up. |
| Rspack     | >= 0.1.0           | Recognized by the CLI. Plugin registration currently requires manual follow-up. |
| Rsbuild    | >= 0.1.0           | Recognized by the CLI. Plugin registration currently requires manual follow-up. |
| Rollup     | >= 2.0.0           | Build-time injection supported. Client needs manual initialization.             |
| esbuild    | >= 0.14.0          | Build-time injection supported. Client needs manual initialization.             |

### Supported Bundlers & Frameworks (Quick Reference)

- Vite (React, Vue)
- Webpack 5 (React, Vue)
- Webpack 4 (React, Vue) - Supported via legacy plugin
- Rspack / Rsbuild (React, Vue)
- Next.js (Webpack-based, experimental)
- Nuxt.js (Vite-based)

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
- A desktop environment with `xdg-open`
