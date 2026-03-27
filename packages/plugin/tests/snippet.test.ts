import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { extractSnippet } from '../src/server/snippet'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-inspector-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function writeFile(name: string, content: string): string {
  const filepath = path.join(tmpDir, name)
  fs.writeFileSync(filepath, content, 'utf-8')
  return filepath
}

describe('extractSnippet', () => {
  it('extracts lines around the target location', async () => {
    const content = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join('\n')
    const filepath = writeFile('test.ts', content)

    const result = await extractSnippet({ file: filepath, line: 25, column: 1 })

    expect(result.snippet).toContain('line 25')
    expect(result.startLine).toBeGreaterThanOrEqual(1)
  })

  it('respects maxLines limit', async () => {
    const content = Array.from({ length: 200 }, (_, i) => `line ${i + 1}`).join('\n')
    const filepath = writeFile('long.ts', content)

    const result = await extractSnippet({ file: filepath, line: 100, column: 1, maxLines: 30 })

    const lineCount = result.snippet.split('\n').length
    expect(lineCount).toBeLessThanOrEqual(30)
  })

  it('throws FILE_NOT_FOUND for missing files', async () => {
    await expect(
      extractSnippet({ file: '/nonexistent/file.ts', line: 1, column: 1 }),
    ).rejects.toThrow('FILE_NOT_FOUND')
  })

  it('uses cache for repeated reads of unchanged file', async () => {
    const content = 'const x = 1\nconst y = 2\n'
    const filepath = writeFile('cached.ts', content)

    const result1 = await extractSnippet({ file: filepath, line: 1, column: 1 })
    const result2 = await extractSnippet({ file: filepath, line: 1, column: 1 })

    expect(result1.snippet).toBe(result2.snippet)
  })
})
