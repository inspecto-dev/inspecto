import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { extension: 'src/extension.ts' },
  format: ['cjs'],
  dts: false,
  sourcemap: true,
  clean: true,
  external: ['vscode'],
  noExternal: ['@inspecto-dev/types'],
  platform: 'node',
  target: 'node18',
})
