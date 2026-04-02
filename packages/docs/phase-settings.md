# Inspecto Settings Configuration Guide

> `settings.json` / `settings.local.json` configures IDE detection, AI tool selection, hotkeys, and per-tool behavior.
> For the configuration merge architecture, see [Configuration Design](./phase-config.md).

---

## 1. Complete Example (v2 Schema)

```jsonc
// .inspecto/settings.json
{
  // ── IDE (auto-detected via VS Code extension; override only if needed) ──
  // "vscode" is the only supported value for v1.0
  "ide": "vscode",

  // ── Preferred AI tool ────────────────────────────────────────────────────
  // Which tool and mode to dispatch to by default.
  "provider.default": "claude-code.cli",

  // ── Inspector behavior (browser-side) ────────────────────────────────────
  // Modifier key or combo to hold while clicking to activate inspector.
  // Allowed: "alt", "shift", "ctrl", "meta", "cmd", "alt+shift", "ctrl+shift", "meta+shift", "cmd+shift"
  // false = disable hotkey activation (toggle via the badge only)
  // Default: "alt"
  "inspector.hotKey": "alt",

  // Theme for the inspector panel.
  // Allowed: "light", "dark", "auto"
  // Default: "auto"
  "inspector.theme": "auto",

  // ── Prompt Injection Behavior ────────────────────────────────────────────
  // Whether to fetch and inject the component's raw source code into the prompt.
  // When using IDE-native AI tools (Copilot/Cursor/Trae), setting this to false
  // saves tokens because the AI can read the file directly.
  // Default: false
  "prompt.includeSnippet": false,

  // Whether to automatically send the prompt when opened in the AI tool.
  // false = fill input, user sends manually
  // true = prompt is submitted immediately after injection
  // Default: false
  "prompt.autoSend": false,

  // ── Per-tool overrides (CLI only) ────────────────────────────────────────
  "provider.claude-code.cli.bin": "claude", // executable name (resolved from PATH) or absolute path
  "provider.claude-code.cli.cwd": "${workspaceRoot}", // working directory for the CLI process

  "provider.codex.cli.coldStartDelay": 5000, // ms to wait for CLI REPL to start (first launch)
}
```

---

## 2. `provider.default` Resolution

```json
"provider.default": "claude-code.cli"
"provider.default": "copilot.extension"
```

The default provider strictly defines both the target tool and the execution mode.

---

## 3. Global Prompt Settings

Controlled globally via `prompt.*` properties:

### `prompt.autoSend`

- `false` (default): prompt is filled into the AI input box; user reviews and sends manually
- `true`: prompt is submitted immediately after injection

### `prompt.includeSnippet`

- `false` (default): Only sends file path and line number context
- `true`: Extracts and appends the source code snippet to the prompt

---

## 4. Inspector Settings

Controlled globally via `inspector.*` properties:

### `inspector.hotKey`

| Value               | Key               | Default    |
| ------------------- | ----------------- | ---------- |
| `"alt"`             | Option / Alt (⌥)  | ✅ Default |
| `"ctrl"`            | Control (⌃)       |            |
| `"meta"` or `"cmd"` | Command / Win (⌘) |            |
| `"shift"`           | Shift (⇧)         |            |
| `"alt+shift"`       | Option + Shift    |            |

```jsonc
{ "inspector.hotKey": "cmd+shift" }  // require ⌘ + ⇧ simultaneously
{ "inspector.hotKey": false }        // disable hotkeys entirely
```

### Priority

```
mountInspector({ hotKeys })   (JS API, highest)
    ↓
settings.json inspector.hotKey (fetched from /config at runtime)
    ↓
"alt"                         (built-in default)
```

`inspector.hotKey` is a runtime config — changes take effect on next page refresh without restarting the dev server.

### `inspector.theme`

Controls the color scheme of the browser-side Inspector panel.

- `"auto"` (default): Follows system/browser color scheme preference.
- `"light"`: Force light mode.
- `"dark"`: Force dark mode.

---

## 5. Tool Configuration Fields (CLI overrides)

For CLI modes, you can override default execution behavior:

| Field                 | Type       | Default            | Description                                       |
| --------------------- | ---------- | ------------------ | ------------------------------------------------- |
| `.cli.bin`            | `string`   | tool name          | Executable name or absolute path (CLI only)       |
| `.cli.args`           | `string[]` | `[]`               | Extra startup arguments (CLI only)                |
| `.cli.cwd`            | `string`   | `${workspaceRoot}` | Working directory (CLI only)                      |
| `.cli.coldStartDelay` | `number`   | `5000`             | Wait time (ms) for CLI REPL cold start (CLI only) |

### Variable Substitution (CLI only)

Supported in `cwd` and `args`:

| Variable           | Description                                    | Example                            |
| ------------------ | ---------------------------------------------- | ---------------------------------- |
| `${workspaceRoot}` | VS Code workspace root                         | `/Users/me/project`                |
| `${file}`          | Absolute path of clicked element's source file | `/Users/me/project/src/Button.tsx` |
| `${relativeFile}`  | File path relative to workspace root           | `src/Button.tsx`                   |
| `${fileDirname}`   | Directory containing the source file           | `/Users/me/project/src`            |

---

## 6. Common Scenarios

### VS Code + Claude Code CLI

```jsonc
{
  "provider.default": "claude-code.cli",
  "provider.claude-code.cli.bin": "claude",
  "provider.claude-code.cli.cwd": "${workspaceRoot}",
}
```

### VS Code + GitHub Copilot (extension)

```jsonc
{
  "provider.default": "copilot.extension",
  "prompt.autoSend": false,
}
```

### Personal local override (not committed)

```jsonc
// .inspecto/settings.local.json  ← add to .gitignore
{
  "provider.default": "claude-code.cli",
  "provider.claude-code.cli.bin": "/usr/local/bin/claude",
}
```
