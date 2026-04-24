import MagicString from 'magic-string'
import { parse as parseAstro } from '@astrojs/compiler/sync'
import { buildEscapeTagsSet, formatAttrValue, type TransformResult } from './utils.js'

export interface TransformAstroOptions {
  filePath: string
  source: string
  pathType?: 'absolute' | 'relative'
  escapeTags?: string[]
  attributeName?: string
}

function walk(node: any, visitor: { enter: (n: any) => void }) {
  if (!node || typeof node !== 'object') return
  visitor.enter(node)

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walk(child, visitor)
    }
  }
}

export function transformAstro(options: TransformAstroOptions): TransformResult {
  const { filePath, source, escapeTags, attributeName = 'data-inspecto' } = options

  const escapeTagsSet = buildEscapeTagsSet(escapeTags)

  let ast: any
  try {
    ast = parseAstro(source, { position: true }).ast
  } catch (_err) {
    return { code: source, map: null, changed: false }
  }

  const s = new MagicString(source)
  let changed = false

  walk(ast, {
    enter(node: any) {
      // Element or Component in Astro AST
      if (node.type === 'element' || node.type === 'component') {
        const tagName = node.name

        if (
          tagName &&
          !escapeTagsSet.has(tagName) &&
          !node.attributes?.some((attr: any) => attr.name === attributeName)
        ) {
          const startOffset = node.position?.start?.offset ?? -1
          if (startOffset === -1) return

          // Find the exact `<` before or at the startOffset
          let tagStartIndex = startOffset
          while (tagStartIndex >= 0 && source[tagStartIndex] !== '<') {
            tagStartIndex--
          }

          if (tagStartIndex >= 0) {
            const substringAfterTag = source.substring(tagStartIndex)
            const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const strictRegex = new RegExp(`^<\\s*${escapedTagName}(?=\\s|/|>)`, 'i')
            const strictMatch = substringAfterTag.match(strictRegex)

            if (strictMatch) {
              const insertPosition = tagStartIndex + strictMatch[0].length
              const line = node.position.start.line
              const column = node.position.start.column

              const attrValue = formatAttrValue(filePath, line, column)
              const addition = ` ${attributeName}="${attrValue}"`

              s.appendLeft(insertPosition, addition)
              changed = true
            }
          }
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
