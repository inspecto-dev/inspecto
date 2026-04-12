import { describe, expect, it, vi, beforeEach } from 'vitest'
import { printNextJsManualInstructions, printNuxtManualInstructions } from '../src/instructions.js'
import { log } from '../src/utils/logger.js'

vi.mock('../src/utils/logger.js', () => ({
  log: {
    blank: vi.fn(),
    hint: vi.fn(),
    copyableCodeBlock: vi.fn(),
  },
}))

describe('manual framework instructions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('prints detailed Next.js instructions with step-by-step code blocks', () => {
    printNextJsManualInstructions()

    expect(log.blank).toHaveBeenCalled()
    expect(log.hint).toHaveBeenCalledWith(
      'Next.js supports guided setup in the current version. Inspecto can prepare the config patch, but the client-side mount step still needs review.',
    )
    expect(log.hint).toHaveBeenCalledWith(
      '1. Update `next.config.mjs` to register the Inspecto webpack plugin:',
    )
    expect(log.copyableCodeBlock).toHaveBeenCalledWith(
      expect.arrayContaining([
        "import { webpackPlugin as inspecto } from '@inspecto-dev/plugin'",
        'export default nextConfig',
      ]),
    )
    expect(log.hint).toHaveBeenCalledWith(
      '2. Complete the remaining client-side mount step in `app/layout.tsx` or `pages/_app.tsx`:',
    )
    expect(log.hint).toHaveBeenCalledWith(
      '3. Restart your Next.js dev server after applying the guided patches.',
    )
  })

  it('prints detailed Nuxt instructions with step-by-step code blocks', () => {
    printNuxtManualInstructions()

    expect(log.blank).toHaveBeenCalled()
    expect(log.hint).toHaveBeenCalledWith(
      'Nuxt supports guided setup in the current version. Inspecto can prepare the config patch, but the client plugin mount step still needs review.',
    )
    expect(log.hint).toHaveBeenCalledWith(
      '1. Update `nuxt.config.ts` to register the Inspecto Vite plugin:',
    )
    expect(log.copyableCodeBlock).toHaveBeenCalledWith(
      expect.arrayContaining([
        "import { vitePlugin as inspecto } from '@inspecto-dev/plugin'",
        'export default defineNuxtConfig({',
      ]),
    )
    expect(log.hint).toHaveBeenCalledWith(
      '2. Complete the remaining client plugin mount step in `plugins/inspecto.client.ts`:',
    )
    expect(log.hint).toHaveBeenCalledWith(
      '3. Restart your Nuxt dev server after applying the guided patches.',
    )
  })
})
