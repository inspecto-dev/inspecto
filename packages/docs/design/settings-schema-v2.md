# Inspecto Settings Schema Redesign (v2)

## 1. Background & Motivation

The current configuration design in `.inspecto/settings.json` relies heavily on deep object nesting. While this directly maps to internal TypeScript interfaces, it creates friction for end-users when manually editing the configuration.

### Current Pain Points:

1. **Deep Nesting:** Configuring a specific provider requires multiple levels of braces, making copy-pasting snippets cumbersome and increasing syntax error risks.
2. **Inconsistent Terminology:** Global keys like `prefer` lack namespace context, making it unclear what exactly is being "preferred" without reading documentation.
3. **Inconsistent Vendor Naming:** The reliance on official extension IDs (e.g., `geminicodeassist`) leads to visually awkward and hard-to-read keys, especially when compared to simpler names like `claudeCode`.

## 2. Core Design Principles

To address these pain points and elevate Inspecto's configuration UX to match top-tier dev tools (like VS Code, ESLint, Next.js), we establish the following principles:

1. **Flat Namespaces (Dot-Notation):** Flatten deep objects using dot-notation (e.g., `namespace.entity.property`). This matches VS Code's native settings style, providing excellent IDE auto-completion and zero-nesting copy-paste capability.
2. **Semantic Standardization:** Standardize on the term **`provider`** as the top-level namespace for all AI tool configurations. This aligns with industry-standard terminology for integrations (e.g., NextAuth, Vercel AI SDK).
3. **Pragmatic Kebab-Case (Core Brand Words):** For provider names, extract the core brand word (stripping away redundant prefixes/suffixes like `github`, `assist`, `dev`) and format it as `kebab-case`. This ensures visual consistency and future-proofs against complex multi-word AI tools.

## 3. Schema Transformation

### 3.1 Namespace & Default Target

- **Before:** `"prefer": "claude-code"`
- **After:** `"provider.default": "claude-code.extension"`

**Rationale:** Moving the default selection under the `provider` namespace groups all related config together. The value now strictly references the exact dot-notation path of the intended provider and mode, ensuring absolute clarity (e.g., it is immediately clear if the default is the CLI or the Extension).

### 3.2 Provider Naming Normalization

We will adopt the **"Core Brand Word + Kebab-Case"** strategy:

| Original/Official ID                    | New Normalized Key | Justification                                                             |
| :-------------------------------------- | :----------------- | :------------------------------------------------------------------------ |
| `saoudrizwan.claude-dev` / `claudeCode` | `claude-code`      | Kebab-case standard.                                                      |
| `github.copilot`                        | `copilot`          | "Copilot" is the universally recognized core brand.                       |
| `google.geminicodeassist`               | `gemini`           | "Gemini" is the core brand; strips out the temporary "codeassist" suffix. |
| `byte-coco.coco-extension`              | `coco`             | Core brand.                                                               |
| _(Future)_ `openCode`                   | `open-code`        | Future-proofs against multi-word composites.                              |

_Note: The internal TypeScript codebase will maintain a dictionary mapping these clean keys back to the required VS Code extension IDs._

### 3.3 Flattening the Provider Config

- **Before:**

```json
{
  "providers": {
    "claude-code": {
      "type": "cli",
      "bin": "claude",
      "autoSend": true
    }
  }
}
```

- **After:**

```json
{
  "provider.claude-code.cli.bin": "claude",
  "provider.claude-code.extension.autoSend": true
}
```

**Rationale:** The `.cli` and `.extension` path segments explicitly define the execution mode, eliminating the need for a separate `type: "cli" | "plugin"` field within the object.

## 4. Final Configuration Example

Below is the proposed "before and after" demonstrating the massive improvement in readability.

### Legacy Setup (v1)

```json
{
  "hotKeys": ["altKey"],
  "ide": "vscode",
  "prefer": "claude-code",
  "providers": {
    "claude-code": {
      "type": "cli",
      "bin": "claude",
      "autoSend": false
    },
    "github.copilot": {
      "type": "plugin",
      "autoSend": true
    },
    "geminicodeassist": {
      "type": "plugin"
    }
  }
}
```

### Proposed Setup (v2)

```json
{
  "hotKeys": ["altKey"],
  "ide": "vscode",

  "provider.default": "claude-code.cli",

  "provider.claude-code.cli.bin": "claude",
  "provider.claude-code.extension.autoSend": false,

  "provider.copilot.extension.autoSend": true,

  "provider.gemini.extension.enabled": true,

  "provider.coco.cli.bin": "coco"
}
```

## 5. Implementation Strategy

1. **Schema Update:** Update `packages/ide/schema/settings.json` to define these flat keys.
2. **Internal Mapping:** Implement an alias resolver in the core configuration loader to map keys like `copilot` to `github.copilot` when querying VS Code APIs.
3. **Migration utility (Optional):** When the CLI `init` runs, or when the IDE extension activates, automatically migrate `v1` JSON structures to the `v2` flat structure.
