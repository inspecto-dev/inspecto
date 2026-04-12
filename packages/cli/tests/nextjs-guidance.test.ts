import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createNextJsGuidance } from '../src/onboarding/nextjs-guidance.js'

const tempDirs: string[] = []

async function createTempProject(files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'inspecto-nextjs-'))
  tempDirs.push(root)

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, relativePath)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, contents)
  }

  return root
}

describe('createNextJsGuidance', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })))
  })

  it('creates a high-confidence patch plan for object-export next.config.mjs', async () => {
    const root = await createTempProject({
      'next.config.mjs': `export default {\n  reactStrictMode: true,\n}\n`,
      'app/layout.tsx': `export default function RootLayout({ children }) { return <html><body>{children}</body></html> }\n`,
    })

    const guidance = createNextJsGuidance(root)

    expect(guidance.metaFramework).toBe('Next.js')
    expect(guidance.routerMode).toBe('app')
    expect(guidance.patches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'next.config.mjs',
          confidence: 'high',
          reason: 'next_config_object_export',
        }),
        expect.objectContaining({
          path: 'app/layout.tsx',
          status: 'manual_patch_required',
          reason: 'next_app_router_mount',
        }),
      ]),
    )
    expect(guidance.assistantPrompt).toContain('Next.js')
    expect(guidance.patches[0]?.snippet).toContain('if (dev) {')
    expect(guidance.patches[0]?.snippet).not.toContain('!isServer')
  })

  it('treats exported nextConfig objects as high-confidence patches', async () => {
    const root = await createTempProject({
      'next.config.ts': `import type { NextConfig } from 'next'\nconst nextConfig: NextConfig = {\n  reactStrictMode: true,\n}\n\nexport default nextConfig\n`,
      'src/app/layout.tsx': `export default function RootLayout({ children }) { return <html><body>{children}</body></html> }\n`,
      'package.json': `{\n  "scripts": {\n    "dev": "next dev"\n  }\n}\n`,
    })

    const guidance = createNextJsGuidance(root)

    expect(guidance.patches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'next.config.ts',
          status: 'planned',
          confidence: 'high',
          reason: 'next_config_object_export',
        }),
      ]),
    )
  })

  it('degrades to a medium-confidence manual patch plan for wrapped next config', async () => {
    const root = await createTempProject({
      'next.config.js': `const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true })\nmodule.exports = withBundleAnalyzer({ reactStrictMode: true })\n`,
      'pages/_app.tsx': `export default function App({ Component, pageProps }) { return <Component {...pageProps} /> }\n`,
    })

    const guidance = createNextJsGuidance(root)

    expect(guidance.routerMode).toBe('pages')
    expect(guidance.patches[0]).toMatchObject({
      path: 'next.config.js',
      confidence: 'medium',
      status: 'manual_patch_required',
      reason: 'next_config_wrapped_export',
    })
    expect(guidance.patches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'pages/_app.tsx',
          status: 'manual_patch_required',
          reason: 'next_pages_router_mount',
        }),
      ]),
    )
  })

  it('adds a webpack dev-server follow-up when package.json still runs next dev without --webpack', async () => {
    const root = await createTempProject({
      'next.config.ts': `import type { NextConfig } from 'next'\nconst nextConfig: NextConfig = {\n  reactStrictMode: true,\n}\n\nexport default nextConfig\n`,
      'app/layout.tsx': `export default function RootLayout({ children }) { return <html><body>{children}</body></html> }\n`,
      'package.json': `{\n  "scripts": {\n    "dev": "next dev"\n  }\n}\n`,
    })

    const guidance = createNextJsGuidance(root)

    expect(guidance.pendingSteps).toEqual(
      expect.arrayContaining([
        'Update the Next.js dev script to use webpack mode for Inspecto validation.',
      ]),
    )
    expect(guidance.patches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'package.json',
          status: 'manual_patch_required',
          reason: 'next_dev_script_requires_webpack',
        }),
      ]),
    )
    expect(guidance.assistantPrompt).toContain('Use the generated patches directly')
  })
})
