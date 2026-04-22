import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

type PackageJson = {
  engines?: {
    vscode?: string
  }
  devDependencies?: {
    '@types/vscode'?: string
  }
}

function getMinorVersion(range: string): number {
  const match = range.match(/\^?(\d+)\.(\d+)\.(\d+)/)
  if (!match) {
    throw new Error(`Unsupported version range: ${range}`)
  }

  return Number(match[2])
}

describe('package metadata', () => {
  it('keeps the VS Code engine aligned with the declared vscode types', () => {
    const packageJsonPath = path.resolve(__dirname, '..', 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson

    expect(packageJson.engines?.vscode).toBeTruthy()
    expect(packageJson.devDependencies?.['@types/vscode']).toBeTruthy()

    const engineMinor = getMinorVersion(packageJson.engines!.vscode!)
    const typesMinor = getMinorVersion(packageJson.devDependencies!['@types/vscode']!)

    expect(engineMinor).toBeGreaterThanOrEqual(typesMinor)
  })
})
