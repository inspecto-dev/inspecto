// ============================================================
// src/utils/fs.ts — File system helpers
// ============================================================
import fs from 'node:fs/promises'
import path from 'node:path'

/** Check if a file or directory exists */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/** Read file as UTF-8 text, return null if not found */
export async function readFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

/** Write file with auto-created parent directories */
export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf-8')
}

/** Copy file (for backup) */
export async function copyFile(src: string, dest: string): Promise<void> {
  await fs.copyFile(src, dest)
}

/** Delete file, no error if missing */
export async function removeFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath)
  } catch {
    // ignore
  }
}

/** Delete directory recursively, no error if missing */
export async function removeDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

/** Read and parse JSON file */
export async function readJSON<T = unknown>(filePath: string): Promise<T | null> {
  const text = await readFile(filePath)
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/** Write JSON file with 2-space indent */
export async function writeJSON(filePath: string, data: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n')
}
