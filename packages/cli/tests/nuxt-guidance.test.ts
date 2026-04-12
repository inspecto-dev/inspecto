import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createNuxtGuidance } from '../src/onboarding/nuxt-guidance.js'

const tempDirs: string[] = []

async function createTempProject(files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'inspecto-nuxt-'))
  tempDirs.push(root)

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, relativePath)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, contents)
  }

  return root
}

describe('createNuxtGuidance', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })))
  })

  it('creates a high-confidence patch plan for object-export nuxt.config.ts', async () => {
    const root = await createTempProject({
      'nuxt.config.ts': `export default defineNuxtConfig({\n  devtools: { enabled: true },\n})\n`,
    })

    const guidance = createNuxtGuidance(root)

    expect(guidance.metaFramework).toBe('Nuxt')
    expect(guidance.framework).toBe('vue')
    expect(guidance.patches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'nuxt.config.ts',
          confidence: 'high',
          reason: 'nuxt_config_object_export',
          status: 'planned',
        }),
        expect.objectContaining({
          path: 'plugins/inspecto.client.ts',
          reason: 'nuxt_client_plugin_mount',
          status: 'manual_patch_required',
        }),
      ]),
    )
  })

  it('degrades to a medium-confidence manual patch plan for wrapped nuxt config', async () => {
    const root = await createTempProject({
      'nuxt.config.js': `export default withFoo(defineNuxtConfig({ ssr: true }))\n`,
    })

    const guidance = createNuxtGuidance(root)

    expect(guidance.patches[0]).toMatchObject({
      path: 'nuxt.config.js',
      confidence: 'medium',
      status: 'manual_patch_required',
      reason: 'nuxt_config_wrapped_export',
    })
  })
})
