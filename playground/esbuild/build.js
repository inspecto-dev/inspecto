import esbuild from 'esbuild'
import { esbuildPlugin as inspecto } from '@inspecto/plugin'

const isDev = process.env.NODE_ENV !== 'production'

const ctx = await esbuild.context({
  entryPoints: ['src/main.js'],
  bundle: true,
  outdir: 'public/dist',
  plugins: [inspecto()],
  format: 'esm',
  sourcemap: true,
})

if (isDev) {
  await ctx.watch()
  console.log('Serving on http://localhost:3006')
  await ctx.serve({
    servedir: 'public',
    port: 3006,
  })
} else {
  await ctx.rebuild()
  await ctx.dispose()
}
