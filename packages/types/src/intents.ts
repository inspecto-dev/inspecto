export const DEFAULT_INTENTS = [
  {
    id: 'explain',
    label: 'Explain',
    aiIntent: 'ask',
    prompt: `Explain this {{framework}} component from \`{{file}}\` (line {{line}}).

Cover its UI role, key props/state/side effects, and any non-obvious logic.`,
  },
  {
    id: 'fix-bug',
    label: 'Fix Bug',
    aiIntent: 'fix',
    prompt: `Fix the bug in this {{framework}} component from \`{{file}}\` (line {{line}}).

Identify the likely root cause and propose the smallest safe fix.`,
  },
  {
    id: 'fix-ui',
    label: 'Fix UI',
    aiIntent: 'fix',
    prompt: `Fix the UI issue in this {{framework}} component from \`{{file}}\` (line {{line}}).

Check layout, spacing, overflow, alignment, layering, and visual consistency. Use the existing styling approach.`,
  },
  {
    id: 'improve',
    label: 'Improve',
    aiIntent: 'review',
    prompt: `Review this {{framework}} component from \`{{file}}\` (line {{line}}).

Suggest practical readability, maintainability, and small structural improvements. Keep behavior unchanged unless clearly justified.`,
  },
]
