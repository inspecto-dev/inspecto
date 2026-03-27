# Phase IDE — VS Code Extension (`packages/ide`)

## Overview

The IDE extension bridges the browser overlay to local AI assistants. It:

1. Registers a URI handler for `{scheme}://inspecto.inspecto/send`
2. Detects the running IDE and available AI tools at activation
3. Pushes IDE info to the local dev server so the browser knows what targets exist
4. Dispatches incoming prompts to the correct AI tool via a strategy pattern

## Architecture: Five-Step Dispatch Pipeline

```text
Browser Overlay                  Dev Server                    IDE Extension
───────────────                ────────────                 ─────────────────

User clicks Action in UI
        │
        ▼
 ┌───────────────┐
 │ 1. Build      │  POST /send-to-ai
 │    Request    │  { location, snippet, prompt }
 └──────┬────────┘
        │
        ▼
 ┌───────────────┐
 │ 2. Read Config│  Server reads .inspecto/settings.json
 │    & Resolve  │  Resolves: IDE → prefer target → ToolMode
 └──────┬────────┘  Builds exact URI: {scheme}://inspecto.inspecto/send?target=...
        │
        ▼
 ┌───────────────┐
 │ 3. Launch URI │  Server calls launchURI(uri) ──────────────────┐
 │    (OS Level) │  Triggering OS to open the registered IDE      │
 └───────────────┘                                                │
                                                                  ▼
                                                          ┌───────────────┐
                                                          │ 4. Receive    │  URI Handler receives target,
                                                          │    URI & Parse│  mode, prompt, overrides
                                                          └───────┬───────┘
                                                                  │
                                                                  ▼
                                                          ┌───────────────┐  VS Code:  extension-api → clipboard
                                                          │ 5. Execute    │  Cursor:   extension-api → native-chat → clipboard
                                                          │    Strategy   │  Trae:     extension-api → native-chat → clipboard
                                                          └───────────────┘  CLI mode: cli (spawn) → clipboard
```

---

## Package Structure

```
packages/ide/
├── src/
│   ├── extension.ts              # Activate / deactivate entry point
│   ├── uri-handler.ts            # URI handler (vscode/cursor/trae-cn scheme)
│   ├── ide-detector.ts           # Detect IDE type and available targets
│   ├── strategies/
│   │   ├── index.ts              # Strategy registry + getStrategy()
│   │   ├── types.ts              # IAiStrategy interface
│   │   ├── copilot.ts            # GitHub Copilot Chat
│   │   ├── claude-code.ts        # Claude Code plugin
│   │   ├── gemini-code-assist.ts # Gemini Code Assist plugin
│   │   ├── codex-plugin.ts       # Codex (openai.chatgpt) plugin
│   │   ├── cursor-chat.ts        # Cursor built-in chat
│   │   ├── trae-chat.ts          # Trae built-in chat
│   │   ├── claude-cli.ts         # Claude Code CLI
│   │   ├── gemini-cli.ts         # Gemini CLI
│   │   ├── codex-cli.ts          # Codex CLI
│   │   ├── coco-cli.ts           # Coco CLI
│   │   ├── utils/
│   │   │   └── cli-strategy.ts   # createCliStrategy() factory
│   │   └── injectors/
│   │       ├── cursor.ts         # Cursor-specific channel overrides (TODO)
│   │       └── trae.ts           # Trae-specific channel overrides (TODO)
│   ├── channels/
│   │   └── clipboard-fallback.ts # Last-resort: copy to clipboard + notify
│   └── utils/
│       └── clipboard.ts          # withClipboardGuard()
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

---

## Supported AI Tools

### Plugins

| Tool key             | Extension identifier      | Command used                                                                     |
| -------------------- | ------------------------- | -------------------------------------------------------------------------------- |
| `github-copilot`     | `github.copilot-chat`     | `workbench.action.chat.open` with `{ query, isPartialQuery }`                    |
| `claude-code`        | `anthropic.claude-code`   | `claude-vscode.editor.openLast` + clipboard paste                                |
| `gemini-code-assist` | `google.geminicodeassist` | `cloudcode.gemini.chatView.focus` + clipboard notify                             |
| `codex`              | `openai.chatgpt`          | `chatgpt.openSidebar` + clipboard notify                                         |
| `cursor-chat`        | _(Cursor built-in)_       | `aichat.newchataction` with `{ query, isPartialQuery }`                          |
| `trae-chat`          | _(Trae built-in)_         | `workbench.panel.chat.view.ai-chat.focus` + `editor.action.clipboardPasteAction` |

> **Note — Gemini and Codex**: these extensions do not expose a programmatic prompt
> injection API. The strategy opens their sidebar and copies the prompt to the clipboard
> with a toast notification prompting the user to paste.

> **Note — Trae Chat**: Trae's chat panel (`workbench.panel.chat.view.ai-chat.focus`)
> accepts focus and then clipboard paste via `editor.action.clipboardPasteAction`.
> The command `workbench.action.chat.icube.open.fromUri` is available but shows a
> confirmation dialog — the focus+paste approach is used instead for seamless UX.

### CLIs

| Tool key          | Default binary | Terminal name |
| ----------------- | -------------- | ------------- |
| `claude-code-cli` | `claude`       | `Claude CLI`  |
| `gemini-cli`      | `gemini`       | `Gemini CLI`  |
| `codex-cli`       | `codex`        | `CodeX CLI`   |
| `coco-cli`        | `coco`         | `Coco CLI`    |

All CLI strategies are generated by the `createCliStrategy()` factory
(`strategies/utils/cli-strategy.ts`). They share identical logic:
find or create a named terminal → send the binary to start the REPL
(with a configurable `coldStartDelay`) → paste the prompt via
`workbench.action.terminal.paste`.

### Native IDE Chats

| Tool key      | IDE    | Detection                               |
| ------------- | ------ | --------------------------------------- |
| `cursor-chat` | Cursor | `vscode.env.uriScheme === 'cursor'`     |
| `trae-chat`   | Trae   | `vscode.env.uriScheme.includes('trae')` |

---

## Strategy Pattern

Each AI tool implements `IAiStrategy`:

```typescript
interface IAiStrategy {
  readonly target: AiTarget
  readonly channels: ChannelDef[]
  preparePayload?(payload: AiPayload): AiPayload
}
```

A strategy holds an ordered `channels` array. The URI handler executes
the first channel; on failure it falls through to the next, with
`clipboard-fallback` always last.

```
extension-api  →  cli  →  clipboard-fallback
```

`getStrategy(tool, mode, ide)` in `strategies/index.ts`:

1. Resolves the map key (handles `claude-code` + `mode=cli` → `claude-code-cli`)
2. Clones the strategy to avoid mutating the singleton
3. `ide` parameter is retained in the signature for future IDE-specific channel overrides

---

## IDE Detection & Target Discovery

`ide-detector.ts` runs at extension activation:

```typescript
detectIde() // reads vscode.env.uriScheme → IdeType
resolveAvailableTargets() // checks installed extensions + PATH binaries
```

**Extension checks** (via `vscode.extensions.getExtension(id)`):

| Extension ID              | Target pushed        |
| ------------------------- | -------------------- |
| `github.copilot-chat`     | `github-copilot`     |
| `anthropic.claude-code`   | `claude-code`        |
| `google.geminicodeassist` | `gemini-code-assist` |
| `openai.chatgpt`          | `codex`              |

**CLI checks** (via `which <bin>`):

| Binary   | Target pushed     |
| -------- | ----------------- |
| `claude` | `claude-code-cli` |
| `gemini` | `gemini-cli`      |
| `codex`  | `codex-cli`       |
| `coco`   | `coco-cli`        |

---

## Activation

`package.json` uses `onCommand` activation events so the extension activates
in all VS Code-compatible IDEs (VS Code, Cursor, Trae CN):

```json
"activationEvents": [
  "onCommand:inspecto.toggle",
  "onCommand:inspecto.reportIde",
  "onUri"
]
```

> **Trae CN note**: `"onStartupFinished"` and `"*"` do not reliably activate
> extensions in Trae CN. `onCommand` is the only mechanism confirmed to work.
> The extension activates on first command invocation or URI handler call.

---

## Server Communication

On activation, the extension POSTs IDE info to the dev server:

```
POST http://localhost:{port}/config
{
  ide: IdeType,
  scheme: string,           // exact URI scheme (e.g. 'vscode', 'cursor', 'trae-cn')
  availableTargets: AiTool[],
  extensions: { copilot, cursorAi, traeAi }
}
```

### Port Discovery

The extension resolves the server port with a two-step strategy:

1. **Port file (fast path)**: reads `os.tmpdir()/inspecto.port`, written by the plugin the
   moment `startServer()` resolves. If the file exists and contains a valid port, only that
   one port is tried.
2. **Scan fallback**: if the file is absent (dev server not yet started, or different machine),
   tries ports `5678`–`5700` sequentially — the full window portfinder can allocate from.

```typescript
// resolveServerPorts() in extension.ts
const portFile = path.join(os.tmpdir(), 'inspecto.port')
// → [actualPort]  if file present
// → [5678..5700]  otherwise
```

### Retry Logic

If the POST fails (server not yet up), the extension retries with exponential backoff:

| Attempt | Delay     |
| ------- | --------- |
| 1       | immediate |
| 2       | 2 s       |
| 3       | 4 s       |
| 4       | 8 s       |
| 5       | 16 s      |

After 5 failed attempts the error is written to the **Inspecto** output channel.
The user can trigger a manual re-push via the `Inspecto: Push IDE Info` command.

---

## Open File (Trae)

The dev server `/open` endpoint uses `launchIDE({ editor })` from `launch-ide`.
When `ide === 'trae'`, it passes `editor: 'trae'` so the file opens in Trae CN
regardless of which IDE started the dev server:

```typescript
const editorHint = ide === 'cursor' ? 'cursor' : ide === 'trae' ? 'trae' : undefined
launchIDE({ file, line, column, editor: editorHint })
```

---

## ToolOverrides

The URI carries an optional `overrides` param (JSON-encoded `ToolOverrides`):

```typescript
interface ToolOverrides {
  type?: ToolMode
  binaryPath?: string // override CLI binary path
  args?: string[]
  autoSend?: boolean // send immediately vs. leave in input
  coldStartDelay?: number // ms to wait for CLI REPL to boot (default: 10000)
}
```

Configured per-tool in `.inspecto/settings.json`:

```json
{
  "providers": {
    "claude-code-cli": {
      "type": "cli",
      "bin": "/usr/local/bin/claude",
      "autoSend": true,
      "coldStartDelay": 5000
    }
  }
}
```

---

## Clipboard Utility

`utils/clipboard.ts` — `withClipboardGuard(text, action)`:

- Writes `text` to the clipboard
- Executes `action` (command string or async function)
- Does **not** restore the previous clipboard value — restoring races
  with asynchronous terminal paste and causes the wrong content to be pasted

---

## Build & Install

```bash
cd packages/ide
pnpm build           # tsup → dist/extension.js (CJS)
pnpm package         # vsce package → inspecto-0.1.0.vsix
code --install-extension inspecto-0.1.0.vsix --force
# Then: Reload Window in VS Code/Cursor

# For Trae CN — install via drag-and-drop or extension manager (VSIX)
# Must fully quit and restart Trae CN after install for activation to work
```

**Manual URI test:**

```bash
# VS Code
open "vscode://inspecto.inspecto/send?target=github-copilot&prompt=Hello%20World"

# Trae CN
open "trae-cn://inspecto.inspecto/send?target=trae-chat&mode=plugin&prompt=Hello%20World"

# Cursor
open "cursor://inspecto.inspecto/send?target=cursor-chat&mode=plugin&prompt=Hello%20World"
```
