import { describe, it, expect } from 'vitest'
import { transformAstro } from '../src/transform/transform-astro.js'

describe('transformAstro', () => {
  it('should inject data-inspecto into standard elements', () => {
    const source = `---
const a = 1;
---
<div><span class="text">Hello</span></div>`
    const result = transformAstro({ filePath: 'test.astro', source })
    expect(result.code).toContain('data-inspecto="test.astro:4:1"')
    expect(result.code).toContain('data-inspecto="test.astro:4:6"')
  })

  it('should inject data-inspecto into components', () => {
    const source = `<Component a={1} />`
    const result = transformAstro({ filePath: 'test.astro', source })
    expect(result.code).toContain('<Component data-inspecto="test.astro:1:2" a={1} />')
  })

  it('uses relative path when pathType is relative', () => {
    const source = `<div>Hello</div>`

    const result = transformAstro({
      filePath: '/project/src/pages/index.astro',
      source,
      projectRoot: '/project',
      pathType: 'relative',
    })

    expect(result.code).toContain('data-inspecto="src/pages/index.astro:1:1"')
    expect(result.code).not.toContain('/project/src/pages/index.astro')
  })
})
