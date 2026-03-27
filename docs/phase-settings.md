# Inspecto Settings Configuration Guide

> `settings.json` / `settings.local.json` configures IDE detection, AI tool selection, hotkeys, and per-tool behavior.
> For the configuration merge architecture, see [Configuration Design](./phase-config.md).

---

## 1. Complete Example

```jsonc
// .inspecto/settings.json
{
  // ── IDE (auto-detected via VS Code extension; override only if needed) ──
  // "vscode" is the only supported value for v1.0
  "ide": "vscode",

  // ── Preferred AI tool ────────────────────────────────────────────────────
  // Which tool to dispatch to by default.
  // Must match a key in "providers", or be "builtin" (IDE-native chat).
  "prefer": "claude-code",

  // ── Hotkeys (hold and click to activate inspector) ────────────────────
  // "altKey" | "ctrlKey" | "metaKey" | "shiftKey"
  // Combine multiple keys: all must be held simultaneously.
  // false = disable hotkey activation (toggle via the badge only)
  // Default: ["altKey"]
  "hotKeys": ["altKey"],

  // ── Snippet Injection ────────────────────────────────────────────────────
  // Whether to fetch and inject the component's raw source code into the prompt.
  // When using IDE-native AI tools (Copilot/Cursor/Trae), setting this to false
  // saves tokens because the AI can read the file directly.
  // Default: false
  "includeSnippet": false,

  // ── Per-tool configuration ───────────────────────────────────────────────
  "providers": {
    "github-copilot": {
      "type": "plugin",
      "autoSend": false,
    },

    "claude-code": {
      "type": "cli",
      "bin": "claude", // executable name (resolved from PATH) or absolute path
      "cwd": "${workspaceRoot}", // working directory for the CLI process
      "autoSend": false, // false = fill input, user sends manually
    },

    "codex": {
      "type": "cli",
      "bin": "codex",
      "cwd": "${workspaceRoot}",
      "coldStartDelay": 5000, // ms to wait for CLI REPL to start (first launch)
    },
  },
}
```

---

## 2. `prefer` Resolution

```
prefer: "claude-code"         →  dispatches to providers.claude-code
prefer: "github-copilot"   →  dispatches to providers.github-copilot
```

If `prefer` is not set, the first key in `providers` is used as the default target.

---

## 3. `autoSend`

Controlled per-tool via `providers.<tool>.autoSend`:

```
providers.<tool>.autoSend   (per-tool, highest priority)
    ↓ if undefined
false                        (built-in default)
```

- `false` (default): prompt is filled into the AI input box; user reviews and sends manually
- `true`: prompt is submitted immediately after injection

---

## 4. `hotKeys`

### Allowed Values

| Value        | Key               | Default    |
| ------------ | ----------------- | ---------- |
| `"altKey"`   | Option / Alt (⌥)  | ✅ Default |
| `"ctrlKey"`  | Control (⌃)       |            |
| `"metaKey"`  | Command / Win (⌘) |            |
| `"shiftKey"` | Shift (⇧)         |            |

```jsonc
{ "hotKeys": ["altKey", "shiftKey"] }  // require ⌥ + ⇧ simultaneously
{ "hotKeys": false }                   // disable hotkeys entirely
```

### Priority

```
mountInspector({ hotKeys })   (JS API, highest)
    ↓
settings.json hotKeys         (fetched from /config at runtime)
    ↓
["altKey"]                    (built-in default)
```

`hotKeys` is a runtime config — changes take effect on next page refresh without restarting the dev server.

---

## 5. Tool Configuration Fields

| Field            | Type                  | Default            | Description                                             |
| ---------------- | --------------------- | ------------------ | ------------------------------------------------------- |
| `type`           | `"plugin"` \| `"cli"` | auto-detected      | How the tool is launched (overrides automatic fallback) |
| `bin`            | `string`              | tool name          | Executable name or absolute path (CLI only)             |
| `args`           | `string[]`            | `[]`               | Extra startup arguments (CLI only)                      |
| `cwd`            | `string`              | `${workspaceRoot}` | Working directory (CLI only)                            |
| `autoSend`       | `boolean`             | `false`            | Whether to submit the prompt immediately                |
| `coldStartDelay` | `number`              | `5000`             | Wait time (ms) for CLI REPL cold start (CLI only)       |

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
  "prefer": "claude-code",
  "providers": {
    "claude-code": {
      "type": "cli",
      "bin": "claude",
      "cwd": "${workspaceRoot}",
    },
  },
}
```

### VS Code + GitHub Copilot (plugin)

```jsonc
{
  "prefer": "github-copilot",
  "providers": {
    "github-copilot": {
      "type": "plugin",
      "autoSend": false,
    },
  },
}
```

### VS Code + Copilot preferred, Claude CLI as secondary

```jsonc
{
  "prefer": "github-copilot",
  "providers": {
    "github-copilot": {
      "type": "plugin",
      "autoSend": false,
    },
    "claude-code": {
      "type": "cli",
      "bin": "claude",
      "cwd": "${workspaceRoot}",
    },
  },
}
```

### Personal local override (not committed)

```jsonc
// .inspecto/settings.local.json  ← add to .gitignore
{
  "prefer": "claude-code",
  "providers": {
    "claude-code": {
      "type": "cli",
      "bin": "/usr/local/bin/claude",
    },
  },
}
```
