import * as fs from 'node:fs'
import * as path from 'node:path'
import * as parser from '@babel/parser'
import traverse_ from '@babel/traverse'
// Support both ESM default and CommonJS module.exports
const traverse =
  typeof traverse_ === 'function' ? traverse_ : (traverse_ as any).default || traverse_
import type { NodePath } from '@babel/traverse'
import type { Node } from '@babel/types'
import type { SnippetRequest, SnippetResponse } from '@inspecto-dev/types'

interface CacheEntry {
  mtime: number
  /** The full parsed source lines */
  lines: string[]
}

/** In-memory cache keyed by absolute file path */
const snippetCache = new Map<string, CacheEntry>()

const DEFAULT_MAX_LINES = 100
const DEFAULT_CONTEXT_LINES_BEFORE = 5

export async function extractSnippet(req: SnippetRequest): Promise<SnippetResponse> {
  const { file, line, column, maxLines = DEFAULT_MAX_LINES } = req

  const absolutePath = path.resolve(file)

  let stat: fs.Stats
  try {
    stat = await fs.promises.stat(absolutePath)
  } catch {
    throw new Error(`FILE_NOT_FOUND: ${absolutePath}`)
  }

  const mtime = stat.mtimeMs

  let lines: string[]
  const cached = snippetCache.get(absolutePath)
  if (cached && cached.mtime === mtime) {
    lines = cached.lines
  } else {
    const source = await fs.promises.readFile(absolutePath, 'utf-8')
    lines = source.split('\n')
    snippetCache.set(absolutePath, { mtime, lines })
  }

  let snippetLines: string[]
  let startLine: number
  let componentName: string | undefined

  try {
    const result = extractComponentBoundary(lines.join('\n'), line, column, maxLines)
    snippetLines = result.lines
    startLine = result.startLine
    componentName = result.name
  } catch {
    const before = Math.max(0, line - 1 - DEFAULT_CONTEXT_LINES_BEFORE)
    const after = Math.min(lines.length, before + maxLines)
    snippetLines = lines.slice(before, after)
    startLine = before + 1
  }

  if (snippetLines.length > maxLines) {
    snippetLines = snippetLines.slice(0, maxLines)
  }

  return {
    snippet: snippetLines.join('\n'),
    startLine,
    file: absolutePath,
    ...(componentName ? { name: componentName } : {}),
  }
}

interface BoundaryResult {
  lines: string[]
  startLine: number
  name?: string
}

function extractComponentBoundary(
  source: string,
  targetLine: number,
  _targetColumn: number,
  maxLines: number,
): BoundaryResult {
  const ast = parser.parse(source, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties'],
    errorRecovery: true,
  })

  const allLines = source.split('\n')

  let bestStart = 0
  let bestEnd = allLines.length - 1
  let bestName: string | undefined

  traverse(ast, {
    'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ClassMethod'(
      nodePath: NodePath<Node>,
    ) {
      const node = nodePath.node
      if (!node.loc) return

      const nodeStart = node.loc.start.line
      const nodeEnd = node.loc.end.line

      if (targetLine < nodeStart || targetLine > nodeEnd) return

      if (nodeEnd - nodeStart < bestEnd - bestStart) {
        bestStart = nodeStart - 1
        bestEnd = nodeEnd - 1
        bestName = extractFunctionName(nodePath)
      }
    },
  })

  let sliceStart = bestStart
  let sliceEnd = bestEnd + 1

  if (sliceEnd - sliceStart > maxLines) {
    const targetIdx = targetLine - 1
    sliceStart = Math.max(bestStart, targetIdx - Math.floor(maxLines / 3))
    sliceEnd = sliceStart + maxLines
    if (sliceEnd > bestEnd + 1) {
      sliceEnd = bestEnd + 1
      sliceStart = Math.max(0, sliceEnd - maxLines)
    }
  }

  return {
    lines: allLines.slice(sliceStart, sliceEnd),
    startLine: sliceStart + 1,
    ...(bestName ? { name: bestName } : {}),
  }
}

function extractFunctionName(nodePath: NodePath<Node>): string | undefined {
  const node = nodePath.node

  if (node.type === 'FunctionDeclaration' && node.id) {
    return node.id.name
  }

  const parent = nodePath.parent
  if (
    (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') &&
    parent.type === 'VariableDeclarator' &&
    parent.id.type === 'Identifier'
  ) {
    return parent.id.name
  }

  if (node.type === 'ClassMethod' && node.key.type === 'Identifier') {
    return node.key.name
  }

  return undefined
}
