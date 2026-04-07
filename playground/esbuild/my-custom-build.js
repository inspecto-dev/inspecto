import * as esbuild from 'esbuild'
import { esbuildPlugin as inspecto } from '@inspecto-dev/plugin'

const isProd = process.env.NODE_ENV === 'production'

const buildOptions = {
  entryPoints: ['src/index.jsx'],
  bundle: true,
  outdir: 'dist',
  minify: isProd,
  sourcemap: true,
  loader: { '.js': 'jsx' },
}

if (isProd) {
  esbuild.build(buildOptions).catch(() => process.exit(1))
} else {
  // Simple dev server setup for esbuild
  const ctx = await esbuild.context({
    ...buildOptions,
    plugins: [inspecto()],
  })
  await ctx.watch()

  const { host, port } = await ctx.serve({
    servedir: '.',
  })

  console.log(`Development server running at http://localhost:${port}`)
}
