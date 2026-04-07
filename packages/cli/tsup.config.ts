import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/bin.ts'],
  format: ['esm'],
  target: 'node18',
  dts: true,
  clean: true,
  minify: false,
})
