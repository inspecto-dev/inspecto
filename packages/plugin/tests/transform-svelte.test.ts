import { describe, expect, it } from 'vitest'
import { transformSvelte } from '../src/transform/transform-svelte.js'

describe('transformSvelte', () => {
  it('uses relative path when pathType is relative', () => {
    const source = `<script lang="ts">const label = 'Hi'</script>\n<button>{label}</button>`

    const result = transformSvelte({
      filePath: '/project/src/components/Button.svelte',
      source,
      projectRoot: '/project',
      pathType: 'relative',
    })

    expect(result.code).toContain('data-inspecto="src/components/Button.svelte:2:1"')
    expect(result.code).not.toContain('/project/src/components/Button.svelte')
  })
})
