import { log } from './utils/logger.js'

export function printNuxtManualInstructions() {
  log.blank()
  log.hint('Nuxt requires manual setup in the current version.')
  log.hint('1. Update `nuxt.config.ts` to register the Inspecto Vite plugin:')
  log.copyableCodeBlock([
    "import { vitePlugin as inspecto } from '@inspecto-dev/plugin'",
    '',
    'export default defineNuxtConfig({',
    '  vite: {',
    '    plugins: [inspecto()],',
    '  },',
    '})',
  ])
  log.hint('2. Create `plugins/inspecto.client.ts` to mount `@inspecto-dev/core` in development:')
  log.copyableCodeBlock([
    'export default defineNuxtPlugin(() => {',
    '  if (import.meta.dev) {',
    "    import('@inspecto-dev/core').then(({ mountInspector }) => {",
    '      mountInspector()',
    '    })',
    '  }',
    '})',
  ])
  log.hint('3. Restart your Nuxt dev server after updating the config.')
}

export function printNextJsManualInstructions() {
  log.blank()
  log.hint('Next.js requires manual setup in the current version.')
  log.hint('1. Update `next.config.mjs` to register the Inspecto webpack plugin:')
  log.copyableCodeBlock([
    "import { webpackPlugin as inspecto } from '@inspecto-dev/plugin'",
    '',
    "/** @type {import('next').NextConfig} */",
    'const nextConfig = {',
    '  webpack: (config, { dev, isServer }) => {',
    '    if (dev && !isServer) {',
    '      config.plugins.push(inspecto())',
    '    }',
    '    return config',
    '  },',
    '}',
    '',
    'export default nextConfig',
  ])
  log.hint(
    '2. Initialize `@inspecto-dev/core` from a client component such as `app/layout.tsx` or `pages/_app.tsx`:',
  )
  log.copyableCodeBlock([
    "'use client'",
    '',
    "import { useEffect } from 'react'",
    '',
    'export default function RootLayout({ children }) {',
    '  useEffect(() => {',
    "    if (process.env.NODE_ENV !== 'production') {",
    "      import('@inspecto-dev/core').then(({ mountInspector }) => {",
    "        mountInspector({ serverUrl: 'http://127.0.0.1:5678' })",
    '      })',
    '    }',
    '  }, [])',
    '',
    '  return <html><body>{children}</body></html>',
    '}',
  ])
  log.hint('3. Restart your Next.js dev server after updating the config.')
}
