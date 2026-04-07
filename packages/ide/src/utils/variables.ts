import path from 'path'

export function substituteVariables(
  str: string,
  context: {
    workspaceRoot?: string
    filePath?: string
  },
): string {
  if (!str) return str

  let result = str

  if (context.workspaceRoot) {
    result = result.replace(/\$\{workspaceRoot\}/g, context.workspaceRoot)
  }

  if (context.filePath) {
    result = result.replace(/\$\{file\}/g, context.filePath)
    result = result.replace(/\$\{fileDirname\}/g, path.dirname(context.filePath))

    if (context.workspaceRoot) {
      const relativeFile = path.relative(context.workspaceRoot, context.filePath)
      result = result.replace(/\$\{relativeFile\}/g, relativeFile)
    }
  }

  return result
}
