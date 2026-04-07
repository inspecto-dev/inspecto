import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    vite: 'src/index.ts',
    webpack: 'src/index.ts',
    rspack: 'src/index.ts',
    rollup: 'src/index.ts',
    'legacy/rspack/index': 'src/legacy/rspack/index.ts',
    'legacy/rspack/loader': 'src/legacy/rspack/loader.ts',
    'legacy/webpack4/index': 'src/legacy/webpack4/index.ts',
    'legacy/webpack4/loader': 'src/legacy/webpack4/loader.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  // Must be able to run in Node — bundle everything except node builtins and peer deps
  shims: true,
  external: [
    'vite',
    'webpack',
    '@rspack/core',
    'rollup',
    '@vue/compiler-core',
    '@vue/compiler-dom',
    '@babel/parser',
    '@babel/traverse',
    '@babel/types',
    'unplugin',
    'cosmiconfig',
    './loader.cjs',
  ],
})
