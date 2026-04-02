export const DEFAULT_INTENTS = [
  // ── 1. Explain Component ─────────────────────────────────────────────────
  // Frequency: ★★★★★ — Most common action when navigating unfamiliar codebases
  {
    id: 'explain',
    label: 'Explain Component',
    prompt: `The following is a {{framework}} component from \`{{file}}\` (line {{line}}).

Please explain:

1. What this component does and its responsibility in the UI
2. Key props and their purpose
3. Important state or side effects (if applicable)
4. Any non-obvious logic or edge cases worth noting`,
  },

  // ── 2. Fix Bug ───────────────────────────────────────────────────────────
  // Frequency: ★★★★★ — Debugging is the highest time-cost activity in frontend dev
  {
    id: 'fix-bug',
    label: 'Fix Bug',
    prompt: `I found a bug in the following {{framework}} component from \`{{file}}\` (line {{line}}).

Please:

1. Identify potential bugs or issues in this code
2. Explain the root cause of each issue
3. Provide a fixed version with minimal changes

If you need more context (e.g. parent component, API response shape),
please ask before suggesting a fix.`,
  },

  // ── 3. Fix Styles ────────────────────────────────────────────────────────
  // Frequency: ★★★★ — Styling issues are top-3 daily pain points for frontend devs
  {
    id: 'fix-styles',
    label: 'Fix Styles',
    prompt: `The following component from \`{{file}}\` (line {{line}}) has a styling issue.

Please:

1. Review the current styles (className / inline styles / CSS-in-JS / Style blocks)
2. Identify common issues: layout shifts, overflow, z-index conflicts,
   responsive breakpoints, or visual inconsistencies
3. Suggest fixes using the same styling approach already in use

Note: Maintain the existing styling conventions (e.g. Tailwind, CSS Modules, scoped styles).`,
  },

  // ── 4. Refactor Component ────────────────────────────────────────────────
  // Frequency: ★★★★ — Sustained demand after features stabilize; large component splits
  {
    id: 'refactor',
    label: 'Refactor Component',
    prompt: `Please refactor the following {{framework}} component from \`{{file}}\` (line {{line}}).

Refactoring goals (apply as relevant):

- Extract reusable sub-components or composables/hooks
- Improve readability and reduce complexity
- Remove redundant state or unnecessary re-renders
- Apply {{framework}} best practices
- Maintain existing behavior — no functional changes

Please show the refactored version with a brief explanation of each change.`,
  },

  // ── 5. Open in Editor ────────────────────────────────────────────────────
  // Type: local action (no AI prompt) — jumps directly to source in IDE
  {
    id: 'open-in-editor',
    label: 'Open in Editor',
    prompt: '', // unused — isAction handles this
    isAction: true,
  },
]
