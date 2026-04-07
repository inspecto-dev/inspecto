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
    expect(log.hint).toHaveBeenCalledWith('Next.js requires manual setup in the current version.')
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
      '2. Initialize `@inspecto-dev/core` from a client component such as `app/layout.tsx` or `pages/_app.tsx`:',
    )
    expect(log.hint).toHaveBeenCalledWith(
      '3. Restart your Next.js dev server after updating the config.',
    )
  })

  it('prints detailed Nuxt instructions with step-by-step code blocks', () => {
    printNuxtManualInstructions()

    expect(log.blank).toHaveBeenCalled()
    expect(log.hint).toHaveBeenCalledWith('Nuxt requires manual setup in the current version.')
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
      '2. Create `plugins/inspecto.client.ts` to mount `@inspecto-dev/core` in development:',
    )
    expect(log.hint).toHaveBeenCalledWith(
      '3. Restart your Nuxt dev server after updating the config.',
    )
  })
})
