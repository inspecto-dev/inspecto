# User Settings

Runtime behaviors, hotkeys, AI targets, and other preferences are configured using JSON settings files. These files allow you to customize how the browser inspector behaves and which AI tools it communicates with, without touching your build configuration.

Most first-time setups do not require editing this file manually. Start with assistant-first onboarding or `inspecto init`, then come back to this page only when you want to customize runtime behavior.

## File Resolution

Inspecto looks for configuration files in your project directory in the following order of precedence (highest to lowest):

1. `<cwd>/.inspecto/settings.local.json`
2. `<cwd>/.inspecto/settings.json`
3. ... intermediate directories up to git root ...
4. `<gitRoot>/.inspecto/settings.local.json`
5. `<gitRoot>/.inspecto/settings.json`
6. `~/.inspecto/settings.json` (Global user home directory)

**Best Practice:**

- Use `settings.json` for shared team configurations and commit it to Git.
- Use `settings.local.json` for personal overrides. The CLI automatically adds this file to your `.gitignore`.

## Example Configuration

```json
{
  "inspector.hotKey": "alt",
  "inspector.theme": "auto",
  "ide": "vscode",
  "provider.default": "copilot.extension",
  "prompt.includeSnippet": false,
  "prompt.autoSend": false,
  "provider.claude-code.cli.bin": "claude",
  "provider.coco.cli.bin": "coco"
}
```

## Settings Reference

### `inspector.hotKey`

- **Type:** `string | false`
- **Default:** `"alt"`
- **Description:** Activation hotkeys. Can be combinations like `"cmd+shift"`, `"ctrl"`, `"metaKey"`. Set to `false` to disable hotkey activation.

### `inspector.theme`

- **Type:** `"light" | "dark" | "auto"`
- **Default:** `"auto"`
- **Description:** Theme for the inspector panel in the browser. `"auto"` follows system preferences.

### `ide`

- **Type:** `"vscode" | "cursor" | "trae" | "trae-cn"`
- **Default:** Auto-detected
- **Description:** Force a specific IDE context. If omitted, Inspecto resolves the IDE from the current environment and project context.

### `provider.default`

- **Type:** `string`
- **Example:** `"copilot.extension"`, `"claude-code.cli"`, `"trae.builtin"`
- **Description:** The default AI tool and mode to dispatch the code context to. Assistant-first onboarding can often resolve this automatically, so most users do not need to set it before first use.

### `prompt.includeSnippet`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Whether to inject the raw code snippet into the prompt. Setting this to `false` saves tokens when using IDE-native AI tools (like Copilot, Cursor, Trae), as they can read the local file directly.

### `prompt.autoSend`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Submit the prompt automatically without waiting for user review or pressing Enter. Only supported by some assistant and IDE combinations. Unsupported targets may still open the prompt without submitting it.

### Inspect Menu Customization (`prompts.json`)

To keep configurations tidy, the intent menu popup configurations are kept in a separate file: `.inspecto/prompts.json` (and `.inspecto/prompts.local.json`).

- **Type:** `Array<string | IntentConfig> | { $replace: true, items: Array<string | IntentConfig> }`
- **Default:** Built-in list of common prompts
- **Description:** Customize the built-in AI actions shown inside the inspect menu after you select a component in `Inspect mode`.

**IntentConfig Structure:**

- `id` (string): Unique identifier.
- `label` (string): Text displayed on the menu button.
- `prompt` (string): The base prompt template.
- `aiIntent` (`"ask" | "fix" | "review" | "redesign"`): Required semantic intent used by Inspecto defaults such as context attachment behavior.
- `prependPrompt` (string, optional): Text to prepend to the base prompt (concatenated with newlines).
- `appendPrompt` (string, optional): Text to append to the base prompt.
- `enabled` (boolean, optional): Set to `false` to hide this item without removing its configuration.

Source jumping is not configured through `prompts.json`. `Open in Editor` remains a built-in inspect action exposed from the menu header.

Evidence entry points are also not configured through `prompts.json` or `settings.json`.

- `bug` and `css` are built-in UI capabilities, not user schema fields.
- Inspecto shows them by default when the corresponding runtime capability is available.
- If the capability is unavailable in the current project or target, Inspecto hides the entry automatically.
- Whether evidence is actually attached is controlled by the in-session icon toggle, not by persisted user config.
- `screenshot` is currently withheld from the UI in v1 annotate flows and should not be modeled as a user setting.

**Array Syntax (Append mode, default):**
Export an array directly in `prompts.json`. Your configuration will append to or overwrite the built-in prompts.

```json
[
  {
    "id": "add-i18n",
    "label": "Add i18n",
    "aiIntent": "review",
    "prompt": "Please extract the hardcoded text in {{file}} and use i18next for internationalization."
  },
  {
    "id": "explain",
    "label": "Explain in Chinese",
    "aiIntent": "ask",
    "prependPrompt": "You are a Frontend Expert. Reply in Chinese."
  }
]
```

**Object Syntax (Replace mode):**
Export an object with `$replace: true` in `prompts.json` to completely discard the built-in menu items, rendering only the `items` you provide.

```json
{
  "$replace": true,
  "items": [
    {
      "id": "improve",
      "label": "Improve for readability",
      "aiIntent": "review",
      "prompt": "Review the code in {{file}} and suggest practical readability improvements."
    }
  ]
}
```

> **Compatibility Note:** In earlier versions, this configuration might have been placed under the `"prompts"` field in `settings.json`. Inspecto still supports reading a `prompts.json` containing `{"prompts": [...]}` for backwards compatibility, but exporting an array or object at the top level is recommended.

**Supported Variables in Prompt Templates:**

- `{{file}}`: File path of the current component
- `{{line}}`: Source code line number
- `{{column}}`: Source code column number
- `{{name}}`: Component name (e.g., the "Button" in `Button.tsx`, or inferred from snippet)
- `{{ext}}`: File extension (e.g., `tsx`, `vue`)
- `{{framework}}`: Auto-inferred framework name (e.g., `React`, `Vue`, `Svelte`)

---

### Tool Overrides (`provider.<name>.<mode>.<option>`)

Per-tool configuration using a flat dot-notation format. `<name>` is the tool's core brand name (e.g., `copilot`, `claude-code`). `<mode>` is `extension`, `cli` or `builtin`.

Treat these as advanced overrides. Most users do not need them for initial setup.

- **`bin`**: CLI executable name or absolute path (CLI mode only).
- **`args`**: Extra startup arguments array (CLI mode only).
- **`cwd`**: Working directory for the CLI process (CLI mode only).
- **`coldStartDelay`**: Delay in milliseconds to wait for CLI initialization.

## CLI Cold Start Delay

When using CLI tools like `claude-code` or `coco` directly via the terminal integration, the extension needs to wait for the CLI tool to fully initialize its interactive REPL before pasting the initial prompt.

Because initialization time heavily depends on your machine's performance, network speed, and node module resolution, **the default delay is set to a safe 5 seconds (5000ms)** for the very first execution.

You can configure this delay to better match your system's performance:

```json
{
  "provider.claude-code.cli.coldStartDelay": 2000
}
```

> **Note:** If you set this value too low, the CLI might clear the terminal buffer during its boot sequence, causing your initial prompt to be lost. This delay _only_ applies to the first time the CLI is launched. Subsequent requests will execute instantly.
