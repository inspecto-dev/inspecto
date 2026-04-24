import { describe, it, expect, vi } from 'vitest'
import { detectFrameworks } from '../src/detect/framework.js'
import * as fsUtils from '../src/utils/fs.js'

vi.mock('../src/utils/fs.js', () => ({
  readJSON: vi.fn(),
}))

describe('detectFrameworks', () => {
  it('detects React based on dependencies', async () => {
    vi.mocked(fsUtils.readJSON).mockResolvedValue({
      dependencies: {
        react: '^18.0.0',
      },
    })

    const result = await detectFrameworks('/mock/root')
    expect(result.supported).toContain('react')
    expect(result.unsupported).toHaveLength(0)
  })

  it('detects Vue based on dependencies', async () => {
    vi.mocked(fsUtils.readJSON).mockResolvedValue({
      devDependencies: {
        vue: '^3.0.0',
      },
    })

    const result = await detectFrameworks('/mock/root')
    expect(result.supported).toContain('vue')
    expect(result.unsupported).toHaveLength(0)
  })

  it('detects Svelte as supported framework', async () => {
    vi.mocked(fsUtils.readJSON).mockResolvedValue({
      devDependencies: {
        svelte: '^4.0.0',
      },
    })

    const result = await detectFrameworks('/mock/root')
    expect(result.supported).toContain('svelte')
    expect(result.unsupported).toHaveLength(0)
  })

  it('detects Solid as supported framework', async () => {
    vi.mocked(fsUtils.readJSON).mockResolvedValue({
      devDependencies: {
        'solid-js': '^1.0.0',
      },
    })

    const result = await detectFrameworks('/mock/root')
    expect(result.supported).toContain('solid')
    expect(result.unsupported).toHaveLength(0)
  })

  it('detects Astro as supported framework', async () => {
    vi.mocked(fsUtils.readJSON).mockResolvedValue({
      devDependencies: {
        astro: '^4.0.0',
      },
    })

    const result = await detectFrameworks('/mock/root')
    expect(result.supported).toContain('astro')
    expect(result.unsupported).toHaveLength(0)
  })

  it('returns empty if no framework is matched', async () => {
    vi.mocked(fsUtils.readJSON).mockResolvedValue({
      dependencies: {
        lodash: '^4.0.0',
      },
    })

    const result = await detectFrameworks('/mock/root')
    expect(result.supported).toHaveLength(0)
    expect(result.unsupported).toHaveLength(0)
  })

  it('returns empty if package.json does not exist', async () => {
    vi.mocked(fsUtils.readJSON).mockResolvedValue(null)

    const result = await detectFrameworks('/mock/root')
    expect(result.supported).toHaveLength(0)
    expect(result.unsupported).toHaveLength(0)
  })
})
