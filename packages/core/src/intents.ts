import type { IntentConfig, SnippetResponse, SourceLocation } from '@inspecto/types'

/** Template for user-typed custom prompts from the ask input box. */
export function CUSTOM_PROMPT_TEMPLATE(userPrompt: string): string {
  return userPrompt
}

export const DEFAULT_INTENTS: IntentConfig[] = [
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

  // ── 5. Code Review ───────────────────────────────────────────────────────
  // Frequency: ★★★ — Concentrated at PR stage; slightly less frequent than daily fixes
  {
    id: 'code-review',
    label: 'Code Review',
    prompt: `Please do a code review for the following {{framework}} component from \`{{file}}\` (line {{line}}).

Review dimensions:

- Correctness: logic errors, edge cases, race conditions
- {{framework}} best practices: lifecycle usage, key props, reactivity rules
- Performance: unnecessary renders, missing memoization
- Accessibility: ARIA attributes, keyboard navigation, semantic HTML
- Security: XSS risks, unsafe HTML injection, user input handling
- Maintainability: naming clarity, code duplication, complexity

Format your response as a prioritized list: 🔴 Critical / 🟡 Warning / 🟢 Suggestion.`,
  },

  // ── 6. Generate Test ─────────────────────────────────────────────────────
  // Frequency: ★★★ — Common but often deferred; great AI use case
  {
    id: 'generate-test',
    label: 'Generate Test',
    prompt: `Please generate unit tests for the following {{framework}} component from \`{{file}}\` (line {{line}}).

Requirements:

- Use Vitest + Testing Library (or Jest if the codebase implies it)
- Cover: render correctness, user interactions, edge cases, error states
- Mock external dependencies (API calls, context/providers, router)
- Use accessible queries (getByRole, getByLabelText) over getByTestId

Generate a complete, runnable test file. Include all import statements.`,
  },

  // ── 7. Performance Analysis ──────────────────────────────────────────────
  // Frequency: ★★ — Targeted use during perf sprints; not a daily operation
  {
    id: 'performance',
    label: 'Performance Analysis',
    prompt: `Please analyze the performance of the following {{framework}} component from \`{{file}}\` (line {{line}}).

Focus on:

1. Unnecessary re-renders or reactive updates
2. Expensive computations that should be memoized/computed
3. Heavy operations in the render path
4. Dependency arrays or watchers — missing or over-specified
5. Large bundle impact (heavy imports that could be lazy-loaded)

For each issue found, provide: problem description → recommended fix → expected impact.`,
  },

  // ── 8. Open in Editor ────────────────────────────────────────────────────
  // Type: local action (no AI prompt) — jumps directly to source in IDE
  {
    id: 'open-in-editor',
    label: 'Open in Editor',
    prompt: '', // unused — isAction handles this
    isAction: true,
  },
]

/**
 * Guess the UI framework based on file extension
 */
function detectFramework(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'vue':
      return 'Vue'
    case 'svelte':
      return 'Svelte'
    case 'astro':
      return 'Astro'
    case 'jsx':
    case 'tsx':
      return 'React'
    case 'ts':
    case 'js':
      return 'JavaScript/TypeScript'
    default:
      return 'UI'
  }
}

/**
 * Replace all {{placeholder}} tokens in a prompt template.
 */
export function buildPrompt(
  template: string,
  location: SourceLocation,
  snippetResult?: SnippetResponse | null,
): string {
  const shortFile = location.file.split('/').pop() ?? location.file
  const ext = shortFile.split('.').pop()?.toLowerCase() || 'tsx'
  const framework = detectFramework(shortFile)

  let finalPrompt = template
    .replace(/\{\{file\}\}/g, location.file)
    .replace(/\{\{line\}\}/g, String(location.line))
    .replace(/\{\{column\}\}/g, String(location.column))
    .replace(/\{\{ext\}\}/g, ext)
    .replace(/\{\{framework\}\}/g, framework)
    .replace(/\{\{name\}\}/g, shortFile) // fallback

  if (snippetResult && snippetResult.snippet) {
    const name = snippetResult.name ?? shortFile
    finalPrompt = finalPrompt.replace(/\{\{name\}\}/g, name)
    // append snippet context
    finalPrompt += `\n\nContext from \`${location.file}\` (line ${location.line}):\n\`\`\`${ext}\n${snippetResult.snippet}\n\`\`\``
  }

  return finalPrompt
}
