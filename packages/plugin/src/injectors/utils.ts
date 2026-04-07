import { createRequire } from 'node:module'

// Safely resolve the client module without breaking ESM/CJS or bundling
export const resolveClientModule = () => {
  try {
    return createRequire(import.meta.url).resolve('@inspecto-dev/core')
  } catch {
    try {
      return require.resolve('@inspecto-dev/core')
    } catch {
      console.warn(
        '[inspecto] Could not resolve @inspecto-dev/core — falling back to bare specifier',
      )
      return '@inspecto-dev/core'
    }
  }
}
