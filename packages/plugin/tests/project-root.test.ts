import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import childProcess from 'node:child_process'

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    existsSync: vi.fn(),
  }
})

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process')
  return {
    ...actual,
    execSync: vi.fn(),
  }
})

describe('project root resolution', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.resetAllMocks()
    vi.spyOn(os, 'homedir').mockReturnValue('/Users/me')
  })

  it('uses .inspecto as config root and package root as project root when git is unavailable', async () => {
    vi.spyOn(childProcess, 'execSync').mockImplementation(() => {
      throw new Error('not a git repo')
    })
    vi.spyOn(fs, 'existsSync').mockImplementation((p: fs.PathLike) => {
      const file = String(p)
      return (
        file === path.join('/workspace/app', 'package.json') ||
        file === path.join('/workspace', '.inspecto')
      )
    })

    vi.spyOn(process, 'cwd').mockReturnValue('/workspace/app/src')

    const { resolveProjectRoot, resolveWorkspaceRoot } =
      await import('../src/server/project-root.js')

    expect(resolveProjectRoot()).toBe('/workspace/app')
    expect(resolveWorkspaceRoot()).toBe('/workspace')
  })

  it('uses git root before package root for workspace scope when .inspecto is absent', async () => {
    const childProcessModule = await import('node:child_process')
    vi.mocked(childProcessModule.execSync).mockReturnValue('/workspace\n')
    vi.spyOn(fs, 'existsSync').mockImplementation((p: fs.PathLike) => {
      const file = String(p)
      return file === path.join('/workspace/app', 'package.json')
    })

    vi.spyOn(process, 'cwd').mockReturnValue('/workspace/app/src')

    const { resolveProjectRoot, resolveWorkspaceRoot } =
      await import('../src/server/project-root.js')

    expect(resolveProjectRoot()).toBe('/workspace/app')
    expect(resolveWorkspaceRoot()).toBe('/workspace')
  })

  it('does not treat a parent home .inspecto directory as the workspace config root inside git repos', async () => {
    const childProcessModule = await import('node:child_process')
    vi.mocked(childProcessModule.execSync).mockReturnValue('/Users/me/project\n')
    vi.spyOn(fs, 'existsSync').mockImplementation((p: fs.PathLike) => {
      const file = String(p)
      return file === path.join('/Users/me', '.inspecto')
    })

    vi.spyOn(process, 'cwd').mockReturnValue('/Users/me/project/src')

    const { resolveProjectRoot, resolveWorkspaceRoot } =
      await import('../src/server/project-root.js')

    expect(resolveProjectRoot()).toBe('/Users/me/project')
    expect(resolveWorkspaceRoot()).toBe('/Users/me/project')
  })

  it('does not treat .inspecto directories above home as project roots when git is unavailable', async () => {
    vi.spyOn(childProcess, 'execSync').mockImplementation(() => {
      throw new Error('not a git repo')
    })
    vi.spyOn(fs, 'existsSync').mockImplementation((p: fs.PathLike) => {
      const file = String(p)
      return file === path.join('/Users', '.inspecto')
    })

    vi.spyOn(process, 'cwd').mockReturnValue('/Users/me/project/src')

    const { resolveProjectRoot, resolveWorkspaceRoot } =
      await import('../src/server/project-root.js')

    expect(resolveProjectRoot()).toBe('/Users/me/project/src')
    expect(resolveWorkspaceRoot()).toBe('/Users/me/project/src')
  })

  it('falls back to cwd when neither inspecto config nor package root exists', async () => {
    vi.spyOn(childProcess, 'execSync').mockImplementation(() => {
      throw new Error('not a git repo')
    })
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)

    vi.spyOn(process, 'cwd').mockReturnValue('/scratch/demo')

    const { resolveProjectRoot, resolveWorkspaceRoot } =
      await import('../src/server/project-root.js')

    expect(resolveProjectRoot()).toBe('/scratch/demo')
    expect(resolveWorkspaceRoot()).toBe('/scratch/demo')
  })
})
