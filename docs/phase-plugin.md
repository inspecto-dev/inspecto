# Phase Plugin: `@inspecto/plugin` Build Plugin Module

`@inspecto/plugin` is the core hub module connecting the front-end browser environment and the developer's local workflow. Built on the [unplugin](https://github.com/unjs/unplugin) framework, it shoulders the dual responsibilities of **build-time** code transformation and **run-time** local Dev Server communication for Inspecto.

## 1. Module Responsibilities and Positioning

If `@inspecto/core` solves the problem of "clicking elements on the page", then `@inspecto/plugin` solves the following key problems:

- **Source Mapping**: Which file and which line on the hard drive does this element correspond to?
- **Local Bridging**: How to break through the browser sandbox so user clicks can trigger actions on the local machine (like opening the IDE)?
- **Context Extraction**: Where does the "surrounding code snippet" desired by AI come from?
- **Cross-Platform Configuration**: How is the user's `.inspecto/settings.json` distributed to the front end and IDE plugins?

## 2. Core Mechanism Design

### 2.1 Universal Bundler Support

Leveraging the cross-platform nature of `unplugin`, this package exposes universal factory functions. Developers simply install this package in their business project and can directly import it as a plugin for Vite, Webpack, Rspack, Rollup, or Esbuild.

- Logic is activated only in development mode (`NODE_ENV !== 'production'`).
- Responsible for automatically starting a local Dev Server and listening in the background.

**Client Injection Differences Across Build Tools:**
To achieve "zero-configuration intrusion," the plugin adopts different injection strategies depending on the host environment (see the `src/injectors/` directory):

1. **Vite**: Uses `transformIndexHtml` and virtual modules (`/@id/__x00__virtual:inspecto-client`) to directly inject a `<script type="module">` into HTML for automatic mounting.
2. **Webpack / Rspack**: Uses `EntryPlugin` to dynamically bundle `@inspecto/core` as an additional entry point, and uses `HtmlWebpackPlugin` (or Next.js's `processAssets` hook) to inject initialization code with `window.InspectoClient.mountInspector` into the HTML/output.
3. **Rollup / Esbuild**: As pure JS, lower-level bundlers lacking a unified HTML processing ecosystem, no automatic injection is performed. Developers in these environments must **manually call** `import { mountInspector } from '@inspecto/core'` in their entry files to initialize it.

### 2.2 AST Source Code Transformation (Transform)

The module contains specialized AST parsers and transformers:

- `transform-jsx.ts`: Uses Babel to parse JSX/TSX syntax components (React/Preact/Solid).
- `transform-vue.ts`: Uses the Vue Compiler to process the Template syntax of `.vue` Single File Components.

**How it works**:
During the build phase, it intercepts code loading, traverses the AST to find all HTML tags or component root nodes, and automatically injects a `data-inspecto` attribute into them. The value is the absolute file path and line/column numbers (e.g., `data-inspecto="/src/App.tsx:12:4"`).

### 2.3 Local Development Server (Dev Server)

When the host build tool starts, `unplugin` spins up an independent local Node.js HTTP Server (using `portfinder` to automatically find an available port starting from `5678`). This Server acts as a middleware handling requests from the `@inspecto/core` Client:

- `GET /config`: Returns runtime configuration for the browser: available AI providers, `hotKeys`, `prompts`, and `providerOverrides`. Data sources: `serverState.ideInfo` registered via POST by the IDE extension + `settings.json`.
- `GET /snippet`: Based on the line/col numbers sent from the front end, it directly reads the corresponding source code from the local disk and extracts the surrounding code snippet.
- `POST /open`: Calls `launchIDE` to bring up the local editor and position the cursor.
- `POST /send-to-ai`: Receives element context from the front end, calculates the dispatch strategy based on `settings.json`, constructs a URI, and triggers the IDE extension via the OS layer.

**Port File Mechanism (Plugin ↔ IDE Extension Communication):**

Immediately after the Server starts successfully, it writes the actual port to `os.tmpdir()/inspecto.port`:

```typescript
// After startServer() successfully listens
fs.writeFileSync(path.join(os.tmpdir(), 'inspecto.port'), String(port), 'utf-8')
```

When the IDE extension activates, it preferentially reads this file. If the file does not exist, it falls back to scanning the `5678`–`5700` range.
The file is automatically deleted when the Server stops (`stopServer()`) or the process exits.

> See [phase-ide.md — Server Communication](./phase-ide.md#server-communication) for details.

### 2.4 Hierarchical Configuration and Merge System (Config Resolution)

`unplugin` plays the role of the global configuration manager (`config.ts`):

- Traces upwards to find directories up to the Git root, collecting all levels of `.inspecto/settings.json` and `.inspecto/prompts.json`.
- Supports the `.local.json` override merge mechanism, where array fields in `.local.json` replace (rather than merge with) arrays of the same name.
- Parses the user's fallback strategy (`prefer` → `builtin` → `plugin` → `cli`) and tool override parameters (like specifying `bin`, `cwd`, `env` for CLI tools), broadcasting them to the front end and IDE extensions via the `/config` response.

## 3. Workflow Diagram

```text
[IDE Extension Activation]
       │ Read os.tmpdir()/inspecto.port (Port file)
       │ POST /config → { ide, scheme, availableTargets, extensions }
       ▼
[@inspecto/plugin Local Server]  ←──────────────────────────────────┐
       │ Caches ideInfo, returns to browser on next GET /config      │
       │                                                           │
[Browser Inspecto Core]                                             │
       │ GET /config → Gets available AI tools + hotKeys + prompts  │
       │ User clicks DOM node with data-inspecto, menu pops up       │
       │ User clicks menu item (Prompt)                              │
       ▼                                                           │
(HTTP POST /send-to-ai)                                            │
       ▼                                                           │
[@inspecto/plugin Local Server]                                     │
       │ 1. Parses file / line / column                             │
       │ 2. GET /snippet → Reads source snippet from local disk      │
       │ 3. Reads settings.json, parses prefer → ToolMode            │
       │ 4. Constructs URI: {scheme}://inspecto.inspecto/send?target=...│
       │ 5. execFileSync('open', [uri]) → Triggers via OS layer      │
       ▼                                                           │
[IDE Extension URI Handler]  ────────────────────────────────────────┘
       │ Parses target / mode / prompt / overrides
       │ getStrategy(target, mode, ide)
       │ executeWithFallback(channels, payload)
       ▼
[AI Tool] → Copilot Chat / Cursor Chat / Trae Chat / Claude CLI / …
```

## 4. Summary

`@inspecto/plugin` is the bridge connecting front-end code, local disk files, and system-level development tools (IDE/Terminal). Relying on lightweight AST injection and an independent internal communication Server, it achieves a truly "non-intrusive" development experience—developers don't need to write any extra logic in their code; they just start the project and possess powerful AI traceability capabilities.
