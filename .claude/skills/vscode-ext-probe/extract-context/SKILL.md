---
name: vscode-ext-context
description: >
  Extract raw source code context around a specific VSCode extension command's
  registerCommand call. Outputs the surrounding N characters of minified code for
  manual inspection. Use when the user wants to see the actual source code around
  a command registration, needs to understand the internal implementation details
  that automated analysis missed, or wants to trace how a command interacts with
  other parts of the extension. This is the low-level "grep" equivalent — for
  structured analysis, use analyze-params instead.
---

# Extract VSCode Extension Command Context

Get raw source code around a command's `registerCommand` for manual analysis.

## Usage

```bash
# Extract context for a specific command
python3 scripts/extract_context.py <extension-id> <command-name> [--chars 1500]

# Extract context for a keyword (not just commands)
python3 scripts/extract_context.py <extension-id> --keyword "handleUri" [--chars 2000]

# Search for any pattern in extension.js
python3 scripts/extract_context.py <extension-id> --pattern "sendText.*true" [--chars 500]
```

## What It Does

Reads the extension's minified `extension.js` and extracts surrounding characters around:

- A specific `registerCommand("name"` call
- A keyword occurrence
- A regex pattern match

This is the "escape hatch" for when automated analysis doesn't capture enough detail. Use it to:

- See the full function body of a command handler
- Trace how parameters flow through internal functions
- Find related patterns (e.g., all `sendText` calls to determine auto-send behavior)
- Inspect URI handler implementations
