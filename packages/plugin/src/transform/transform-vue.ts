import * as vueCompiler from '@vue/compiler-dom'
import { parse as parseSFC } from '@vue/compiler-sfc'
import type { ElementNode, AttributeNode } from '@vue/compiler-core'
import { NodeTypes } from '@vue/compiler-core'
import MagicString from 'magic-string'
import path from 'node:path'
import type { PathType } from '@inspecto-dev/types'
import { buildEscapeTagsSet, formatAttrValue, type TransformResult } from './utils.js'

export interface TransformVueOptions {
  filePath: string
  source: string
  projectRoot: string
  escapeTags?: string[]
  pathType?: PathType
  attributeName?: string
}

/**
 * Transform Vue SFC source by injecting data-inspecto attributes
 * into template elements.
 *
 * Strategy:
 * 1. Locate the <template> block in the SFC source
 * 2. Parse only the template block with @vue/compiler-dom
 * 3. Walk ElementNode nodes in the AST
 * 4. For each eligible element, inject the attribute using MagicString
 *    at the exact offset within the original source
 */
export function transformVue(options: TransformVueOptions): TransformResult {
  const {
    filePath,
    source,
    projectRoot,
    escapeTags,
    pathType = 'absolute',
    attributeName = 'data-inspecto',
  } = options

  const escapeTagsSet = buildEscapeTagsSet(escapeTags)

  // Resolve path
  const resolvedPath =
    pathType === 'absolute'
      ? path.resolve(filePath)
      : path.relative(projectRoot, path.resolve(filePath))

  const normalizedPath = resolvedPath.replace(/\\/g, '/')

  // ── Find <template> block boundaries ──────────────────────────────────────
  // Use @vue/compiler-sfc to parse the file and extract the template block.
  // This is much safer than regex for handling nested templates.
  const { descriptor, errors } = parseSFC(source, {
    filename: filePath,
    sourceMap: false,
    ignoreEmpty: true,
  })

  if (errors.length > 0 || !descriptor.template) {
    return { code: source, map: null, changed: false }
  }

  const templateContent = descriptor.template.content
  const templateBlockStart = descriptor.template.loc.start.offset

  // ── Parse template block ───────────────────────────────────────────────────
  let ast: vueCompiler.RootNode
  try {
    ast = vueCompiler.parse(templateContent, {
      parseMode: 'html',
      // Preserve source locations relative to templateContent
      onError: () => {
        /* ignore non-fatal parse errors */
      },
    })
  } catch {
    return { code: source, map: null, changed: false }
  }

  const ms = new MagicString(source)
  let changed = false

  // ── Walk AST ───────────────────────────────────────────────────────────────
  walkElement(ast, node => {
    // Skip non-element nodes
    if (node.type !== NodeTypes.ELEMENT) return

    const tagName = node.tag

    // Skip escaped tags
    if (escapeTagsSet.has(tagName)) return

    // Skip <template> wrapper itself (it's the root, not a real element)
    if (tagName === 'template' && node === ast.children[0]) return

    // Skip elements that already have the attribute (idempotency)
    const alreadyHasAttr = node.props.some(
      (p): p is AttributeNode => p.type === NodeTypes.ATTRIBUTE && p.name === attributeName,
    )
    if (alreadyHasAttr) return

    // node.loc is relative to templateContent — add templateBlockStart offset
    const loc = node.loc
    if (!loc) return

    const { line, column } = loc.start

    // Calculate absolute line and column in the original source
    // @vue/compiler-dom uses 1-based line and 1-based column
    const templateStartLoc = descriptor.template!.loc.start
    const absoluteLine = templateStartLoc.line + line - 1
    const absoluteColumn = line === 1 ? templateStartLoc.column + column - 1 : column

    const attrValue = formatAttrValue(normalizedPath, absoluteLine, absoluteColumn)

    // Find insert position: right after the tag name in the original source
    // node.loc.start.offset is 0-based offset within templateContent
    const tagNameEnd = loc.start.offset + tagName.length + 1 // +1 for '<'
    const absoluteOffset = templateBlockStart + tagNameEnd

    ms.appendLeft(absoluteOffset, ` ${attributeName}="${attrValue}"`)
    changed = true
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

// ── AST walker ────────────────────────────────────────────────────────────────

type AnyNode = vueCompiler.RootNode | vueCompiler.TemplateChildNode

function walkElement(node: AnyNode, visitor: (node: ElementNode) => void): void {
  if (node.type === NodeTypes.ELEMENT) {
    visitor(node)
    for (const child of node.children) {
      walkElement(child as AnyNode, visitor)
    }
  } else if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      walkElement(child as AnyNode, visitor)
    }
  }
}
