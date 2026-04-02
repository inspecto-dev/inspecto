import { describe, it, expect } from 'vitest'
import { transformJsx } from '../src/transform/transform-jsx'

describe('transformJsx', () => {
  it('injects data-inspecto on JSX elements', () => {
    const source = `
export function Button({ label }) {
  return <button className="btn">{label}</button>
}
`
    const result = transformJsx({
      filePath: '/project/src/Button.tsx',
      source,
      projectRoot: '/project',
      pathType: 'absolute',
    })

    expect(result.changed).toBe(true)
    expect(result.code).toContain('data-inspecto=')
    expect(result.code).toContain('/project/src/Button.tsx')
  })

  it('skips escaped tags', () => {
    const source = `
export function Layout() {
  return (
    <Transition>
      <React.Fragment>
        <div>content</div>
      </React.Fragment>
    </Transition>
  )
}
`
    const result = transformJsx({
      filePath: '/project/src/Layout.tsx',
      source,
      projectRoot: '/project',
      pathType: 'absolute',
      escapeTags: ['Transition'],
    })

    expect(result.code).not.toMatch(/Transition[^>]*data-inspecto/)
    expect(result.code).not.toMatch(/React\.Fragment[^>]*data-inspecto/)
    expect(result.code).toContain('data-inspecto=')
  })

  it('is idempotent — does not double-inject', () => {
    const source = `
export function A() {
  return <div data-inspecto="/file.tsx:2:10">hello</div>
}
`
    const result = transformJsx({
      filePath: '/project/src/A.tsx',
      source,
      projectRoot: '/project',
      pathType: 'absolute',
    })

    const count = (result.code.match(/data-inspecto=/g) ?? []).length
    expect(count).toBe(1)
  })

  it('uses relative path when pathType is relative', () => {
    const source = `export const C = () => <span>hi</span>`

    const result = transformJsx({
      filePath: '/project/src/deep/C.tsx',
      source,
      projectRoot: '/project',
      pathType: 'relative',
    })

    expect(result.code).toContain('src/deep/C.tsx')
    expect(result.code).not.toContain('/project/src/deep/C.tsx')
  })

  it('returns unchanged when no JSX present', () => {
    const source = `export const x = 1 + 2`

    const result = transformJsx({
      filePath: '/project/src/util.ts',
      source,
      projectRoot: '/project',
      pathType: 'absolute',
    })

    expect(result.changed).toBe(false)
    expect(result.code).toBe(source)
  })

  it('handles Windows paths correctly', () => {
    const source = `export const W = () => <div>win</div>`

    const result = transformJsx({
      filePath: 'C:\\Users\\dev\\project\\src\\W.tsx',
      source,
      projectRoot: 'C:\\Users\\dev\\project',
      pathType: 'absolute',
    })

    expect(result.code).not.toContain('\\')
  })

  it('gracefully handles parse errors', () => {
    const source = `const x = <div>{{ invalid }}`

    const result = transformJsx({
      filePath: '/project/src/broken.tsx',
      source,
      projectRoot: '/project',
      pathType: 'absolute',
    })

    expect(result.changed).toBe(false)
    expect(result.code).toBe(source)
  })
})
