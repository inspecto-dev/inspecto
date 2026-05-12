import MagicString from 'magic-string'
import { parse as parseSvelte } from 'svelte/compiler'
import {
  buildEscapeTagsSet,
  formatAttrValue,
  resolveTransformAttrPath,
  type TransformResult,
} from './utils.js'

export interface TransformSvelteOptions {
  filePath: string
  source: string
  projectRoot?: string
  pathType?: 'absolute' | 'relative'
  escapeTags?: string[]
  attributeName?: string
}

function walk(node: any, visitor: { enter: (n: any) => void }) {
  if (!node || typeof node !== 'object') return
  visitor.enter(node)

  for (const key in node) {
    if (key === 'parent' || key === 'prev' || key === 'next') continue
    const value = node[key]
    if (Array.isArray(value)) {
      value.forEach(child => {
        if (child && typeof child === 'object') walk(child, visitor)
      })
    } else if (value && typeof value === 'object') {
      walk(value, visitor)
    }
  }
}

export function transformSvelte(options: TransformSvelteOptions): TransformResult {
  const {
    filePath,
    source,
    projectRoot,
    pathType = 'absolute',
    escapeTags,
    attributeName = 'data-inspecto',
  } = options

  const escapeTagsSet = buildEscapeTagsSet(escapeTags)
  const normalizedPath =
    projectRoot || options.pathType
      ? resolveTransformAttrPath({
          filePath,
          pathType,
          ...(projectRoot ? { projectRoot } : {}),
        })
      : filePath.replace(/\\/g, '/')

  // svelte parse doesn't support ts or scss/less
  // so replace the content of <script></script> and <style></style> with space
  // to avoid parser errors while preserving character offsets.
  let replacedContent = source
  const scriptRegex =
    /<script(?:\s+[a-zA-Z-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^>\s]*))?)?>[\s\S]*?<\/script>/gi
  const styleRegex =
    /<style(?:\s+[a-zA-Z-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^>\s]*))?)?>[\s\S]*?<\/style>/gi

  const scriptMatches = source.match(scriptRegex) || []
  const styleMatches = source.match(styleRegex) || []

  ;[...scriptMatches, ...styleMatches].forEach(match => {
    // Replace with exact same number of spaces to preserve offsets
    replacedContent = replacedContent.replace(match, ' '.repeat(match.length))
  })

  let ast: any
  try {
    ast = parseSvelte(replacedContent)
  } catch {
    // Graceful fallback for parse errors
    return { code: source, map: null, changed: false }
  }

  const s = new MagicString(source)
  let changed = false

  function countLines(text: string, position: number): number {
    let lines = 0
    for (let i = 0; i < position; i++) {
      if (text[i] === '\n') lines++
    }
    return lines
  }

  const root = ast.html || ast.fragment || ast

  walk(root, {
    enter(node: any) {
      if (
        node.type === 'Element' ||
        node.type === 'RegularElement' ||
        node.type === 'InlineComponent' ||
        node.type === 'Component'
      ) {
        const tagName = node.name || ''

        if (
          tagName &&
          !escapeTagsSet.has(tagName.toLowerCase()) &&
          !node.attributes?.some((attr: any) => attr.name === attributeName)
        ) {
          const insertPosition = node.start + tagName.length + 1
          const line = countLines(source, node.start) + 1
          const lastNewLine = source.lastIndexOf('\n', node.start - 1)
          const column = lastNewLine === -1 ? node.start + 1 : node.start - lastNewLine

          const attrValue = formatAttrValue(normalizedPath, line, column)
          const addition = ` ${attributeName}="${attrValue}"`

          s.appendLeft(insertPosition, addition)
          changed = true
        }
      }
    },
  })

  return {
    code: s.toString(),
    map: changed ? s.generateMap({ source: filePath, includeContent: true }) : null,
    changed,
  }
}
