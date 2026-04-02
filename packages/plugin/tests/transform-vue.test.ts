import { describe, it, expect } from 'vitest'
import { transformVue } from '../src/transform/transform-vue'

const wrapTemplate = (content: string) =>
  `<template>\n${content}\n</template>\n<script setup lang="ts">\n</script>`

describe('transformVue', () => {
  it('injects data-inspecto on template elements', () => {
    const source = wrapTemplate(`<div class="card"><button>Click</button></div>`)
    const result = transformVue({
      filePath: '/project/src/Card.vue',
      source,
      projectRoot: '/project',
      pathType: 'absolute',
    })

    expect(result.changed).toBe(true)
    expect(result.code).toContain('data-inspecto=')
    expect(result.code).toContain('/project/src/Card.vue')
  })

  it('skips escaped tags', () => {
    const source = wrapTemplate(`<Transition><div>content</div></Transition>`)
    const result = transformVue({
      filePath: '/project/src/T.vue',
      source,
      projectRoot: '/project',
      pathType: 'absolute',
      escapeTags: ['Transition'],
    })

    // <Transition> should not have the attribute
    expect(result.code).not.toMatch(/Transition[^>]*data-inspecto/)
    // Inner <div> should
    expect(result.code).toContain('data-inspecto=')
  })

  it('does not touch <script> or <style> blocks', () => {
    const source = `<template><span>hi</span></template>
<script setup>
const x = 1
</script>
<style scoped>
.foo { color: red }
</style>`

    const result = transformVue({
      filePath: '/project/src/S.vue',
      source,
      projectRoot: '/project',
      pathType: 'absolute',
    })

    // Only <span> gets the attribute — script and style are untouched
    const scriptBlock = result.code.split('<script setup>')[1]!
    expect(scriptBlock).not.toContain('data-inspecto')
  })

  it('is idempotent', () => {
    const source = wrapTemplate(`<div data-inspecto="/project/src/A.vue:2:1">hello</div>`)
    const result = transformVue({
      filePath: '/project/src/A.vue',
      source,
      projectRoot: '/project',
      pathType: 'absolute',
    })

    const count = (result.code.match(/data-inspecto=/g) ?? []).length
    expect(count).toBe(1)
  })

  it('returns unchanged when no template block present', () => {
    const source = `<script setup lang="ts">const x = 1</script>`
    const result = transformVue({
      filePath: '/project/src/NoTemplate.vue',
      source,
      projectRoot: '/project',
      pathType: 'absolute',
    })

    expect(result.changed).toBe(false)
  })
})

it('injects correct line and column numbers', () => {
  const source = `<script setup>\n</script>\n<template>\n  <div>hello</div>\n</template>`
  const result = transformVue({
    filePath: '/project/src/Line.vue',
    source,
    projectRoot: '/project',
    pathType: 'absolute',
  })

  // The <div> is on line 4, column 3 in the source file.
  // wait, line 4: `  <div>hello</div>` -> column 3
  expect(result.code).toContain('data-inspecto="/project/src/Line.vue:4:3"')
})
