---
name: vscode-ext-list-commands
description: >
  List all commands registered by a VSCode extension, including hidden ones not
  declared in package.json. Given an extension ID (e.g. anthropic.claude-code),
  finds the installed extension, extracts declared commands from package.json and
  runtime-registered commands from extension.js. Use when the user asks: what
  commands does an extension have, list extension commands, find hidden commands,
  discover undocumented commands of a VSCode extension.
---

# List VSCode Extension Commands

Discover all commands registered by a VSCode extension — both declared and hidden.

## Usage

```bash
python3 scripts/list_commands.py <extension-id> [--ext-base <path>]
```

## What It Does

1. Locates the extension in `~/.vscode/extensions/` (also checks Insiders and Cursor paths)
2. Extracts **declared commands** from `package.json` → `contributes.commands`
3. Extracts **runtime-registered commands** from `extension.js` via `registerCommand("name"` pattern
4. Identifies **hidden commands** (in extension.js but not in package.json)
5. Lists `contributes` summary (menus, keybindings, chatSessions, chatParticipants, etc.)

## Output

- Declared commands with titles
- Hidden commands (only in extension.js)
- Contributes capability map

## Key Point

Many extensions register commands at runtime that don't appear in package.json. These "hidden" commands are often the most useful for programmatic integration via `executeCommand`.
