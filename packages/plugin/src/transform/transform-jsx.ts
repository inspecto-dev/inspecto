import * as parser from '@babel/parser'
import traverse_ from '@babel/traverse'
// Support both ESM default and CommonJS module.exports
const traverse =
  typeof traverse_ === 'function' ? traverse_ : (traverse_ as any).default || traverse_
import type { NodePath } from '@babel/traverse'
import type { JSXOpeningElement } from '@babel/types'
import MagicString from 'magic-string'
import path from 'node:path'
import type { UnpluginOptions, PathType } from '@inspecto-dev/types'
import { buildEscapeTagsSet, formatAttrValue, type TransformResult } from './utils.js'

export interface TransformJsxOptions {
  filePath: string
  source: string
  projectRoot: string
  escapeTags?: string[]
  pathType?: PathType
  attributeName?: string
}

/**
 * Transform JSX/TSX source code by injecting data-inspecto attributes.
 */
export function transformJsx(options: TransformJsxOptions): TransformResult {
  const {
    filePath,
    source,
    projectRoot,
    escapeTags,
    pathType = 'absolute',
    attributeName = 'data-inspecto',
  } = options

  const escapeTagsSet = buildEscapeTagsSet(escapeTags)

  // Resolve the file path based on pathType config
  const resolvedPath =
    pathType === 'absolute'
      ? path.resolve(filePath)
      : path.relative(projectRoot, path.resolve(filePath))

  // Normalize path separators on Windows
  const normalizedPath = resolvedPath.replace(/\\/g, '/')

  let ast: ReturnType<typeof parser.parse>
  try {
    ast = parser.parse(source, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'optionalChaining',
        'nullishCoalescingOperator',
        'importMeta',
      ],
      errorRecovery: true,
    })
  } catch {
    // If parsing fails, return source unchanged
    return { code: source, map: null, changed: false }
  }

  const ms = new MagicString(source)
  let changed = false

  traverse(ast, {
    JSXOpeningElement(nodePath: NodePath<JSXOpeningElement>) {
      const node = nodePath.node

      // Skip elements that already have the attribute
      const alreadyHasAttr = node.attributes.some(
        attr =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === attributeName,
      )
      if (alreadyHasAttr) return

      // Get element tag name
      const nameNode = node.name
      let tagName: string
      if (nameNode.type === 'JSXIdentifier') {
        tagName = nameNode.name
      } else if (nameNode.type === 'JSXMemberExpression') {
        const objName = nameNode.object.type === 'JSXIdentifier' ? nameNode.object.name : ''
        const propName = nameNode.property.type === 'JSXIdentifier' ? nameNode.property.name : ''
        tagName = objName && propName ? `${objName}.${propName}` : objName
      } else {
        tagName = ''
      }

      // Skip escaped tags
      if (escapeTagsSet.has(tagName)) return

      // Get position from AST location
      const loc = node.loc
      if (!loc) return

      const { line, column } = loc.start
      // Babel uses 0-based columns, convert to 1-based
      const attrValue = formatAttrValue(normalizedPath, line, column + 1)

      // Determine the best insertion position for the attribute
      // When a JSX element has type arguments (e.g. <Component<string> />),
      // inserting after `node.name.end` might inject inside the generic bracket `<`.
      // The safest place to insert is right before the first attribute,
      // or right before the closing slash/bracket if there are no attributes.
      let insertPos: number | null | undefined = null
      if (node.attributes && node.attributes.length > 0) {
        const firstAttr = node.attributes[0]
        if (firstAttr && firstAttr.start != null) {
          insertPos = firstAttr.start
        }
      }

      if (insertPos == null) {
        // Find the start of the closing bracket or self-closing slash
        // We know node.end is the index right after the '>'
        // So we look backwards. But Babel AST doesn't give us exact token positions
        // for the closing tag easily.
        // For a safe fallback, we use node.typeParameters?.end || node.name.end
        if (node.typeParameters && node.typeParameters.end != null) {
          insertPos = node.typeParameters.end
        } else if (node.name.end != null) {
          insertPos = node.name.end
        }
      }

      if (insertPos == null) return

      ms.appendLeft(
        insertPos,
        ` ${attributeName}="${attrValue}"${node.attributes && node.attributes.length > 0 ? '' : ' '}`,
      )
      changed = true
    },
  })

  if (!changed) {
    return { code: source, map: null, changed: false }
  }

  return {
    code: ms.toString(),
    map: ms.generateMap({ hires: true, source: filePath }),
    changed: true,
  }
}
