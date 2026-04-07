# Inspecto Prompts Configuration

> `prompts.json` / `prompts.local.json` controls the list of AI actions in the floating menu: what to display, in what order, and what prompt to send.

---

## Configuration File Locations

| File                           | Purpose                                      |
| ------------------------------ | -------------------------------------------- |
| `.inspecto/prompts.json`       | Team-shared configuration, committed to git  |
| `.inspecto/prompts.local.json` | Personal local override, add to `.gitignore` |

The highest-priority file that contains a non-empty config wins entirely — no merging across files for prompts.

---

## Two Modes

### Default: Append / Override Mode

The config array patches the built-in list. Write only what you want to change:

- **Object with known `id`** → Merges over the built-in intent (override `label`, `prompt`, `appendPrompt`, etc.)
- **Object with unknown `id`** → Appended as a new custom intent after the built-in list
- **`enabled: false`** → Removes that intent from the menu
- **Empty array or missing file** → All built-in intents are shown (the menu is never empty by accident)

````jsonc
// .inspecto/prompts.json
[
  { "id": "explain", "appendPrompt": "Please reply in Chinese." },
  { "id": "performance", "enabled": false },
  {
    "id": "my-custom",
    "label": "Our Style Guide Review",
    "prompt": "Review this {{framework}} component against our style guide:\n\n```{{ext}}\n{{snippet}}\n```",
  },
]
````

Result: all built-in intents, with `explain` modified, `performance` hidden, and `my-custom` appended at the end.

### Explicit Replace Mode

When you want full control over the list and order, use `{ "$replace": true, "items": [...] }`:

```jsonc
{
  "$replace": true,
  "items": ["explain", "fix-bug", { "id": "my-custom", "label": "Custom Review", "prompt": "..." }],
}
```

String entries in `items` reference built-in intents by id. The list is rendered exactly as specified.

> **Note:** Strings in the default append mode have no effect — built-in intents are already included in their default order. Use `$replace` if you need to control ordering.

---

## Field Reference

| Field           | Type      | Required | Description                                                              |
| --------------- | --------- | -------- | ------------------------------------------------------------------------ |
| `id`            | `string`  | **Yes**  | Matches a built-in to override it, or defines a new custom intent        |
| `label`         | `string`  | No       | Display name in the menu. Falls back to built-in default                 |
| `prompt`        | `string`  | No       | Completely replaces the built-in prompt template                         |
| `aiIntent`      | `string`  | **Yes**  | Semantic intent: `ask`, `fix`, `review`, or `redesign`                   |
| `prependPrompt` | `string`  | No       | Prepended to the built-in prompt — no need to rewrite the whole template |
| `appendPrompt`  | `string`  | No       | Appended to the built-in prompt (e.g. "Please reply in Chinese.")        |
| `enabled`       | `boolean` | No       | `false` removes the intent from the menu                                 |

---

## Built-in Prompt IDs

| ID        | Label   | Notes |
| --------- | ------- | ----- |
| `explain` | Explain |       |
| `fix-bug` | Fix Bug |       |
| `fix-ui`  | Fix UI  |       |
| `improve` | Improve |       |

Recommended built-in inspect order:

- `Explain`
- `Fix Bug`
- `Fix UI`
- `Improve`

This order should stay short, stable, and action-oriented. Custom prompt arrays may override it explicitly.

---

## Prompt Template Variables

| Variable        | Example                     | Description                                              |
| --------------- | --------------------------- | -------------------------------------------------------- |
| `{{file}}`      | `src/components/Button.tsx` | Absolute file path                                       |
| `{{line}}`      | `42`                        | Line number (1-based)                                    |
| `{{column}}`    | `8`                         | Column number (1-based)                                  |
| `{{snippet}}`   | `...code...`                | Extracted component source                               |
| `{{name}}`      | `Button`                    | Component or function name                               |
| `{{ext}}`       | `tsx`                       | File extension (used for code block syntax highlighting) |
| `{{framework}}` | `React`                     | Auto-detected framework name                             |

---

## Common Scenarios

### Add a language instruction to all built-in prompts

```jsonc
// .inspecto/prompts.json
[
  { "id": "explain", "aiIntent": "ask", "appendPrompt": "Please reply in Chinese." },
  { "id": "fix-bug", "aiIntent": "fix", "appendPrompt": "Please reply in Chinese." },
  { "id": "fix-ui", "aiIntent": "fix", "appendPrompt": "Please reply in Chinese." },
  { "id": "improve", "aiIntent": "review", "appendPrompt": "Please reply in Chinese." },
]
```

### Hide infrequently used intents

```jsonc
[
  { "id": "fix-ui", "aiIntent": "fix", "enabled": false },
  { "id": "improve", "aiIntent": "review", "enabled": false },
]
```

### Add a team-specific custom intent

````jsonc
[
  {
    "id": "style-guide-review",
    "label": "Style Guide Review",
    "aiIntent": "review",
    "prompt": "Review the following {{framework}} component against our internal style guide.\n\nFocus on: naming conventions, component decomposition, and accessibility.\n\n```{{ext}}\n{{snippet}}\n```",
  },
]
````

### Fully custom list with controlled order

```jsonc
{
  "$replace": true,
  "items": [
    "fix-bug",
    "explain",
    {
      "id": "style-guide-review",
      "label": "Style Guide Review",
      "aiIntent": "review",
      "prompt": "...",
    },
  ],
}
```

### Personal local tweaks (not committed)

```jsonc
// .inspecto/prompts.local.json  ← add to .gitignore
[
  {
    "id": "fix-bug",
    "aiIntent": "fix",
    "appendPrompt": "Minimize changes — preserve the existing code style.",
  },
]
```
