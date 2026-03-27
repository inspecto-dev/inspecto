# Inspecto User Onboarding Design (Final)

> Core Goal: Reduce cognitive load, minimize configuration steps, and accelerate time-to-first-value.
>
> Design Principle: **One-command start, zero-config ready, progressive customization.**

---

## 1. Current Pain Points Analysis

| Pain Point                   | Description                                                                                                    |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Too many steps**           | Install npm package → Edit build config → Install IDE extension → Configure `settings.json` (At least 4 steps) |
| **Complex Config**           | Deeply nested `settings.json` structure, three-layer mapping of IDE / plugin / cli. New users get lost easily. |
| **Cold Start Delay**         | CLI cold start requires users to manually tune `cliColdStartDelay`, leading to a fragmented experience.        |
| **Weak Framework Awareness** | Users must decide whether to use `vitePlugin`, `webpackPlugin`, or `rspackPlugin` manually. No auto-detection. |
| **Zero Feedback**            | No clear "success signal" after installation. Users aren't sure if it's working.                               |

---

## 2. Design Solution

### 2.1 One-Click Initialization CLI (`npx inspecto init`)

Replace the manual 4-step process with an interactive CLI:

```bash
npx inspecto init
```

**Execution Flow:**

```
$ npx inspecto init

  ✦ Inspecto Setup

  ✔ Detected: Vite + React (vite.config.ts)
  ✔ Detected: Trae (IDE)
  ✔ Detected AI Tools: Claude (CLI), GitHub Copilot (Plugin)
  ✔ Installed @inspecto/plugin as devDependency
  ✔ Backed up vite.config.ts → vite.config.ts.bak
  ✔ Injected plugin into vite.config.ts
  ✔ Created .inspecto/settings.json (default)
  ✔ IDE extension installed

  ⚡ Ready! Hold Alt + Click any element to inspect.
```

#### 2.1.1 `init` Internal Flow

```
npx inspecto init
│
├─ 1. Detect Project Environment
│     ├─ package.json existence
│     ├─ Package Manager (bun, pnpm, yarn, npm)
│     ├─ Build Tool & Meta-framework (Next.js, Vite, Webpack, Rspack, Rsbuild)
│     └─ IDE Detection (Env vars priority -> Directory fallback)
│
├─ 2. Detect AI Tools
│     ├─ Scan for CLI tools in PATH (claude, coco, codex, gemini)
│     ├─ Scan for IDE Plugins in extensions dir (copilot, claude-code, etc.)
│     └─ Merge and prompt user for selection if multiple found
│
├─ 3. Install Dependencies
│     └─ Execute add -D @inspecto/plugin via detected package manager
│
├─ 4. Inject Build Plugin (Safe Mode)
│     ├─ Backup original config file (.bak)
│     ├─ AST parsing of build config
│     ├─ Insert inspecto() into plugins array
│     ├─ Add corresponding import statement (handles legacy rspack < 0.4.0)
│     ├─ Idempotency check: skip if already exists
│     └─ Parse failure: Graceful Degradation → output manual code snippet
│
├─ 5. Generate Default Config & Record Changes
│     ├─ Create .inspecto/settings.json (minimal default with `prefer` and `providers`)
│     └─ Update .gitignore with fine-grained rules (.inspecto/install.lock, etc.)
│
├─ 6. IDE Extension Auto-Installation (Waterfall Fallback)
│     ├─ Level 1: CLI command (e.g., code --install-extension)
│     ├─ Level 2: Search exact binary paths across OS (macOS, Linux, Win)
│     ├─ Level 3: URI scheme (vscode:extension/...)
│     └─ Level 4: Fallback to manual Marketplace link
│
└─ 7. Output Result Summary
      ├─ Success list (with paths of modified files)
      ├─ Warning if manual steps are required
      └─ Usage instructions
```

#### 2.1.2 Build Tool & Framework Detection Matrix

`init` covers the following detection matrix.

| Target      | Detection Method                     | Config Entry        | Injection Strategy                                              |
| :---------- | :----------------------------------- | :------------------ | :-------------------------------------------------------------- |
| **Rsbuild** | `rsbuild.config.*` + `@rsbuild/core` | `rsbuild.config.ts` | Standard plugins array injection                                |
| **Vite**    | `vite.config.*` + `vite`             | `vite.config.ts`    | Standard plugins array injection                                |
| **Webpack** | `webpack.config.*` + `webpack`       | `webpack.config.js` | Standard plugins array injection                                |
| **Rspack**  | `rspack.config.*` + `@rspack/core`   | `rspack.config.js`  | Standard plugins array injection (special import for `< 0.4.0`) |
| **Next.js** | `next.config.*` + `next`             | `next.config.mjs`   | Wrapper for Next.js webpack plugin format                       |

**Interactive Ambiguity Resolution:**

If multiple valid configuration files are found, the CLI will trigger an interactive prompt for the user to select the correct target, rather than guessing incorrectly.

#### 2.1.3 AST Injection Safety Mechanism (Defensive Programming)

AST injection is the **highest technical risk** step. User configurations vary wildly.

**Enforced Safety Protocol:**

1. **Backup (Mandatory):** Generate a `.bak` file before modifying.
2. **Idempotency Check:** Verify if `@inspecto/plugin` is already imported or used in the AST. Skip if true.
3. **Bracket Balance:** Validate that the resulting code maintains balanced brackets/braces.
4. **Graceful Degradation:** If AST parsing fails or is deemed unsafe, fallback to highlighting manual configuration steps in the terminal.

#### 2.1.4 IDE Extension Auto-Installation (Waterfall Fallback)

Exhaust all automated paths before falling back to manual links:

```typescript
// Level 1: Direct CLI Command
await exec(`${ideCommand} --install-extension ${extId}`)

// Level 2: OS-Specific Binary Paths
// macOS: /Applications/Visual Studio Code.app/.../bin/code
// Linux: /usr/share/code/bin/code | /snap/code/...
// Win: %LOCALAPPDATA%\Programs\Microsoft VS Code\bin\code.cmd

// Level 3: URI Scheme
// macOS: open, Linux: xdg-open, Windows: start
const uri = `${ideScheme}:extension/${extId}`

// Level 4: Manual Fallback
// Output Marketplace URL and manual instructions
```

#### 2.1.5 Dual-Mode AI Tool Detection

The CLI intelligently detects AI tools that can operate in different modes:

- **CLI Mode**: Tools available in the terminal `$PATH` (e.g., `claude`, `coco`).
- **Plugin Mode**: Tools installed as IDE extensions (e.g., GitHub Copilot, Claude Code).

If a tool supports both (e.g., Claude), the CLI merges the detections and presents a unified option in the interactive prompt, allowing the user to select their preferred interaction mode. This selection is then written accurately to `.inspecto/settings.json` under the `providers.[id].type` field.

#### 2.1.6 Fine-Grained `.gitignore` Strategy

Instead of ignoring the entire `.inspecto/` directory, the CLI injects fine-grained rules:

```gitignore
# Inspecto
.inspecto/install.lock
.inspecto/cache.json
.inspecto/*.local.json
```

This ensures that `settings.json` (which contains team-shared configurations like `prefer`) can be safely committed to version control, while machine-specific locks and caches are ignored.

---

### 2.2 Zero-Config Default Experience

**Minimalist `settings.json` Schema:**

```json
{
  "prefer": "claude-code",
  "providers": {
    "claude-code": {
      "type": "cli"
    }
  }
}
```

The CLI handles the complex nested configurations automatically. The user only needs to see the top-level `prefer` and `providers` fields.

---

### 2.3 Diagnostic Command (`npx inspecto doctor`)

```bash
npx inspecto doctor
```

Provides a health check of the environment:

- Verifies framework and build tool compatibility.
- Validates IDE support (VS Code, Cursor, Trae, Windsurf, WebStorm).
- Lists all detected AI tools (CLI and Plugin modes).
- Checks for existing Inspecto configurations.

---

### 2.4 Precision Teardown (`npx inspecto teardown`)

```bash
npx inspecto teardown
```

Provides a clean uninstallation process:

- Uninstalls `@inspecto/plugin` and `@inspecto/cli`.
- Uses AST transformation to safely remove the plugin injection from the build configuration file.
- Deletes the `.inspecto` directory.
- Cleans up `.gitignore` entries.

---

## 3. Implementation Tracking (Completed)

| Priority | Feature                                    | Status | Notes                                                    |
| :------: | :----------------------------------------- | :----: | :------------------------------------------------------- |
|  **P0**  | `npx inspecto init` CLI Initialization     |   ✅   | Implemented in `packages/cli/src/commands/init.ts`       |
|  **P0**  | AST Injection Safety Mechanism             |   ✅   | Implemented in `packages/cli/src/inject/ast-injector.ts` |
|  **P0**  | Build Tool Detection (Rsbuild, Vite, etc.) |   ✅   | Implemented in `packages/cli/src/detect/build-tool.ts`   |
|  **P1**  | Dual-Mode AI Tool Detection (CLI + Plugin) |   ✅   | Implemented in `packages/cli/src/detect/ai-tool.ts`      |
|  **P1**  | IDE Detection (Env Vars + Directory)       |   ✅   | Implemented in `packages/cli/src/detect/ide.ts`          |
|  **P1**  | IDE Extension Waterfall Installation       |   ✅   | Implemented in `packages/cli/src/inject/extension.ts`    |
|  **P1**  | Interactive Prompts & Stdin Management     |   ✅   | Handled gracefully with `process.stdin.pause()`          |
|  **P1**  | `npx inspecto doctor` Diagnostic Command   |   ✅   | Implemented in `packages/cli/src/commands/doctor.ts`     |
|  **P2**  | Precision `teardown` Command               |   ✅   | Implemented in `packages/cli/src/commands/teardown.ts`   |
|  **P2**  | Fine-grained `.gitignore` Strategy         |   ✅   | Implemented in `packages/cli/src/inject/gitignore.ts`    |
