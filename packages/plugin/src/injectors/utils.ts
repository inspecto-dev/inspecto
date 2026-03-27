import { createRequire } from 'node:module'

// Safely resolve the client module without breaking ESM/CJS or bundling
export const resolveClientModule = () => {
  try {
    return createRequire(import.meta.url).resolve('@inspecto/core')
  } catch {
    try {
      // @ts-expect-error ignore
      return require.resolve('@inspecto/core')
    } catch {
      console.warn('[inspecto] Could not resolve @inspecto/core — falling back to bare specifier')
      return '@inspecto/core'
    }
  }
}
