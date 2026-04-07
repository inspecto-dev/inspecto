---
name: vscode-ext-analyze-params
description: >
  Analyze the parameter signature of a specific VSCode extension command by
  reverse-engineering the minified extension.js source code. Given an extension ID
  and a command name, extracts the registerCommand callback's formal parameters,
  infers types from runtime type-checking patterns (typeof, Array.isArray), and
  checks URI handlers for human-readable parameter names. Use when the user asks:
  what parameters does a command accept, how to call executeCommand with arguments,
  what's the signature of a specific extension command, reverse-engineer command
  parameters. Run list-commands first to discover available commands, then use
  this skill to deep-dive into specific ones.
---

# Analyze VSCode Extension Command Parameters

Deep-dive into a specific command's parameter signature from minified source code.

## Usage

```bash
# Analyze a single command
python3 scripts/analyze_params.py <extension-id> <command-name> [--context-size 800]

# Analyze all commands at once
python3 scripts/analyze_params.py <extension-id> --all
```

## What It Does

For each target command:

1. Finds the `registerCommand("cmd", callback)` in extension.js
2. Extracts the **callback parameter list** (e.g. `(N, v, U)`)
3. Analyzes **type-checking patterns** in the function body:
   - `typeof X === "string"` → parameter is `string`
   - `Array.isArray(X)` → parameter is `array`
   - `X?.property` → parameter is `object`
   - Ternary guards like `typeof X === "string" ? X : undefined` → optional typed parameter
4. Checks **URI Handlers** (`handleUri`) for human-readable parameter name mapping
5. Extracts the surrounding **code context** for manual inspection

## How to Read the Output

```
┌─ claude-vscode.terminal.open
│  Params: (N, v, U)
│  Types:  N: string, v: string[], U: object (via validator)
│  URI:    /open → params: [session, prompt]
│  Mapped: N=prompt, v=flags, U=options (inferred from URI + position)
└──
```

- **Params**: Raw minified parameter names from the callback
- **Types**: Inferred from type guards in the function body
- **URI**: If the command is also accessible via URI handler, shows the human-readable parameter names
- **Context**: The surrounding code for manual analysis

## Key Insights

1. **Parameter position matters** — `editor.open(session, prompt, viewColumn)` puts prompt as arg 2
2. **URI Handlers are the Rosetta Stone** — they map minified names to human-readable ones
3. **Type guards reveal optionality** — `typeof X === "string" ? X : undefined` means the param is optional
4. **Validator function calls** (e.g., `M_6(U)`) indicate custom object schemas — check the validator's definition for details
