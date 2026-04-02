# inspecto — Claude Code Development Guide

## Project Overview

`inspecto` is an open-source monorepo tool that bridges browser DOM inspection
with local AI assistants (GitHub Copilot, Claude Code, Claude Code CLI, Coco CLI). Developers click any page
element → the tool extracts source location + surrounding code → injects it as context
into the AI tool of choice.

## Monorepo Structure

```
inspecto/
├── packages/
│   ├── types/           # Shared TypeScript protocol types
│   ├── unplugin/        # Build plugin (Vite/Webpack/Rspack/Rollup) — AST injection (React & Vue)
│   ├── core/            # Browser runtime: Web Component UI + HTTP server client
│   │   ├── src/client/  # Web Component (pure native DOM + Goober, Shadow DOM)
│   │   └── src/server/  # Local HTTP server + portfinder
│   ├── react/           # React thin wrapper (<Inspecto> component)
│   ├── vue/             # Vue thin wrapper (<Inspecto> component)
│   └── ide/             # IDE Extension (GitHub Copilot, Claude Code, CLIs strategies)
├── playground/          # Outside monorepo — manual test apps (React+Vite, Vue+Vite, Next.js)
└── docs/                # This directory
```

## Development Phases (load each file as needed)

| File                       | Phase | Contents                                      | Size  |
| -------------------------- | ----- | --------------------------------------------- | ----- |
| `docs/phase-0-monorepo.md` | 0     | Monorepo skeleton, pnpm workspaces, Turborepo | ~2KB  |
| `docs/phase-1-types.md`    | 1     | Protocol types, shared interfaces             | ~4KB  |
| `docs/phase-2-unplugin.md` | 2     | unplugin + AST transform (MagicString)        | ~24KB |
| `docs/phase-3-core.md`     | 3     | Browser core: Web Component + HTTP server     | ~12KB |
| `docs/phase-4-react.md`    | 4     | React & Vue wrapper packages                  | ~8KB  |
| `docs/phase-5-vscode.md`   | 5     | VS Code Extension (Strategies & UI)           | ~10KB |
| `docs/phase-6-verify.md`   | 6     | Playground verification                       | ~3KB  |
| `docs/phase-7-oss.md`      | 7     | Testing, CI/CD, OSS release                   | ~5KB  |

## Key Architectural Decisions

- **Build transform**: `MagicString` (not `@babel/generator`) for reliable source maps
- **Server**: Separate HTTP server via `portfinder` (not dev server middleware) — follows code-inspector pattern
- **IDE launch**: `child_process.execSync` to directly open `vscode://` URIs (avoids silent failures of `launch-ide` on macOS)
- **UI**: Pure native DOM + Goober CSS-in-JS inside Shadow DOM Web Component — zero framework dependency
- **Framework layers**: Thin wrapper components only (`<Inspecto>`) — mounts Web Component
- **Attribute**: `data-inspecto="filepath:line:col"` injected at compile time for Vue and React files
- **HotKeys**: `HotKey[]` array type, default `['altKey']`, configurable
- **pathType**: `'relative' | 'absolute'` (default `'absolute'`) — avoids monorepo alias issues
- **escapeTags**: Skip injection for framework-internal elements

## Critical Constraints

1. All packages use `"type": "module"` + dual CJS/ESM output via `tsup`
2. `data-inspecto` attributes are **only injected** when `NODE_ENV !== 'production'`
3. Web Component uses Shadow DOM — styles are fully isolated
4. HTTP server uses `portfinder` starting from port 5678
5. Never use hardcoded async delays — use Promise chains from `launch-ide`

## Current Status

Project is fully implemented, featuring AST transformations for React (`.tsx`, `.jsx`) and Vue (`.vue`) files, proper integration with local VS Code via extensions, and support for Copilot Chat, Claude Code, and standalone CLIs (Claude CLI, Coco CLI).
