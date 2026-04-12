import path from 'node:path'
import fs from 'node:fs'

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
  let realFile = file
  let realProjectRoot = projectRoot
  try {
    if (fs.existsSync(file)) {
      realFile = fs.realpathSync(file)
    }
  } catch {
    // ignore
  }

  try {
    if (fs.existsSync(projectRoot)) {
      realProjectRoot = fs.realpathSync(projectRoot)
    }
  } catch {
    // ignore
  }

  if (isWithinPath(file, projectRoot) || isWithinPath(realFile, realProjectRoot)) {
    return
  }

  throw new Error(
    `Access denied: File ${normalizeForComparison(realFile)} is outside of project workspace ${normalizeForComparison(realProjectRoot)}`,
  )
}

function tryReadPackageName(packageRoot: string): string | undefined {
  try {
    const packageJsonPath = path.join(packageRoot, 'package.json')
    if (!fs.existsSync(packageJsonPath)) return undefined
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as { name?: string }
    return typeof packageJson.name === 'string' ? packageJson.name : undefined
  } catch {
    return undefined
  }
}

function findNearestPackageRoot(file: string): string | undefined {
  let current = path.dirname(file)

  while (true) {
    if (fs.existsSync(path.join(current, 'package.json'))) {
      return current
    }
    const parent = path.dirname(current)
    if (parent === current) {
      return undefined
    }
    current = parent
  }
}

function normalizeForComparison(file: string): string {
  return isWindowsAbsolutePath(file) ? path.win32.normalize(file) : path.normalize(file)
}

function pathSeparatorFor(file: string): string {
  return isWindowsAbsolutePath(file) ? path.win32.sep : path.sep
}

function isWithinPath(file: string, root: string): boolean {
  const normalizedFile = normalizeForComparison(file)
  const normalizedRoot = normalizeForComparison(root)
  const separator = pathSeparatorFor(normalizedRoot)
  const rootWithSep = normalizedRoot.endsWith(separator)
    ? normalizedRoot
    : normalizedRoot + separator
  return normalizedFile === normalizedRoot || normalizedFile.startsWith(rootWithSep)
}

function resolveLinkedDependencyEntry(
  projectRoot: string,
  packageName: string,
): string | undefined {
  const packageSegments = packageName.split('/')
  const dependencyPath = path.join(projectRoot, 'node_modules', ...packageSegments)
  if (!fs.existsSync(dependencyPath)) return undefined

  try {
    return fs.realpathSync(dependencyPath)
  } catch {
    return dependencyPath
  }
}

function isLinkedDependencyPath(file: string, projectRoot: string, packageName: string): boolean {
  const linkedDependencyRoot = resolveLinkedDependencyEntry(projectRoot, packageName)
  if (!linkedDependencyRoot) return false

  return isWithinPath(file, linkedDependencyRoot)
}

function isLinkedDependencySourcePath(file: string, projectRoot: string): boolean {
  const packageRoot = findNearestPackageRoot(file)
  if (!packageRoot) return false

  const packageName = tryReadPackageName(packageRoot)
  if (!packageName) return false

  return isLinkedDependencyPath(file, projectRoot, packageName)
}

export function assertPathWithinIdeOpenScope(file: string, projectRoot: string): void {
  try {
    assertPathWithinProject(file, projectRoot)
    return
  } catch {
    if (isLinkedDependencySourcePath(file, projectRoot)) {
      return
    }
    throw new Error(`Access denied: File is outside of project workspace`)
  }
}
