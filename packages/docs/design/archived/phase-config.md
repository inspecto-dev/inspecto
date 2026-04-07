# Inspecto Configuration Design Document

> Designed referencing the Claude Code configuration system: `settings.json` manages behavior configuration, `prompts.json` manages content data. Separation of concerns, non-interfering.

---

## 1. Design Principles

| File            | Responsibility                                         | Analogy                     |
| --------------- | ------------------------------------------------------ | --------------------------- |
| `settings.json` | "How to do it": IDE, tool selection, toggles           | Claude Code `settings.json` |
| `prompts.json`  | "What to say": Prompt templates, Intent toggles, order | Claude Code `CLAUDE.md`     |

> For detailed specifications on `prompts.json`, please refer to the [Prompts Configuration Document](./phase-prompts.md).

---

## 2. Directory Structure

```
.inspecto/
├── settings.json          # Behavior config (committed to git, team shared)
├── settings.local.json    # Personal behavior override (gitignore)
├── prompts.json           # Prompt content config (committed to git, team shared)
└── prompts.local.json     # Personal Prompt override (gitignore)

~/.inspecto/
├── settings.json          # User global behavior config (cross-project)
└── prompts.json           # User global Prompt config (cross-project)
```

### Configuration Merge Priority

```
~/.inspecto/settings.json       (Lowest)
        ↓ deepMerge
.inspecto/settings.json
        ↓ deepMerge
.inspecto/settings.local.json   (Highest)
```

`prompts.json` follows the same three-layer merge strategy. Object fields are deep-merged, array fields are entirely replaced.

---

## 3. Detailed Configuration Guide

To keep the documentation clear and focused, specific configuration field explanations have been split into independent documents:

- **[User Settings](../../config/user-settings.md)**: Current field explanations for `.inspecto/settings.json`, provider selection, and runtime configuration.
- **[Prompts Configuration Guide](./phase-prompts.md)**: Contains the configuration specifications for `prompts.json`, Intent toggles, and Prompt template design.

---

## 4. Recommended .gitignore

```gitignore
# Inspecto personal local configurations (do not commit)
.inspecto/settings.local.json
.inspecto/prompts.local.json
```

---
