export const DEFAULT_INTENTS = [
  {
    id: 'explain',
    label: 'Explain',
    aiIntent: 'ask',
    prompt: `Explain what this {{framework}} component from \`{{file}}\` (line {{line}}) does.

Focus on:
- its UI responsibility
- key props, state, or side effects
- any non-obvious logic worth noticing`,
  },
  {
    id: 'fix-bug',
    label: 'Fix Bug',
    aiIntent: 'fix',
    prompt: `Help fix a bug in this {{framework}} component from \`{{file}}\` (line {{line}}).

Please:
- identify the most likely root cause
- explain why it happens
- suggest the smallest safe fix

If important context is missing, ask for it before proposing broader changes.`,
  },
  {
    id: 'fix-ui',
    label: 'Fix UI',
    aiIntent: 'fix',
    prompt: `Help fix a UI issue in this {{framework}} component from \`{{file}}\` (line {{line}}).

Please review layout, spacing, overflow, alignment, layering, and visual consistency,
then suggest fixes using the same styling approach already used in this codebase.`,
  },
  {
    id: 'improve',
    label: 'Improve',
    aiIntent: 'review',
    prompt: `Review this {{framework}} component from \`{{file}}\` (line {{line}}) and suggest practical improvements.

Focus on readability, maintainability, and small structural cleanups.
Keep behavior unchanged unless a change is clearly justified.`,
  },
]
