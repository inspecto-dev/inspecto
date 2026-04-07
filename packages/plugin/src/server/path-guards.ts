import path from 'node:path'

function isWindowsAbsolutePath(file: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(file) || /^\\\\[^\\]+\\[^\\]+/.test(file)
}

export function resolveWorkspacePath(file: string, cwd: string): string {
  if (isWindowsAbsolutePath(file)) {
    return path.win32.normalize(file)
  }
  return path.isAbsolute(file) ? path.resolve(file) : path.resolve(cwd, file)
}

export function assertPathWithinProject(file: string, projectRoot: string): void {
  const relativeToRoot =
    isWindowsAbsolutePath(file) || isWindowsAbsolutePath(projectRoot)
      ? path.win32.relative(path.win32.normalize(projectRoot), path.win32.normalize(file))
      : path.relative(projectRoot, file)
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error('Access denied: File is outside of project workspace')
  }
}
