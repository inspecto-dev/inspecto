---
name: review-code
description: |
  Deep code quality review for the inspecto monorepo. Use this skill whenever
  the user wants to review, audit, or assess the quality of code in the inspecto
  project — even if they just say "check this file", "is this well written", "review my
  implementation", or "does this follow the architecture?". Accepts a file path
  (e.g. packages/core/src/client/component.ts) or a package directory
  (e.g. packages/unplugin). Produces a structured report covering architecture,
  implementation quality, modularity, TypeScript safety, and a scored verdict.
  Trigger on: /review-code, "review this", "check code quality", "audit this file",
  "is this good code", "does this follow the pattern", "code review".
---

# review-code — Inspecto Code Quality Review

You are performing a deep code quality review of a file or package in the
`inspecto` monorepo. Your goal is to give the developer honest,
specific, actionable feedback — not a rubber-stamp.

## Project Architecture (reference model)

The intended dependency direction is strictly one-way:

```
@inspecto-dev/types          ← leaf, no internal deps
        ↓
@inspecto-dev/unplugin       ← build-time only, Node.js
        ↓
@inspecto-dev/core           ← browser runtime + server utils
        ↓
@inspecto-dev/react          ← thin React wrapper (peer: react)
@inspecto-dev/vue            ← thin Vue wrapper (peer: vue)
        ↓
@inspecto-dev/ide                    ← IDE extension (VS Code, Cursor, Trae) (CommonJS, Node.js)
```

**Key architectural invariants to enforce:**

- `core` must never import from `react`, `vue`, or `ide`
- `types` must never import from any other internal package
- `react` and `vue` are thin wrappers — no inspector logic, just prop-passing
- Web Component UI lives entirely in `core/src/client/` — zero framework dependency
- Transform layer uses `MagicString` (not `@babel/generator`) for source maps
- Server uses `portfinder` + `launch-ide` (not custom child_process port scanning)
- Attributes injected only when `NODE_ENV !== 'production'`

## Review Dimensions

For the given file or package, evaluate each dimension thoroughly:

### 1. Architecture & Module Boundaries

- Does the file import from packages it shouldn't depend on?
- Is the file in the right package given its responsibility?
- Does it introduce coupling between layers that should be independent?
- Are side effects (server startup, DOM mutation, customElements.define) isolated correctly?

### 2. Implementation Quality

- Are edge cases handled? (file not found, parse errors, empty input, Windows paths)
- Are error paths explicit with structured error codes (not raw `throw new Error('string')`)?
- No hardcoded magic values — ports, timeouts, attribute names should be constants/config
- Is async/await used correctly? No floating Promises, no unhandled rejections
- Are cleanup paths present? (event listeners removed, servers stopped, DOM elements removed)

### 3. Modularity & Reusability

- Does each function/class do one thing well?
- Is there duplication that should be extracted?
- Are abstractions at the right level — not too specific, not too generic?
- Could this module be tested in isolation?

### 4. TypeScript & Type Safety

- No `any` unless genuinely unavoidable (and commented why)
- No non-null assertions (`!`) without justification
- Are interfaces well-named and minimal (no god interfaces)?
- Are return types explicit on public functions?
- Are union types used instead of enums where appropriate?
- Do generic constraints make sense?

### 5. Consistency with Project Patterns

Check that the code follows established patterns from the codebase:

- MagicString used for source transforms (not string concatenation or @babel/generator)
- `portfinder` used for port discovery (not hardcoded ports without fallback)
- `launch-ide` used for opening IDEs (not raw `child_process.exec('code ...')`)
- Goober `css` tagged templates for Shadow DOM styles (not inline style strings)
- `buildPrompt()` + `{{placeholder}}` pattern for prompt templates
- Error codes from `AiErrorCode` union type (not ad-hoc strings)
- `DEFAULT_ESCAPE_TAGS` extended rather than replaced for escapeTags config

## How to Conduct the Review

1. **Read the target file(s)** carefully. If given a package directory, prioritize the
   main entry (`src/index.ts`) and the most complex files first.

2. **Check imports** — trace what each import brings in, verify no cross-layer violations.

3. **Read function by function** — for each exported function/class, ask: is the interface
   clean? is the implementation correct? are edge cases covered?

4. **Look for patterns** — does this code feel consistent with what you know about the
   rest of the project? Flag anything that feels "different" even if you can't immediately
   articulate why.

5. **Be specific** — every issue must cite the exact line or pattern, not just "this could
   be better". Vague feedback is worthless.

## Output Format

Produce exactly this structure. Be honest — don't inflate scores:

---

## 🏗️ Architecture & Module Boundaries

[Analysis of dependency directions, package placement, layer violations.
If clean, say so briefly. If issues exist, explain the violation and the fix.]

---

## 🔍 Implementation Quality

[Analysis of error handling, edge cases, async correctness, cleanup paths,
magic values. Concrete examples from the code.]

---

## 🧩 Modularity & Reusability

[Analysis of function decomposition, single responsibility, duplication,
testability. Note what's well-decomposed and what should be split.]

---

## 🛡️ TypeScript & Type Safety

[Analysis of type precision, any usage, non-null assertions, interface design.
Quote specific type signatures that need improvement.]

---

## ⚠️ Issues

List all issues found, severity-coded:

- 🔴 **Critical** — Bug risk, architectural violation, or will cause runtime failure
- 🟡 **Warning** — Code smell, maintainability concern, or inconsistency with project patterns
- 🟢 **Suggestion** — Style, optional improvement, or minor polish

Format each issue as:

> **[Severity] Short title**
> File/line: `path/to/file.ts:42`
> Problem: what's wrong
> Fix: concrete suggestion

---

## ✅ Summary

**Score: X/10**

One-line verdict: [honest assessment, e.g. "Solid implementation with one architectural
concern and two minor type safety gaps" or "Needs significant refactor — the module
boundary violation will cause maintainability issues at scale"]

**Top 3 action items:**

1. ...
2. ...
3. ...
