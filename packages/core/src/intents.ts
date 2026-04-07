import type { SnippetResponse, SourceLocation } from '@inspecto-dev/types'

/** Template for user-typed custom prompts from the ask input box. */
export function CUSTOM_PROMPT_TEMPLATE(userPrompt: string): string {
  return userPrompt
}

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
